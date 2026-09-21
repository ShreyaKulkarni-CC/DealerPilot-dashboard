import { useCallback, useEffect, useState } from 'react'

const PAGE_SIZE = 50

/**
 * Fetches in pages of 50 via `fetchPage(limitString)` (limitString looks
 * like "1,50", "51,50", ...). "Load more" appends to what's already
 * loaded rather than replacing it, so search/sort in the page using this
 * still works across everything loaded so far, not just the latest page.
 * `hasMore` is a heuristic: a full page came back, so there might be more.
 */
export function usePaginatedList(fetchPage, deps = []) {
  const [state, setState] = useState({
    items: [],
    loading: true,
    loadingMore: false,
    error: null,
    hasMore: false,
  })

  const loadPage = useCallback(
    (start) =>
      fetchPage(`${start},${PAGE_SIZE}`).then((body) => {
        const items = body.items || []
        return { items, hasMore: items.length === PAGE_SIZE }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  )

  const fetchFirstPage = useCallback(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    loadPage(1)
      .then(({ items, hasMore }) => {
        if (!cancelled) setState({ items, loading: false, loadingMore: false, error: null, hasMore })
      })
      .catch((error) => {
        if (!cancelled) setState({ items: [], loading: false, loadingMore: false, error, hasMore: false })
      })
    return () => {
      cancelled = true
    }
  }, [loadPage])

  useEffect(() => fetchFirstPage(), [fetchFirstPage])

  const loadMore = useCallback(async () => {
    setState((s) => ({ ...s, loadingMore: true }))
    try {
      const { items, hasMore } = await loadPage(state.items.length + 1)
      setState((s) => ({ ...s, items: [...s.items, ...items], loadingMore: false, hasMore, error: null }))
    } catch (error) {
      setState((s) => ({ ...s, loadingMore: false, error }))
    }
  }, [loadPage, state.items.length])

  return { ...state, loadMore, refresh: fetchFirstPage }
}
