import { DURATION, TRANSITION } from './tokens'

/**
 * GharBazaar's Motion presets (UI-04) — the React side of the motion
 * language whose CSS side is the motion layer in app/globals.css. Same
 * roles, same tokens: arriving uses `enter`, leaving is shorter and uses
 * `exit`, and movement is small enough to read as a nudge, not a journey.
 *
 * Use these through <Presence> (components/motion/Presence.tsx) for content
 * that React mounts and unmounts — a dropdown's options, a swapped panel, a
 * confirmation replacing a form. Surfaces that are already CSS-driven (Radix
 * dialogs, the header panels) use the CSS primitives instead; see the motion
 * layer for why.
 *
 * Under <MotionProvider reducedMotion="user"> the transforms drop out and
 * only the fades remain.
 */
export type Preset = {
  initial: Record<string, number>
  animate: Record<string, number>
  exit: Record<string, number>
  transition: typeof TRANSITION.enter
  exitTransition: typeof TRANSITION.exit
}

const preset = (from: Record<string, number>, exitTo: Record<string, number>, overlay = false): Preset => ({
  initial: { opacity: 0, ...from },
  animate: { opacity: 1, ...Object.fromEntries(Object.keys(from).map((k) => [k, k === 'scale' ? 1 : 0])) },
  exit: { opacity: 0, ...exitTo },
  transition: overlay ? TRANSITION.overlayEnter : TRANSITION.enter,
  exitTransition: overlay ? TRANSITION.overlayExit : TRANSITION.exit,
})

export const PRESETS = {
  /** Content appearing in place: a status message, a swapped panel. */
  fade: preset({}, {}),
  /** A small surface opening over the page: a popover, a confirmation. */
  fadeScale: preset({ scale: 0.97 }, { scale: 0.98 }),
  /** A dropdown or menu dropping from its trigger. */
  menu: preset({ y: -4 }, { y: -4 }),
  /** A sheet or drawer rising from the bottom edge (phones). */
  sheet: preset({ y: 24 }, { y: 16 }, true),
  /** One item of a list arriving (with stagger()). */
  item: preset({ y: 8 }, {}),
} as const satisfies Record<string, Preset>

export type PresetName = keyof typeof PRESETS

/**
 * Delay for item `index` of a list that arrives together. Capped so the last
 * item never waits longer than `base`: a long list must not make its tail
 * crawl in, and nothing may delay what the user is reaching for.
 */
export function stagger(index: number, step = 0.03): number {
  return Math.min(index * step, DURATION.base / 1000)
}
