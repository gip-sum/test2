'use client'

import * as Dialog from '@radix-ui/react-dialog'
import Image from 'next/image'
import { animate, useMotionValue, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type SyntheticEvent } from 'react'
import { MotionFeatures } from '@/components/motion/MotionFeatures'
import { CameraIcon, ExpandIcon, PhotosIcon } from '@/components/ui/icons'
import { photoRef, revealImage } from '@/lib/motion/image-fade'
import { TRANSITION } from '@/lib/motion/tokens'
import { cn } from '@/lib/cn'
import type { PropertyMedia } from '@/lib/property/types'
import { PhotoFallback } from './PhotoFallback'
import { listingPhotoLoader } from '@/lib/listings/photo-widths'
import {
  ARRIVE_OFFSET, AXIS_LOCK, CLOSE, DISMISS_DISTANCE, DISMISS_SPEED, OPEN, SETTLE,
  fitRect, onScreen, openClip, releaseStep, sourceFrame, stageMargin, type Rect,
} from './gallery-motion'

/**
 * Scrolls a thumbnail strip just far enough to show its current thumbnail.
 * The strip's own scroll position only — never the page: scrollIntoView
 * would also scroll the window when the strip is off screen.
 */
function keepCurrentInView(strip: HTMLElement | null) {
  const current = strip?.querySelector<HTMLElement>('[aria-current="true"]')
  if (!strip || !current) return
  const box = strip.getBoundingClientRect(), thumb = current.getBoundingClientRect()
  const by = thumb.left < box.left ? thumb.left - box.left - 8 : thumb.right > box.right ? thumb.right - box.right + 8 : 0
  if (by) strip.scrollBy({ left: by, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}

type Axis = 'x' | 'y'
type Velocity = { x: number; y: number }

/**
 * A pointer drag decided Kokonut's way (gallery-motion.ts): nothing until
 * the pointer has moved AXIS_LOCK pixels, then one axis for the rest of the
 * gesture, and a release that reports distance and speed. Presses on a
 * button never start one, so the arrows and the heart stay plain buttons.
 */
function useDrag({ mouse, onMove, onRelease }: {
  mouse: boolean
  onMove: (axis: Axis, dx: number, dy: number) => void
  onRelease: (axis: Axis, dx: number, dy: number, velocity: Velocity) => void
}) {
  const drag = useRef<{ id: number; x0: number; y0: number; axis: Axis | null; samples: Array<{ x: number; y: number; t: number }> } | null>(null)
  return {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || (!mouse && event.pointerType === 'mouse')) return
      if ((event.target as Element).closest('button, a')) return
      drag.current = { id: event.pointerId, x0: event.clientX, y0: event.clientY, axis: null, samples: [{ x: event.clientX, y: event.clientY, t: event.timeStamp }] }
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      const d = drag.current
      if (!d || d.id !== event.pointerId) return
      const dx = event.clientX - d.x0, dy = event.clientY - d.y0
      if (!d.axis) {
        if (Math.hypot(dx, dy) < AXIS_LOCK) return
        d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
        try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* the pointer already ended */ }
      }
      d.samples.push({ x: event.clientX, y: event.clientY, t: event.timeStamp })
      if (d.samples.length > 5) d.samples.shift()
      onMove(d.axis, dx, dy)
    },
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
      const d = drag.current
      if (!d || d.id !== event.pointerId) return
      drag.current = null
      if (!d.axis) return
      const first = d.samples[0]!, last = d.samples.at(-1)!
      const dt = Math.max(1, last.t - first.t)
      onRelease(d.axis, event.clientX - d.x0, event.clientY - d.y0, { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt })
    },
    // The browser took the gesture (a vertical page scroll): settle back.
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => {
      const d = drag.current
      drag.current = null
      if (d?.id === event.pointerId && d.axis) onRelease(d.axis, 0, 0, { x: 0, y: 0 })
    },
  }
}

