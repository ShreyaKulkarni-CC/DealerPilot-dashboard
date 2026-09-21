import { useCallback, useEffect, useState } from 'react'

/**
 * A single async fetch with loading/error state and a manual `reload()`.
 * `deps` re-runs the fetch when they change (e.g. a route param like an id).
 */
export function useApiData(loader, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => setReloadToken((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))

    loader()
      .then((data) => {
        if (!cancelled) setState({ loading: false, error: null, data })
      })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, error, data: null })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken])

  return { ...state, reload }
}
