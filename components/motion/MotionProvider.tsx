'use client'

import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { TRANSITION } from '@/lib/motion/tokens'

/**
 * The one place Motion is configured, mounted once in app/layout.tsx.
 *
 * reducedMotion="user": with the OS "reduce motion" setting on, every Motion
 * component in the tree drops transform and layout animation (it jumps to
 * the end state) while opacity and colour still fade. The CSS rule in
 * globals.css cannot do this: it zeroes CSS durations, and Motion animates
 * from JavaScript, so without this a dialog sliding in would ignore the
 * setting entirely. Components never need to check the preference
 * themselves; a custom animation that is not a Motion component reads
 * useReducedMotion().
 *
 * This is deliberately ONLY configuration — no animation features, no DOM.
 * Server pages stay server-rendered: a client component may take server
 * components as `children` without turning them into client code. Animation
 * code itself is loaded by <MotionFeatures> around the small leaf that
 * animates, so a page with no animation downloads none of it.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={TRANSITION.base}>
      {children}
    </MotionConfig>
  )
}
