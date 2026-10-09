import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getAllAppraisals, getAllInventory } from '../api/client'

// One shared copy of every vAuto record for every store. It is loaded the
// first time a vAuto page opens (not on Home), kept while you move between
// pages, and filtered by the store switcher in the browser, so switching
// stores is instant and does not call the backend again.

const VautoDataContext = createContext(null)

async function settle(promise) {
  try {
    return { ok: true, value: await promise }
  } catch (error) {
    return { ok: false, error }
  }
}

// If a refresh fails but we already had good data, keep the good data and
// remember the error instead of blanking the page.
function keepGood(next, previous) {
  if (next.ok || !previous?.ok) return next
  return { ...previous, refreshError: next.error?.message || 'Refresh failed.' }
}

export function VautoDataProvider({ children }) {
  const [state, setState] = useState({ status: 'idle', inventory: null, appraisals: null, loadedAt: null })
  const [cooling, setCooling] = useState(false)
  const inflight = useRef(false)
  const started = useRef(false)
  const latest = useRef(state)
  latest.current = state

  const load = useCallback(async (refresh) => {
    if (inflight.current) return
    inflight.current = true
    setState((s) => ({ ...s, status: s.loadedAt ? 'refreshing' : 'loading' }))
    const [inventory, appraisals] = await Promise.all([
      settle(getAllInventory({ refresh })),
      settle(getAllAppraisals({ refresh })),
    ])
    inflight.current = false
    const prev = latest.current
    setState({
      status: 'ready',
      inventory: keepGood(inventory, prev.inventory),
      appraisals: keepGood(appraisals, prev.appraisals),
      loadedAt: Date.now(),
    })
    if (refresh) {
      // The backend allows 10 calls a minute per list, so pause the button briefly.
      setCooling(true)
      setTimeout(() => setCooling(false), 8000)
    }
  }, [])

  const ensure = useCallback(() => {
    if (started.current) return
    started.current = true
    load(false)
  }, [load])

  const reload = useCallback(() => load(true), [load])

  const value = useMemo(() => ({ ...state, cooling, ensure, reload }), [state, cooling, ensure, reload])
  return <VautoDataContext.Provider value={value}>{children}</VautoDataContext.Provider>
}

export function useVautoData() {
  const ctx = useContext(VautoDataContext)
  if (!ctx) throw new Error('useVautoData must be used inside VautoDataProvider')
  const { ensure } = ctx
  useEffect(() => {
    ensure()
  }, [ensure])
  return ctx
}