/**
 * The listing's photos (UI-16 composition and motion; UI-08 interactions).
 *
 * Two compositions over one set of state:
 *  - `wide` (the property page, five photos or more): from 1024px a framed
 *    mosaic across the page — the lead photo over two rows and four
 *    supporting photos, the last offering "View all". Its box is a fixed
 *    ratio, so it reserves its height before any photo arrives.
 *  - otherwise one framed photo, 4:3 and 16:10 from 1024px (preview,
 *    moderation and published-listing pages, and fewer than five photos).
 * On a phone the lead photo runs edge to edge at 4:3 with only what a
 * thumb needs on it: swipe, the counter, full screen and save. The mosaic
 * is never squeezed onto a phone, and the thumbnail strip lives in the
 * full-screen viewer there (and inline wherever the mosaic is not shown).
 *
 * MOTION (UI-16, Motion with Kokonut UI's Lightbox Grid technique; see
 * gallery-motion.ts). It replaced UI-08's CSS 16px nudge:
 *  - a swipe moves the photo with the finger and is decided on release by
 *    distance or speed; the next photo arrives from the side it came from;
 *  - full screen grows the photo out of the frame or tile you pressed, and
 *    closing returns it to the frame; on a phone, pulling the photo down
 *    closes the viewer;
 *  - under reduced motion nothing follows the finger and nothing moves:
 *    photos change in place and the viewer fades.
 * Motion values drive transforms directly, so a drag re-renders nothing.
 *
 * `overlay` is laid over the lead photo's top-right corner — the property
 * page puts its save heart there, so it sits on the photo at every width.
 */
export function Gallery(props: { photos: PropertyMedia[]; title: string; layout?: 'wide' | 'column'; overlay?: ReactNode }) {
  return <MotionFeatures><GalleryView {...props} /></MotionFeatures>
}

