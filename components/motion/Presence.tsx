'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import type { ReactNode } from 'react'
import { PRESETS, type PresetName } from '@/lib/motion/variants'
import { MotionFeatures } from './MotionFeatures'

/**
 * Animated mount and unmount for React-driven content (UI-04).
 *
 *   <Presence show={open} preset="menu"><Options … /></Presence>
 *
 * Progressive by construction: AnimatePresence's `initial={false}` means
 * content that is present on the first render — including everything in
 * server HTML — appears in its final state, never transparent waiting for
 * JavaScript. Only what the user causes afterwards animates in, and the exit
 * keeps the leaving element mounted just long enough to fade.
 *
 * Use it where a component's own state decides what is shown. A Radix dialog
 * or a `hidden` panel uses the CSS motion layer instead (no JavaScript).
 * Mounting this pulls Motion into that page's bundle — about 14.5 KB gzip up
 * front and 14.2 KB of features after hydration (UI-02) — so it belongs on
 * leaves that genuinely need it.
 */
export function Presence({ show, preset = 'fade', className, children }: {
  show: boolean
  preset?: PresetName
  className?: string
  children: ReactNode
}) {
  const p = PRESETS[preset]
  return (
    <MotionFeatures>
      <AnimatePresence initial={false}>
        {show && (
          <m.div
            key="presence"
            className={className}
            initial={p.initial}
            animate={{ ...p.animate, transition: p.transition }}
            exit={{ ...p.exit, transition: p.exitTransition }}
          >
            {children}
          </m.div>
        )}
      </AnimatePresence>
    </MotionFeatures>
  )
}
