'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { measure, play, type FlipSnapshot } from '@/lib/motion/flip'
import { SAVED_REMOVING } from '@/lib/saved/removal'


/**
 * The Saved list's grid (UI-12). When a home is removed — after the server
 * has confirmed it — the page refreshes and the card leaves; the cards
 * after it used to jump into the gap, so the card under a pointer or finger
 * changed without warning. Here they travel to their new cells instead,
 * with the UI-08 FLIP (lib/motion/flip.ts): one Web Animations transform
 * per card, the DOM already in its final order, nothing for focus, clicks
 * or the accessibility tree to wait on. Reduced motion: they simply appear
 * in place (flip.ts checks the preference).
 *
 * The cards stay server-rendered `children`; this only measures them when
 * a SaveButton announces a removal and plays once the refreshed children
 * are committed.
 */
export function SavedGrid({ className, children }: { className?: string; children: ReactNode }) {
  const grid = useRef<HTMLDivElement>(null)
  const before = useRef<FlipSnapshot | null>(null)

  useLayoutEffect(() => {
    const remember = () => { before.current = measure(grid.current) }
    document.addEventListener(SAVED_REMOVING, remember)
    return () => document.removeEventListener(SAVED_REMOVING, remember)
  }, [])

  useLayoutEffect(() => {
    const snapshot = before.current
    if (!snapshot) return
    before.current = null
    play(grid.current, snapshot)
  }, [children])

  return <div ref={grid} className={className}>{children}</div>
}