function GalleryView({ photos, title, layout = 'column', overlay }: { photos: PropertyMedia[]; title: string; layout?: 'wide' | 'column'; overlay?: ReactNode }) {
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState<Set<string>>(() => new Set())
  // The preview tile whose photo is in flight to or from the viewer.
  const [liftedTile, setLiftedTile] = useState<number | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const reduce = useReducedMotion() ?? false
  const strip = useRef<HTMLUListElement>(null)
  const lightboxStrip = useRef<HTMLUListElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement | null>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const source = useRef<HTMLElement | null>(null)
  const ratios = useRef(new Map<string, number>())
  const openRef = useRef(false)
  const closing = useRef(false)
  // The inline photo, and the viewer's: position, scale, crop and opacity.
  const inlineX = useMotionValue(0), inlineAlpha = useMotionValue(1)
  const x = useMotionValue(0), y = useMotionValue(0), scale = useMotionValue(1), clip = useMotionValue(openClip(0))
  const alpha = useMotionValue(1), fade = useMotionValue(0)

  const usable = photos.filter((photo) => Boolean(photo.url))
  const count = usable.length
  const multi = count > 1
  const mosaic = layout === 'wide' && count >= 5
  const current = usable[Math.min(index, Math.max(0, count - 1))]
  const ratioOf = (media: PropertyMedia | undefined) => (media && ratios.current.get(media.id)) || 4 / 3

  // The photo that replaces another arrives from the side it came from.
  const arrive = (direction: -1 | 1, inViewer: boolean) => {
    const [px, pa] = inViewer ? [x, alpha] : [inlineX, inlineAlpha]
    if (reduce) { px.jump(0); pa.jump(1); return }
    px.jump(direction * ARRIVE_OFFSET)
    pa.jump(0)
    animate(px, 0, TRANSITION.overlayEnter)
    animate(pa, 1, TRANSITION.enter)
  }
  const go = (delta: -1 | 1) => {
    if (!multi) return
    setIndex((at) => (at + delta + count) % count)
    arrive(delta, openRef.current)
  }
  const select = (next: number) => {
    if (next === index) return
    setIndex(next)
    arrive(next > index ? 1 : -1, openRef.current)
  }

  // Swiping or pressing arrows to photo 9 used to leave the strip showing
  // photos 1 to 5, the current one out of sight.
  useEffect(() => {
    keepCurrentInView(strip.current)
    keepCurrentInView(lightboxStrip.current)
  }, [index, open])
  const markFailed = (id: string) => setFailed((set) => new Set(set).add(id))
  const noteRatio = (id: string, ratio: number) => { if (ratio > 0) ratios.current.set(id, ratio) }

  const inlineDrag = useDrag({
    mouse: false,
    onMove: (axis, dx) => { if (axis === 'x' && multi && !reduce) inlineX.set(dx) },
    onRelease: (axis, dx, _dy, v) => {
      if (axis !== 'x' || !multi) return
      const step = releaseStep(dx, v.x, frame.current?.clientWidth ?? 360)
      if (step) go(step)
      else if (!reduce) animate(inlineX, 0, SETTLE)
    },
  })

  /** The viewer's stage and the photo's fitted place in it, stage-relative. */
  const measure = useCallback((media: PropertyMedia | undefined) => {
    const node = stage.current
    if (!node) return null
    const box = node.getBoundingClientRect()
    const fitted = fitRect({ left: box.left, top: box.top, width: box.width, height: box.height }, ratioOf(media), stageMargin(box.width))
    return { box, fitted, local: { left: fitted.left - box.left, top: fitted.top - box.top, width: fitted.width, height: fitted.height } }
  }, [])

  // The stage mounts inside the dialog's portal a render after `open`, so
  // the opening flight starts when it mounts (Stage), once it can be measured.
  const startOpen = (node: HTMLDivElement | null) => {
    stage.current = node
    if (!node || !current) return
    const at = measure(current)
    if (!at) return
    setRect(at.local)
    const from = source.current
    const box = from?.getBoundingClientRect()
    const rounded = openClip(stageMargin(at.box.width) ? 12 : 0)
    clip.jump(rounded)
    if (!from || !box || !onScreen(box) || reduce) {
      x.jump(0); y.jump(0); scale.jump(1); alpha.jump(0); fade.jump(0)
      animate(alpha, 1, TRANSITION.enter)
      animate(fade, 1, TRANSITION.enter)
      return
    }
    const img = from.querySelector('img')
    if (img?.naturalWidth) noteRatio(current.id, img.naturalWidth / img.naturalHeight)
    const start = sourceFrame(at.fitted, box, ratioOf(current), Number.parseFloat(getComputedStyle(from).borderTopLeftRadius) || 0)
    x.jump(start.x); y.jump(start.y); scale.jump(start.scale); clip.jump(start.clip); alpha.jump(1); fade.jump(0)
    // The photo has left its box; the box stays empty until it returns.
    if (from === frame.current) inlineAlpha.jump(0)
    animate(x, 0, OPEN); animate(y, 0, OPEN); animate(scale, 1, OPEN); animate(clip, rounded, OPEN)
    animate(fade, 1, TRANSITION.overlayEnter)
  }

  const show = (next: number, trigger: HTMLButtonElement, from: HTMLElement | null) => {
    if (next !== index) setIndex(next)
    inlineX.jump(0); inlineAlpha.jump(1)
    opener.current = trigger
    source.current = from
    setLiftedTile(from && from !== frame.current ? next : null)
    closing.current = false
    openRef.current = true
    setOpen(true)
  }

  // Closing flies the photo back into the frame, which shows the same photo
  // (one index drives both); off screen, or under reduced motion, it fades.
  const requestClose = (velocity?: Velocity) => {
    if (closing.current || !openRef.current) return
    closing.current = true
    const finish = () => {
      openRef.current = false
      closing.current = false
      inlineAlpha.jump(1)
      setLiftedTile(null)
      setRect(null)
      setOpen(false)
    }
    const target = frame.current
    const box = target?.getBoundingClientRect()
    const at = measure(current)
    if (!target || !box || !onScreen(box) || !at || reduce) {
      Promise.all([animate(alpha, 0, TRANSITION.exit), animate(fade, 0, TRANSITION.exit)]).then(finish)
      return
    }
    setLiftedTile(null)
    inlineAlpha.jump(0)
    const local = rect ?? at.local
    const placed = { left: at.box.left + local.left, top: at.box.top + local.top, width: local.width, height: local.height }
    const end = sourceFrame(placed, box, ratioOf(current), Number.parseFloat(getComputedStyle(target).borderTopLeftRadius) || 0)
    // A flick carries its speed into the flight home.
    Promise.all([
      animate(x, end.x, { ...CLOSE, velocity: (velocity?.x ?? 0) * 1000 }),
      animate(y, end.y, { ...CLOSE, velocity: (velocity?.y ?? 0) * 1000 }),
      animate(scale, end.scale, CLOSE),
      animate(clip, end.clip, CLOSE),
      animate(fade, 0, TRANSITION.overlayExit),
    ]).then(finish)
  }

  const viewerDrag = useDrag({
    mouse: true,
    onMove: (axis, dx, dy) => {
      if (reduce || closing.current) return
      if (axis === 'x') { if (multi) x.set(dx); return }
      // Pulling the photo away shrinks it and lets the page show through.
      const pull = Math.min(Math.abs(dy) / window.innerHeight, 1)
      x.set(dx); y.set(dy); scale.set(1 - pull * 0.45)
      fade.set(1 - Math.min(Math.abs(dy) / 360, 1) * 0.85)
    },
    onRelease: (axis, dx, dy, v) => {
      if (closing.current) return
      if (axis === 'y') {
        if (!reduce && (Math.abs(dy) > DISMISS_DISTANCE || Math.abs(v.y) > DISMISS_SPEED)) { requestClose(v); return }
        animate(x, 0, SETTLE); animate(y, 0, SETTLE); animate(scale, 1, SETTLE); animate(fade, 1, TRANSITION.enter)
        return
      }
      const step = multi ? releaseStep(dx, v.x, rect?.width ?? 360) : 0
      if (step) go(step)
      else animate(x, 0, SETTLE)
    },
  })

  // A different photo, or a resized window, refits the open photo.
  useEffect(() => {
    if (!open || closing.current) return
    const refit = () => { const at = measure(current); if (at) setRect(at.local) }
    refit()
    window.addEventListener('resize', refit)
    return () => window.removeEventListener('resize', refit)
  }, [open, current, measure])

  if (!count || !current) return <EmptyMedia title={title} overlay={overlay} bleed={layout === 'wide'} />
  const allLabel = multi ? `View all ${count} photos` : 'View photo full screen'

  return (
    <section aria-label="Property photos" className="min-w-0">
      <div className={cn('min-w-0', mosaic && 'lg:grid lg:aspect-[3/1] lg:grid-cols-[2fr_1fr_1fr] lg:grid-rows-2 lg:gap-2 xl:aspect-[16/5]')}>
        <div
          ref={frame}
          role={multi ? 'group' : undefined}
          aria-roledescription={multi ? 'carousel' : undefined}
          aria-label={multi ? `Photos of ${title}` : undefined}
          tabIndex={multi ? 0 : -1}
          onKeyDown={(event) => {
            if (!multi) return
            if (event.key === 'ArrowRight') { event.preventDefault(); go(1) }
            if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1) }
          }}
          {...inlineDrag}
          data-photo-frame=""
          className={cn(
            'gallery-frame relative aspect-[4/3] min-w-0 touch-pan-y select-none overflow-hidden bg-media-ground',
            layout === 'wide' ? '-mx-4 sm:mx-0 sm:rounded-lg' : 'rounded-lg',
            mosaic ? 'lg:row-span-2 lg:aspect-auto lg:rounded-r-sm' : 'lg:aspect-[16/10]',
          )}
        >
          {/* Keyed by photo, so a new photo mounts fresh and fades into the
              reserved frame when it arrives (UI-04's image fade), instead of
              the previous photo staying on screen under a counter and a
              screen-reader status that already name the next one. */}
          <m.div className="absolute inset-0" style={{ x: inlineX, opacity: inlineAlpha }}>
            <MediaPhoto key={current.id} media={current} failed={failed.has(current.id)} onError={() => markFailed(current.id)} onRatio={noteRatio} sizes={mosaic ? '(min-width: 1440px) 680px, (min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 760px, (min-width: 768px) 768px, 100vw'} priority={index === 0} hint={multi ? 'The other photos are still here.' : undefined} />
          </m.div>
          {multi && (
            <>
              <NavButton side="left" onClick={() => go(-1)} label="Previous photo" />
              <NavButton side="right" onClick={() => go(1)} label="Next photo" />
            </>
          )}
          {/* The full-screen action: a round icon on a phone, worded from
              640px. One button, one accessible name at every width. */}
          <button
            type="button"
            onClick={(event) => show(index, event.currentTarget, frame.current)}
            className="absolute bottom-3 left-3 z-10 inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-surface-000/95 px-3 text-label text-ink-900 shadow-e2 hover:bg-surface-000 sm:px-4"
          >
            {multi ? <PhotosIcon className="size-4.5" /> : <ExpandIcon className="size-4.5" />}
            <span className="max-sm:sr-only">{allLabel}</span>
          </button>
          {multi && <Counter index={index} count={count} />}
          {overlay && <div className="absolute right-3 top-3 z-10">{overlay}</div>}
        </div>
        {mosaic && (
          <div className="hidden lg:contents">
            {usable.slice(1, 5).map((photo, offset) => (
              <button
                key={photo.id}
                type="button"
                onClick={(event) => show(offset + 1, event.currentTarget, event.currentTarget)}
                aria-label={offset === 3 && count > 5 ? `View all ${count} photos, from photo 5` : `View photo ${offset + 2} of ${count} full screen`}
                style={liftedTile === offset + 1 ? { opacity: 0 } : undefined}
                className={cn(
                  'gallery-tile relative min-h-0 min-w-0 overflow-hidden rounded-sm bg-media-ground text-ink-inverse focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                  offset === 1 && 'rounded-tr-lg',
                  offset === 3 && 'rounded-br-lg',
                )}
              >
                <MediaPhoto media={photo} failed={failed.has(photo.id)} onError={() => markFailed(photo.id)} onRatio={noteRatio} sizes="(min-width: 1440px) 340px, 25vw" compact />
                {offset === 3 && count > 5 && (
                  <span className="absolute inset-0 grid place-items-center bg-ink-900/60">
                    <span className="inline-flex items-center gap-2 rounded-full bg-surface-000 px-4 py-2 text-label text-ink-900 shadow-e2">
                      <PhotosIcon className="size-4.5" />+{count - 5} more
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {multi ? `Image ${index + 1} of ${count}. ${current.alt}` : current.alt}
      </p>
      {multi && (
        <ul ref={strip} aria-label="Choose a photo" className={cn('mt-2 gap-2 overflow-x-auto pb-1 max-sm:hidden sm:flex', mosaic && 'lg:hidden')}>
          {usable.map((photo, position) => (
            <li key={photo.id} className="shrink-0">
              <button
                type="button"
                onClick={() => select(position)}
                aria-label={`Show photo ${position + 1} of ${count}`}
                aria-current={position === index ? 'true' : undefined}
                className={cn('relative block h-14 w-20 overflow-hidden rounded-md border-2 transition-colors', position === index ? 'border-brand-600' : 'border-transparent hover:border-border-strong')}
              >
                <MediaPhoto media={photo} failed={failed.has(photo.id)} onError={() => markFailed(photo.id)} sizes="80px" compact decorative thumb />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog.Root open={open} onOpenChange={(next) => { if (!next) requestClose() }}>
        <Dialog.Portal>
          {/* The ground fades with the flight, so the page shows through
              while the photo leaves its box. Radix's overlay keeps the page
              from scrolling underneath. */}
          <Dialog.Overlay asChild>
            <m.div className="fixed inset-0 z-[60] bg-ink-900" style={{ opacity: fade }} />
          </Dialog.Overlay>
          <Dialog.Content
            onCloseAutoFocus={(event) => { event.preventDefault(); opener.current?.focus() }}
            onKeyDown={(event) => {
              if (!multi) return
              if (event.key === 'ArrowRight') { event.preventDefault(); go(1) }
              if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1) }
            }}
            className="fixed inset-0 z-[61] flex flex-col text-ink-inverse outline-none"
          >
            <m.header style={{ opacity: fade, paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }} className="relative z-10 flex min-h-16 items-center gap-3 px-4 pb-2">
              <Dialog.Title className="flex-1 truncate font-display text-heading-3">{title}</Dialog.Title>
              <span className="text-label tabular" aria-hidden>{multi ? `${index + 1} / ${count}` : 'Photo'}</span>
              <button type="button" onClick={() => requestClose()} aria-label="Close gallery" className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-inverse/10 hover:bg-ink-inverse/20">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </m.header>
            <Dialog.Description className="sr-only">Property photos. Use arrow keys or swipe to change image; Escape closes the gallery.</Dialog.Description>
            <Stage onReady={startOpen} className="relative min-h-0 flex-1 touch-none select-none" data-photo-frame="" {...viewerDrag}>
              {rect && (
                <m.div
                  className="absolute overflow-hidden"
                  style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, x, y, scale, clipPath: clip, opacity: alpha, willChange: 'transform, clip-path' }}
                >
                  <MediaPhoto key={current.id} media={current} failed={failed.has(current.id)} onError={() => markFailed(current.id)} onRatio={noteRatio} sizes="100vw" contain priority dark />
                </m.div>
              )}
              {multi && (
                <m.div className="pointer-events-none absolute inset-0" style={{ opacity: fade }}>
                  <NavButton side="left" onClick={() => go(-1)} label="Previous full-screen photo" always />
                  <NavButton side="right" onClick={() => go(1)} label="Next full-screen photo" always />
                </m.div>
              )}
            </Stage>
            <p role="status" aria-live="polite" className="sr-only">{multi ? `Full screen image ${index + 1} of ${count}. ${current.alt}` : current.alt}</p>
            {multi && (
              <m.ul ref={lightboxStrip} aria-label="Choose a full-screen photo" style={{ opacity: fade, paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }} className="relative z-10 flex gap-2 overflow-x-auto px-4 py-3">
                {usable.map((photo, position) => (
                  <li key={photo.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => select(position)}
                      aria-label={`View full-screen photo ${position + 1} of ${count}`}
                      aria-current={position === index ? 'true' : undefined}
                      className={cn('relative block h-14 w-18 overflow-hidden rounded-md border-2', position === index ? 'border-ink-inverse' : 'border-transparent opacity-70 hover:opacity-100')}
                    >
                      <MediaPhoto media={photo} failed={failed.has(photo.id)} onError={() => markFailed(photo.id)} sizes="72px" compact decorative thumb dark />
                    </button>
                  </li>
                ))}
              </m.ul>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}

/**
 * The viewer's stage. It reports itself once, when it mounts, with the
 * props of that render — a callback ref would be a new function on every
 * render and restart the opening flight each time.
 */
function Stage({ onReady, children, ...rest }: { onReady: (node: HTMLDivElement | null) => void; children: ReactNode } & React.HTMLAttributes<HTMLDivElement> & { 'data-photo-frame'?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  // Mount and unmount only, by design (see above).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { onReady(ref.current); return () => onReady(null) }, [])
  return <div ref={ref} {...rest}>{children}</div>
}

function MediaPhoto({ media, failed, onError, onRatio, sizes, priority, compact, contain, decorative, thumb, dark, hint }: {
  media: PropertyMedia
  failed: boolean
  onError: () => void
  /** The loaded photo's shape, so the viewer can fit it without guessing. */
  onRatio?: (id: string, ratio: number) => void
  sizes: string
  priority?: boolean
  compact?: boolean
  contain?: boolean
  decorative?: boolean
  /** A thumbnail: the fallback is its icon alone. */
  thumb?: boolean
  /** On the full-screen viewer's ink ground. */
  dark?: boolean
  hint?: string
}) {
  // An access-checked photo is never preloaded: its route answers no-store,
  // so the browser cannot hand the preloaded response to the <img> and
  // downloaded the photo twice (UI-22). It loads eagerly at high priority
  // instead, from the HTML.
  if (!media.url || failed) {
    return <PhotoFallback alt={media.alt} size={thumb ? 'icon' : compact ? 'compact' : 'full'} tone={dark ? 'dark' : 'light'} hint={hint} />
  }
  return (
    <>
      <Image ref={photoRef(onError)} onLoad={(event: SyntheticEvent<HTMLImageElement>) => { revealImage(event); const img = event.currentTarget; if (img.naturalWidth) onRatio?.(media.id, img.naturalWidth / img.naturalHeight) }} draggable={false} data-photo="" unoptimized={media.authenticated && !media.sizedByRoute} loader={media.sizedByRoute ? listingPhotoLoader : undefined} src={media.url} alt={decorative ? '' : media.alt} fill sizes={sizes} priority={priority && !media.authenticated} fetchPriority={priority ? 'high' : undefined} loading={priority ? 'eager' : 'lazy'} className={contain ? 'object-contain' : 'object-cover'} />
      {media.isSample && <span className={cn('absolute left-2 top-2 rounded-sm bg-ink-900/85 font-semibold text-ink-inverse', compact ? 'px-1 py-0.5 text-(length:--text-overline)' : 'left-3 top-3 px-2 py-1 text-caption')}>{compact ? 'Sample' : 'Sample image — not a real property'}</span>}
    </>
  )
}

function Counter({ index, count }: { index: number; count: number }) {
  return <span className="absolute bottom-3 right-3 inline-flex min-h-8 items-center gap-1.5 rounded-full bg-ink-900/80 px-3 text-caption font-semibold text-ink-inverse tabular" aria-hidden><CameraIcon className="size-3.5" />{index + 1} / {count}</span>
}

/**
 * Previous / next. Over the inline frame they wait for a pointer that can
 * hover (`.gallery-nav`, app/globals.css) and appear on hover or keyboard
 * focus; on touch they are always there. `always` keeps them in view in the
 * full-screen viewer.
 */
function NavButton({ side, onClick, label, always }: { side: 'left' | 'right'; onClick: () => void; label: string; always?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={cn(
      'absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface-000/95 text-ink-900 shadow-e2 hover:bg-surface-000',
      !always && 'gallery-nav',
      side === 'left' ? 'left-3' : 'right-3',
    )}>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={side === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  )
}

function EmptyMedia({ title, overlay, bleed }: { title: string; overlay?: ReactNode; bleed?: boolean }) {
  return (
    <div className={cn('relative aspect-[4/3] overflow-hidden bg-media-ground lg:aspect-[16/10]', bleed ? '-mx-4 sm:mx-0 sm:rounded-lg' : 'w-full rounded-lg')}>
      <div role="img" aria-label={`${title} — the seller has not added photos`} className="absolute inset-0">
        <svg viewBox="0 0 120 90" className="size-full text-brand-600" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <rect width="120" height="90" className="fill-media-ground" />
          <rect x="14" y="30" width="26" height="60" fill="currentColor" opacity="0.16" />
          <rect x="44" y="16" width="32" height="74" fill="currentColor" opacity="0.26" />
          <rect x="80" y="40" width="28" height="50" fill="currentColor" opacity="0.12" />
          <rect x="50" y="26" width="6" height="6" className="fill-surface-000" opacity="0.5" />
          <rect x="62" y="26" width="6" height="6" className="fill-surface-000" opacity="0.5" />
          <rect x="50" y="40" width="6" height="6" className="fill-surface-000" opacity="0.5" />
          <rect x="62" y="40" width="6" height="6" className="fill-surface-000" opacity="0.5" />
        </svg>
        <p className="absolute bottom-3 left-3 rounded-full bg-surface-000/95 px-3 py-1.5 text-caption font-semibold text-ink-700 shadow-e1">The seller has not added photos yet</p>
      </div>
      {overlay && <div className="absolute right-3 top-3 z-10">{overlay}</div>}
    </div>
  )
}
