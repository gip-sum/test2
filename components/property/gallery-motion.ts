import { DURATION } from '@/lib/motion/tokens'

/**
 * The gallery's geometry and gesture rules (UI-16), adapted from Kokonut UI's
 * Lightbox Grid — github.com/kokonut-labs/kokonutui at bb9120f8, file
 * components/kokonutui/lightbox-grid.tsx, v1.0.0 by @dorianbaffier, MIT
 * License, Copyright (c) 2025 kokonutUI.
 *
 * Kept from it: the photo that opens is moved and cropped from the box it
 * was in to its place on screen, so it reads as the same photo growing (a
 * transform and a clip-path, never a re-layout); a swipe is decided by
 * distance OR speed, so a short flick works; an axis is chosen after a few
 * pixels, so a vertical scroll never turns into a swipe.
 *
 * Changed: the viewer is our Radix dialog (focus trap, the page made inert,
 * Escape, focus returned), not a hand-rolled one; the springs are critically
 * damped on the motion scale (lib/motion/tokens), because nothing in the
 * product bounces; the photos wrap around, as the gallery always has.
 */

export type Rect = { left: number; top: number; width: number; height: number }
export type Frame = { x: number; y: number; scale: number; clip: string }

/** Pixels of movement before a drag commits to an axis. */
export const AXIS_LOCK = 6
/** A swipe: past this share of the photo's width… */
const SWIPE_SHARE = 0.22
/** …or faster than this, in px/ms. */
const SWIPE_SPEED = 0.45
/** Pull down to close: this far, or this fast. */
export const DISMISS_DISTANCE = 110
export const DISMISS_SPEED = 0.55
/** How far an arriving photo starts from its place, toward the side it comes from. */
export const ARRIVE_OFFSET = 72

const s = (ms: number) => ms / 1000
/** Opening: the photo grows into place over the slowest step of the scale. */
export const OPEN = { type: 'spring', visualDuration: s(DURATION.deliberate), bounce: 0 } as const
/** Closing is quicker than opening, as every exit is. */
export const CLOSE = { type: 'spring', visualDuration: s(DURATION.slow), bounce: 0 } as const
/** A drag that did not go far enough settles back. */
export const SETTLE = { type: 'spring', visualDuration: s(DURATION.slow), bounce: 0 } as const

/** Where a photo of this ratio sits in the viewer's stage, fitted with a margin. */
export function fitRect(stage: Rect, ratio: number, margin: number): Rect {
  const maxW = Math.max(1, stage.width - margin * 2)
  const maxH = Math.max(1, stage.height - margin * 2)
  const width = Math.min(maxW, maxH * ratio)
  const height = width / ratio
  return { left: stage.left + (stage.width - width) / 2, top: stage.top + (stage.height - height) / 2, width, height }
}

/**
 * The transform and crop that make the open photo look exactly like the box
 * it came from: scaled to that box's cover size, moved onto it and cropped
 * to it. Animating from here to none is the whole effect.
 */
export function sourceFrame(open: Rect, source: Rect, ratio: number, radius: number): Frame {
  const coverWidth = ratio > source.width / source.height ? source.height * ratio : source.width
  const scale = coverWidth / open.width
  const insetX = Math.max(0, (open.width - source.width / scale) / 2)
  const insetY = Math.max(0, (open.height - source.height / scale) / 2)
  return {
    x: source.left + source.width / 2 - (open.left + open.width / 2),
    y: source.top + source.height / 2 - (open.top + open.height / 2),
    scale,
    clip: `inset(${insetY}px ${insetX}px ${insetY}px ${insetX}px round ${radius / scale}px)`,
  }
}

/** The open photo's crop: none, with rounded corners where it has a margin (not edge to edge on a phone). */
export const openClip = (radius: number) => `inset(0px 0px 0px 0px round ${radius}px)`
/** The viewer's margin around the photo: none on a phone, where every pixel is the photo. */
export const stageMargin = (stageWidth: number) => (stageWidth < 640 ? 0 : 24)

/** Where a horizontal release goes: 1 the next photo, -1 the previous, 0 back. */
export function releaseStep(dx: number, vx: number, width: number): -1 | 0 | 1 {
  if (Math.abs(dx) < AXIS_LOCK) return 0
  const far = Math.abs(dx) > width * SWIPE_SHARE || Math.abs(vx) > SWIPE_SPEED
  return far ? (dx < 0 ? 1 : -1) : 0
}

/** True when a box is at least partly on screen. */
export function onScreen(r: DOMRect): boolean {
  return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth && r.width > 0
}
