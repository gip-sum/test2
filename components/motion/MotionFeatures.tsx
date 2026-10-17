'use client'

import { LazyMotion } from 'motion/react'
import type { ReactNode } from 'react'

// A separate chunk, fetched only when the first <MotionFeatures> mounts.
const loadFeatures = () => import('./features').then((mod) => mod.default)

/**
 * The boundary every animated leaf sits inside.
 *
 * GharBazaar animates with `m.*` components, never `motion.*` (an ESLint rule
 * enforces it). `m` carries no animation code of its own; this boundary
 * supplies it, lazily, the first time anything animated renders. `strict`
 * makes a stray `motion.*` component throw in development, which catches
 * registry code (Kokonut UI, Bklit UI) that was not converted.
 *
 * Wrap the smallest thing that moves, not the page:
 *
 *   // components/motion/Reveal.tsx — a client leaf
 *   'use client'
 *   export function Reveal({ children }) {
 *     return <MotionFeatures><m.div initial={{ y: 8 }} animate={{ y: 0 }}>{children}</m.div></MotionFeatures>
 *   }
 *   // a server page keeps rendering on the server:
 *   <Reveal><ServerRenderedCard … /></Reveal>
 *
 * Content that is visible without JavaScript must stay visible: do not start
 * above-the-fold content from opacity 0, or a slow phone shows a blank area
 * until hydration.
 */
export function MotionFeatures({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  )
}
