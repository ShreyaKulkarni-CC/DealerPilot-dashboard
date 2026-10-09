// Reads and writes an explorer's filters from the page address, so a view
// (filters, grouping, sort, the open record) can be bookmarked or shared and
// comes back after a refresh. Defaults are left out of the address.
//
// Each explorer page has its own "view" (which filters, which groupings and
// which sort is the default). Inventory is the default view, so its calls did
// not need to change.

export const GROUPS = [
  { id: 'status', label: 'Status' },
  { id: 'band', label: 'Age band' },
  { id: 'make', label: 'Make' },
  { id: 'store', label: 'Store' },
  { id: 'none', label: 'No grouping' },
]

export const DEFAULT_GROUP = 'status'
export const DEFAULT_SORT = [{ id: 'age', desc: true }]

export const INVENTORY_VIEW = {
  groups: GROUPS,
  defaultGroup: DEFAULT_GROUP,
  defaultSort: DEFAULT_SORT,
  listKeys: ['status', 'band', 'make', 'disp'],
}

export const APPRAISAL_VIEW = {
  groups: [
    { id: 'status', label: 'Status' },
    { id: 'month', label: 'Created month' },
    { id: 'store', label: 'Store' },
    { id: 'done', label: 'Completed' },
    { id: 'make', label: 'Make' },
    { id: 'none', label: 'No grouping' },
  ],
  defaultGroup: 'status',
  defaultSort: [{ id: 'created', desc: true }],
  listKeys: ['status', 'make', 'done'],
}

function parseSort(raw, allowed) {
  if (raw === 'none') return []
  const out = (raw || '')
    .split(',')
    .filter(Boolean)
    .map((part) => {
      const [id, dir] = part.split(':')
      return { id, desc: dir === 'desc' }
    })
    .filter((s) => allowed.includes(s.id))
  return out.length ? out : null
}

export function readParams(sp, sortableIds, view = INVENTORY_VIEW) {
  const sort = parseSort(sp.get('sort'), sortableIds)
  const group = sp.get('group')
  const out = {
    q: (sp.get('q') || '').slice(0, 60),
    aged: sp.get('aged') === '1',
    group: view.groups.some((g) => g.id === group) ? group : view.defaultGroup,
    sort: sort === null ? view.defaultSort : sort,
    v: sp.get('v') || '',
  }
  view.listKeys.forEach((key) => {
    out[key] = sp.getAll(key)
  })
  return out
}

function sameSort(a, b) {
  return a.length === b.length && a.every((s, i) => s.id === b[i].id && s.desc === b[i].desc)
}

// Returns a new URLSearchParams with `patch` applied on top of `current`.
export function writeParams(current, patch, view = INVENTORY_VIEW) {
  const next = new URLSearchParams(current)
  Object.entries(patch).forEach(([key, value]) => {
    next.delete(key)
    if (view.listKeys.includes(key)) {
      value.forEach((v) => next.append(key, v))
    } else if (key === 'aged') {
      if (value) next.set('aged', '1')
    } else if (key === 'group') {
      if (value && value !== view.defaultGroup) next.set('group', value)
    } else if (key === 'sort') {
      if (value.length === 0) next.set('sort', 'none')
      else if (!sameSort(value, view.defaultSort)) {
        next.set('sort', value.map((s) => `${s.id}:${s.desc ? 'desc' : 'asc'}`).join(','))
      }
    } else if (value) {
      next.set(key, value)
    }
  })
  return next
}
