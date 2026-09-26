'use client'

import { useEffect } from 'react'

/**
 * Keeps the address bar equal to the last valid calculation, so refresh,
 * back and a copied link reproduce what is on screen.
 *
 * replaceState, not router.push: every keystroke is not a history entry,
 * and nothing needs re-rendering on the server — the page computes the
 * same result from the same query when it is loaded. Debounced so typing
 * "62,50,000" writes once. While the input is invalid the URL keeps the
 * last valid state rather than an error.
 */
export function useQuerySync(path: string, query: string | null) {
  useEffect(() => {
    if (query === null) return
    const target = `${path}${query}`
    const timer = window.setTimeout(() => {
      if (window.location.pathname + window.location.search !== target) {
        window.history.replaceState(window.history.state, '', target)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [path, query])
}
