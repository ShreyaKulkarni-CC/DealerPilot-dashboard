// The only file in the frontend that talks to our own backend. The
// frontend never calls vAuto directly and never sees vAuto credentials --
// only backend/app holds those. Everything here is read-only (GET only,
// matching the backend's own read-only scope).

const DEFAULT_TIMEOUT_MS = 45000

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, { status, detail } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

/**
 * Restricts free-text search input (make, model, stock number, etc.) to a
 * safe, narrow character set before it's ever used to build a query.
 * Defense in depth: the backend is responsible for validating anything it
 * forwards to vAuto's own filter syntax, but nothing malformed or
 * unexpected should leave the browser in the first place.
 */
export function sanitizeSearchTerm(value, { maxLength = 60 } = {}) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[^a-zA-Z0-9 \-_.]/g, '')
    .trim()
    .slice(0, maxLength)
}

async function apiFetch(path, { params = {}, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const url = new URL(`${BASE_URL}${path}`)
  // URLSearchParams handles encoding for us -- no manual string
  // concatenation of query values, which is how URL/query injection bugs
  // usually creep in.
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(`Request to ${path} timed out after ${timeoutMs / 1000}s`, { status: 0 })
    }
    throw new ApiError(`Could not reach the DealerPilot backend at ${BASE_URL}. Is it running?`, { status: 0 })
  } finally {
    clearTimeout(timer)
  }

  let body = null
  try {
    body = await response.json()
  } catch {
    // Non-JSON or empty body -- fall through, handled below.
  }

  if (!response.ok) {
    const detail = body && body.detail ? body.detail : response.statusText
    throw new ApiError(`${path} failed (${response.status}): ${detail}`, {
      status: response.status,
      detail,
    })
  }

  return body
}

export function getHealth() {
  return apiFetch('/health')
}

export function getInventory({ filter, sort, limit = '1,50' } = {}) {
  return apiFetch('/api/inventory', { params: { filter, sort, limit } })
}

export function getAppraisals({ filter, sort, limit = '1,50' } = {}) {
  return apiFetch('/api/appraisals', { params: { filter, sort, limit } })
}

export function getInventoryItem(id) {
  return apiFetch(`/api/inventory/${encodeURIComponent(id)}`)
}

export function getAppraisal(id) {
  return apiFetch(`/api/appraisals/${encodeURIComponent(id)}`)
}

