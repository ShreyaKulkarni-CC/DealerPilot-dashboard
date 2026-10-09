// Turns raw vAuto records into the numbers and chart rows the digest shows.
// Pure functions only (no React, no network), so they are easy to test.

import { daysInInventory } from './vehicleAge'

// "Aged" means more than 60 days, matching the age bands below.
export const AGED_OVER_DAYS = 60

// 90+ starts at 91 because day 90 belongs to the 61-90 band.
export const AGE_BANDS = [
  { key: '0-30', label: '0–30 days', min: 0, max: 30 },
  { key: '31-60', label: '31–60 days', min: 31, max: 60 },
  { key: '61-90', label: '61–90 days', min: 61, max: 90 },
  { key: '90+', label: '90+ days', min: 91, max: Infinity },
]

const MAX_STATUS_ROWS = 7

export const NO_DATE_BAND = 'No date'

export function bandLabelOf(age) {
  if (age === null || age === undefined) return NO_DATE_BAND
  const b = AGE_BANDS.find((x) => age >= x.min && age <= x.max)
  return b ? b.label : NO_DATE_BAND
}

export function flattenInventory(item) {
  const age = daysInInventory(item.createdOn)
  const year = item.vehicle?.year ?? null
  const make = item.vehicle?.make ?? ''
  const model = item.vehicle?.model ?? ''
  const vin = item.vehicle?.vin ?? ''
  const stockNumber = item.stockNumber ?? ''
  const status = item.status || 'No status'
  return {
    id: item.inventoryId,
    storeId: item.storeId,
    storeName: item.storeName,
    year,
    make,
    model,
    vin,
    stockNumber,
    status,
    disposition: item.disposition || '',
    listPrice: item.pricing?.listPrice ?? null,
    currency: item.pricing?.currency ?? 'USD',
    age,
    band: bandLabelOf(age),
    // Lower-case text used by the search box, built once per record.
    search: [year, make, model, item.vehicle?.series, vin, stockNumber, status, item.storeName]
      .filter((x) => x !== null && x !== undefined && x !== '')
      .join(' ')
      .toLowerCase(),
    // The full record as vAuto returned it, shown in the detail panel.
    raw: item,
  }
}

export function flattenAppraisal(item) {
  return {
    id: item.id,
    storeId: item.storeId,
    storeName: item.storeName,
    status: item.centralizedStatus || 'No status',
    completed: Boolean(item.isCompleted),
    created: item.created ?? null,
    value: item.appraisalValue?.appraisedValue ?? null,
  }
}

function zeroCounts(storeIds) {
  return Object.fromEntries(storeIds.map((id) => [id, 0]))
}

function sum(counts) {
  return Object.values(counts).reduce((a, b) => a + b, 0)
}

// Biggest groups first; everything past `limit` folds into "Other".
function foldTail(rows, storeIds, limit = MAX_STATUS_ROWS) {
  const sorted = [...rows].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
  if (sorted.length <= limit) return sorted
  const head = sorted.slice(0, limit - 1)
  const tail = sorted.slice(limit - 1)
  const counts = zeroCounts(storeIds)
  tail.forEach((r) => storeIds.forEach((id) => (counts[id] += r.counts[id])))
  return [...head, { label: `Other (${tail.length})`, counts, total: sum(counts) }]
}

function groupBy(rows, storeIds, keyOf) {
  const map = new Map()
  rows.forEach((r) => {
    const label = keyOf(r)
    if (!map.has(label)) map.set(label, { label, counts: zeroCounts(storeIds), total: 0 })
    const entry = map.get(label)
    entry.counts[r.storeId] += 1
    entry.total += 1
  })
  return [...map.values()]
}

export function summarizeInventory(allRows, storeIds) {
  const rows = allRows.filter((r) => storeIds.includes(r.storeId))
  const perStore = zeroCounts(storeIds)
  rows.forEach((r) => (perStore[r.storeId] += 1))

  const known = rows.filter((r) => r.age !== null)
  const aged = known.filter((r) => r.age > AGED_OVER_DAYS).length
  const avgAge = known.length ? Math.round(known.reduce((a, r) => a + r.age, 0) / known.length) : null

  const bands = AGE_BANDS.map((b) => ({ label: b.label, counts: zeroCounts(storeIds), total: 0 }))
  known.forEach((r) => {
    const i = AGE_BANDS.findIndex((b) => r.age >= b.min && r.age <= b.max)
    if (i >= 0) {
      bands[i].counts[r.storeId] += 1
      bands[i].total += 1
    }
  })

  const statuses = foldTail(groupBy(rows, storeIds, (r) => r.status), storeIds)
  const oldest = [...known].sort((a, b) => b.age - a.age).slice(0, 8)

  return {
    total: rows.length,
    perStore,
    aged,
    knownAges: known.length,
    unknownAges: rows.length - known.length,
    avgAge,
    bands,
    statuses,
    oldest,
  }
}

function weekStart(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday
  return d
}

export const WEEKS_SHOWN = 12

export function summarizeAppraisals(allRows, storeIds, now = new Date()) {
  const rows = allRows.filter((r) => storeIds.includes(r.storeId))
  const perStore = zeroCounts(storeIds)
  rows.forEach((r) => (perStore[r.storeId] += 1))

  const first = weekStart(now)
  first.setDate(first.getDate() - 7 * (WEEKS_SHOWN - 1))
  const weeks = Array.from({ length: WEEKS_SHOWN }, (_, i) => {
    const start = new Date(first)
    start.setDate(first.getDate() + 7 * i)
    return {
      start,
      label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      counts: zeroCounts(storeIds),
      total: 0,
    }
  })

  let older = 0
  let undated = 0
  rows.forEach((r) => {
    const t = r.created ? new Date(r.created) : null
    if (!t || Number.isNaN(t.getTime())) {
      undated += 1
      return
    }
    const idx = Math.floor((weekStart(t) - first) / (7 * 24 * 3600 * 1000))
    if (idx < 0) older += 1
    else if (idx < WEEKS_SHOWN) {
      weeks[idx].counts[r.storeId] += 1
      weeks[idx].total += 1
    }
  })

  const completed = rows.filter((r) => r.completed).length
  return {
    total: rows.length,
    perStore,
    completed,
    open: rows.length - completed,
    statuses: foldTail(groupBy(rows, storeIds, (r) => r.status), storeIds),
    weeks,
    olderThanWindow: older,
    undated,
  }
}

export function fmt(n) {
  return n === null || n === undefined ? '—' : Number(n).toLocaleString('en-US')
}

export function storeColor(stores, id) {
  const i = stores.findIndex((s) => s.id === id)
  return `var(--series-${(i < 0 ? 0 : i % 8) + 1})`
}
