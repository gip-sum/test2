'use client'

import { LazyMotion } from 'motion/react'
import type { ReactNode } from 'react'

// A separate chunk, fetched only when the first <MotionFeatures> mounts.
const loadFeatures = () => import('./features').then((mod) => mod.default)
// The larger set with drag and layout, its own chunk (features-max.ts).
const loadMax = () => import('./features-max').then((mod) => mod.default)

/**
 * The boundary every animated leaf sits inside.
 *
 * GharBazaar animates with `m.*` components, never `motion.*` (an ESLint rule
 * enforces it). `m` carries no animation code of its own; this boundary
 * supplies it, lazily, the first time anything animated renders. `strict`
 * makes a stray `motion.*` component throw in development, which catches
 * registry code (Kokonut UI, Bklit UI) that was not converted.
 *
 * Import `m` from its own entry — `import * as m from 'motion/react-m'` —
 * never from 'motion/react'. Measured in UI-02 on a probe page: through the
 * motion/react barrel, webpack hoisted the features into the first-load chunk
 * (~38.6 KB gzip, the lazy chunk a 0.2 KB stub); through motion/react-m the
 * page loads ~14.5 KB up front and the ~14.2 KB of features after hydration.
 * ESLint enforces the import.
 *
 * Wrap the smallest thing that moves, not the page:
 *
 *   // components/motion/Reveal.tsx — a client leaf
 *   'use client'
 *   import * as m from 'motion/react-m'
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
export function MotionFeatures({ children, max = false }: { children: ReactNode; max?: boolean }) {
  return (
    <LazyMotion features={max ? loadMax : loadFeatures} strict>
      {children}
    </LazyMotion>
  )
}
