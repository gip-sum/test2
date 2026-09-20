'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Picks one rendering instead of shipping two.
 *
 * The location field is an inline combobox on desktop and a full-screen
 * sheet on phones. Rendering both and hiding one with CSS duplicates the
 * DOM, which breaks keyboard order and confuses screen readers.
 *
 * Uses `useSyncExternalStore` rather than state-in-an-effect: it is the
 * API designed for subscribing to browser state, it tears correctly under
 * concurrent rendering, and it has a defined server snapshot.
 *
 * The server snapshot is `false`, so the mobile-first layout is what
 * renders before hydration.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])
  const getServerSnapshot = useCallback(() => false, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Matches the `lg` breakpoint, where the desktop layout takes over. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}
