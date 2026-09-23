'use client'

import * as Dialog from '@radix-ui/react-dialog'
import Image from 'next/image'
import { useRef, useState, type TouchEvent } from 'react'
import { cn } from '@/lib/cn'
import type { PropertyMedia } from '@/lib/property/types'

export function swipeDirection(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.3) return 0
  return dx < 0 ? 1 : -1
}

export function Gallery({ photos, title }: { photos: PropertyMedia[]; title: string }) {
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState<Set<string>>(() => new Set())
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const usable = photos.filter((photo) => Boolean(photo.url))
  const count = usable.length
  const multi = count > 1

  const go = (delta: number) => setIndex((current) => (current + delta + count) % count)
  const select = (next: number) => setIndex(next)
  const markFailed = (id: string) => setFailed((current) => new Set(current).add(id))
  const show = (next: number, trigger: HTMLButtonElement) => {
    select(next)
    opener.current = trigger
    setOpen(true)
  }
  const touch = {
    onTouchStart: (event: TouchEvent) => {
      const point = event.touches[0]
      if (point) touchStart.current = { x: point.clientX, y: point.clientY }
    },
    onTouchEnd: (event: TouchEvent) => {
      const start = touchStart.current
      const end = event.changedTouches[0]
      touchStart.current = null
      if (!start || !end || !multi) return
      const direction = swipeDirection(end.clientX - start.x, end.clientY - start.y)
      if (direction) go(direction)
    },
    onTouchCancel: () => { touchStart.current = null },
  }

  if (!count) return <EmptyMedia title={title} />
  const current = usable[Math.min(index, count - 1)]!

  return (
    <section aria-label="Property photos" className="min-w-0">
      <div className={cn('min-w-0', count >= 5 && 'lg:grid lg:grid-cols-[2fr_1fr] lg:gap-2')}>
        <div
          role={multi ? 'group' : undefined}
          aria-roledescription={multi ? 'carousel' : undefined}
          aria-label={multi ? `Photos of ${title}` : undefined}
          tabIndex={multi ? 0 : -1}
          onKeyDown={(event) => {
            if (!multi) return
            if (event.key === 'ArrowRight') { event.preventDefault(); go(1) }
            if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1) }
          }}
          {...touch}
          className="relative aspect-[4/3] min-w-0 touch-pan-y overflow-hidden rounded-lg bg-media-ground lg:aspect-[16/10]"
        >
          <MediaPhoto media={current} failed={failed.has(current.id)} onError={() => markFailed(current.id)} sizes="(min-width: 1024px) 760px, (min-width: 768px) 768px, 100vw" priority={index === 0} />
          <button
            type="button"
            onClick={(event) => show(index, event.currentTarget)}
            aria-label="View full-screen gallery"
            className="absolute right-3 top-3 z-10 min-h-11 rounded-md bg-surface-000/95 px-3 text-label text-ink-900 shadow-e2 hover:bg-surface-000"
          >
            View photos
          </button>
          {multi && (
            <>
              <NavButton side="left" onClick={() => go(-1)} label="Previous photo" />
              <NavButton side="right" onClick={() => go(1)} label="Next photo" />
              <Counter index={index} count={count} />
            </>
          )}
        </div>
        {count >= 5 && (
          <div className="hidden min-h-0 grid-cols-2 grid-rows-2 gap-2 lg:grid" aria-label="Photo previews">
            {usable.slice(1, 5).map((photo, offset) => (
              <button
                key={photo.id}
                type="button"
                onClick={(event) => show(offset + 1, event.currentTarget)}
                aria-label={`View photo ${offset + 2} of ${count} full screen`}
                className="relative min-h-0 min-w-0 overflow-hidden rounded-md bg-media-ground text-ink-inverse focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <MediaPhoto media={photo} failed={failed.has(photo.id)} onError={() => markFailed(photo.id)} sizes="(min-width: 1024px) 190px, 1px" compact />
                {offset === 3 && count > 5 && <span className="absolute inset-0 grid place-items-center bg-ink-900/70 px-2 text-center text-label font-semibold text-ink-inverse">View all {count} photos</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {multi ? `Image ${index + 1} of ${count}. ${current.alt}` : current.alt}
      </p>
      {multi && (
        <ul aria-label="Choose a photo" className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {usable.map((photo, position) => (
            <li key={photo.id} className="shrink-0">
              <button
                type="button"
                onClick={() => select(position)}
                aria-label={`Show photo ${position + 1} of ${count}`}
                aria-current={position === index ? 'true' : undefined}
                className={cn('relative block h-16 w-22 overflow-hidden rounded-md border-2 transition-colors', position === index ? 'border-brand-600' : 'border-transparent hover:border-border-strong')}
              >
                <MediaPhoto media={photo} failed={failed.has(photo.id)} onError={() => markFailed(photo.id)} sizes="88px" compact decorative />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-overlay" />
          <Dialog.Content
            onCloseAutoFocus={(event) => { event.preventDefault(); opener.current?.focus() }}
            onKeyDown={(event) => {
              if (!multi) return
              if (event.key === 'ArrowRight') { event.preventDefault(); go(1) }
              if (event.key === 'ArrowLeft') { event.preventDefault(); go(-1) }
            }}
            className="fixed inset-0 z-[61] flex flex-col bg-ink-900 text-ink-inverse"
          >
            <header className="flex min-h-16 items-center gap-3 px-4 pb-2" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}>
              <Dialog.Title className="flex-1 truncate font-display text-heading-3">{title}</Dialog.Title>
              <span className="text-label tabular" aria-hidden>{multi ? `${index + 1} / ${count}` : 'Photo'}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close gallery" className="grid size-11 shrink-0 place-items-center rounded-md hover:bg-ink-inverse/10">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </header>
            <Dialog.Description className="sr-only">Property photos. Use arrow keys or swipe to change image; Escape closes the gallery.</Dialog.Description>
            <div className="relative min-h-0 flex-1 touch-pan-y" {...touch}>
              <MediaPhoto media={current} failed={failed.has(current.id)} onError={() => markFailed(current.id)} sizes="100vw" contain priority />
              {multi && (
                <>
                  <NavButton side="left" onClick={() => go(-1)} label="Previous full-screen photo" />
                  <NavButton side="right" onClick={() => go(1)} label="Next full-screen photo" />
                </>
              )}
            </div>
            <p role="status" aria-live="polite" className="sr-only">{multi ? `Full screen image ${index + 1} of ${count}. ${current.alt}` : current.alt}</p>
            {multi && (
              <ul aria-label="Choose a full-screen photo" className="flex gap-2 overflow-x-auto px-4 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}>
                {usable.map((photo, position) => (
                  <li key={photo.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => select(position)}
                      aria-label={`View full-screen photo ${position + 1} of ${count}`}
                      aria-current={position === index ? 'true' : undefined}
                      className={cn('relative block h-14 w-18 overflow-hidden rounded-md border-2', position === index ? 'border-ink-inverse' : 'border-transparent')}
                    >
                      <MediaPhoto media={photo} failed={failed.has(photo.id)} onError={() => markFailed(photo.id)} sizes="72px" compact decorative />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}

function MediaPhoto({ media, failed, onError, sizes, priority, compact, contain, decorative }: {
  media: PropertyMedia
  failed: boolean
  onError: () => void
  sizes: string
  priority?: boolean
  compact?: boolean
  contain?: boolean
  decorative?: boolean
}) {
  if (!media.url || failed) {
    return <div role="img" aria-label={`${media.alt} — image could not load`} className="absolute inset-0 grid place-items-center bg-media-ground px-2 text-center text-caption text-ink-700">Image could not load</div>
  }
  return (
    <>
      <Image src={media.url} alt={decorative ? '' : media.alt} fill sizes={sizes} priority={priority} loading={priority ? 'eager' : 'lazy'} onError={onError} className={contain ? 'object-contain' : 'object-cover'} />
      {media.isSample && <span className={cn('absolute left-2 top-2 rounded-sm bg-ink-900/85 font-semibold text-ink-inverse', compact ? 'px-1 py-0.5 text-[10px]' : 'px-2 py-1 text-caption')}>{compact ? 'Sample' : 'Sample image — not a real property'}</span>}
    </>
  )
}

function Counter({ index, count }: { index: number; count: number }) {
  return <span className="absolute bottom-3 right-3 rounded-full bg-ink-900/85 px-2.5 py-1 text-caption font-semibold text-ink-inverse tabular">{index + 1} / {count}</span>
}

function NavButton({ side, onClick, label }: { side: 'left' | 'right'; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={cn(
      'absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface-000/95 text-ink-900 shadow-e2 hover:bg-surface-000',
      side === 'left' ? 'left-3' : 'right-3',
    )}>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={side === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  )
}

function EmptyMedia({ title }: { title: string }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-media-ground lg:aspect-[16/10]" role="img" aria-label={`${title} — the seller has not added photos`}>
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
      <p className="absolute bottom-3 left-3 rounded-sm bg-surface-000/90 px-2 py-1 text-caption text-ink-700">The seller has not added photos yet</p>
    </div>
  )
}
