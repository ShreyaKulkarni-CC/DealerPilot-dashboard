import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { getStores } from '../api/client'
import { useApiData } from '../hooks/useApiData'

// Which store(s) the dashboard is showing. 'all' means every configured store.
const KEY = 'dp.store'
const StoreContext = createContext(null)

function readSelected() {
  try {
    return localStorage.getItem(KEY) || 'all'
  } catch {
    return 'all'
  }
}

export function StoreProvider({ children }) {
  const { loading, error, data, reload } = useApiData(getStores, [])
  const [chosen, setChosen] = useState(readSelected)

  const stores = data?.stores || []
  // If the saved choice is not a store we know about, fall back to all.
  const selected = chosen !== 'all' && !stores.some((s) => s.id === chosen) ? 'all' : chosen
  const selectedStores = selected === 'all' ? stores : stores.filter((s) => s.id === selected)

  const setSelected = useCallback((id) => {
    setChosen(id)
    try {
      localStorage.setItem(KEY, id)
    } catch {
      // Not saved, still applies for this visit.
    }
  }, [])

  const value = useMemo(
    () => ({
      loading,
      error,
      reload,
      environment: data?.environment || null,
      stores,
      selected,
      selectedStores,
      setSelected,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading, error, data, selected, setSelected],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStores() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStores must be used inside StoreProvider')
  return ctx
}
