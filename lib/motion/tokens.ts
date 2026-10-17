/**
 * Motion timings — the one scale every animation in GharBazaar draws from.
 *
 * The same values exist twice, on purpose: here for Motion (which wants
 * seconds and bezier arrays) and as `--duration-*` / `--ease-*` custom
 * properties in app/globals.css for CSS transitions. tokens.test.ts fails if
 * the two disagree, so a dialog animated by Motion and a menu animated by CSS
 * cannot drift onto different clocks.
 *
 * Rules the scale encodes:
 *  - Nothing takes longer than `deliberate`. Animation must never hold up
 *    navigation or make a phone feel slow.
 *  - Leaving is faster than arriving: an exit uses a shorter duration and an
 *    accelerating curve, so whatever replaces it is not kept waiting.
 *  - Reduced motion is not handled here. CSS is covered by the global rule in
 *    globals.css; Motion by <MotionProvider reducedMotion="user">.
 */

/** Durations in milliseconds. */
export const DURATION = {
  /** Press feedback: a scale on tap. */
  instant: 100,
  /** Colour, border and opacity changes on hover/focus; small icon turns. */
  fast: 150,
  /** Most enter transitions: menus, dropdowns, tabs, list items. */
  base: 200,
  /** Large surfaces: dialogs, drawers and sheets arriving. */
  slow: 300,
  /** The ceiling. Image zoom and the rare page-level entrance. */
  deliberate: 450,
} as const

/** Cubic-bezier control points. */
export const EASE = {
  /** Something moving or resizing while it stays on screen. */
  standard: [0.2, 0, 0, 1],
  /** Something arriving: starts quickly, settles gently (decelerate). */
  enter: [0, 0, 0.2, 1],
  /** Something leaving: gathers speed as it goes (accelerate). */
  exit: [0.4, 0, 1, 1],
} as const

export type DurationToken = keyof typeof DURATION
export type EaseToken = keyof typeof EASE

const seconds = (token: DurationToken) => DURATION[token] / 1000
const tween = (duration: DurationToken, ease: EaseToken) => ({ duration: seconds(duration), ease: [...EASE[ease]] as [number, number, number, number] })

/**
 * Motion `transition` presets by role, so a component names what it is
 * doing rather than choosing numbers. Every value comes from the scale above.
 */
export const TRANSITION = {
  /** The MotionConfig default for anything that does not choose. */
  base: tween('base', 'standard'),
  press: tween('instant', 'standard'),
  hover: tween('fast', 'standard'),
  /** Menus, dropdowns, popovers, tabs, list and card entrances. */
  enter: tween('base', 'enter'),
  exit: tween('fast', 'exit'),
  /** Dialogs, drawers and sheets. */
  overlayEnter: tween('slow', 'enter'),
  overlayExit: tween('base', 'exit'),
  /** Layout changes (reordering, a moving tab indicator): critically damped, no bounce. */
  layout: { type: 'spring', visualDuration: seconds('slow'), bounce: 0 },
} as const
