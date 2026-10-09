// Reads and writes the explorer's filters from the page address, so a view
// (filters, grouping, sort, the open vehicle) can be bookmarked or shared and
// comes back after a refresh. Defaults are left out of the address.

export const GROUPS = [
  { id: 'status', label: 'Status' },
  { id: 'band', label: 'Age band' },
  { id: 'make', label: 'Make' },
  { id: 'store', label: 'Store' },
  { id: 'none', label: 'No grouping' },
]

export const DEFAULT_GROUP = 'status'
export const DEFAULT_SORT = [{ id: 'age', desc: true }]

const LIST_KEYS = ['status', 'band', 'make', 'disp']

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

export function readParams(sp, sortableIds) {
  const sort = parseSort(sp.get('sort'), sortableIds)
  const group = sp.get('group')
  return {
    q: (sp.get('q') || '').slice(0, 60),
    status: sp.getAll('status'),
    band: sp.getAll('band'),
    make: sp.getAll('make'),
    disp: sp.getAll('disp'),
    aged: sp.get('aged') === '1',
    group: GROUPS.some((g) => g.id === group) ? group : DEFAULT_GROUP,
    sort: sort === null ? DEFAULT_SORT : sort,
    v: sp.get('v') || '',
  }
}

function sameSort(a, b) {
  return a.length === b.length && a.every((s, i) => s.id === b[i].id && s.desc === b[i].desc)
}

// Returns a new URLSearchParams with `patch` applied on top of `current`.
export function writeParams(current, patch) {
  const next = new URLSearchParams(current)
  Object.entries(patch).forEach(([key, value]) => {
    next.delete(key)
    if (LIST_KEYS.includes(key)) {
      value.forEach((v) => next.append(key, v))
    } else if (key === 'aged') {
      if (value) next.set('aged', '1')
    } else if (key === 'group') {
      if (value && value !== DEFAULT_GROUP) next.set('group', value)
    } else if (key === 'sort') {
      if (value.length === 0) next.set('sort', 'none')
      else if (!sameSort(value, DEFAULT_SORT)) {
        next.set('sort', value.map((s) => `${s.id}:${s.desc ? 'desc' : 'asc'}`).join(','))
      }
    } else if (value) {
      next.set(key, value)
    }
  })
  return next
}
