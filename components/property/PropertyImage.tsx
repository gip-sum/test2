'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/cn'

/**
 * Listing photo, with a deliberate empty state.
 *
 * Two modes, because the two card layouts need different sizing:
 *   'ratio' — reserves a 4:3 box. Used by the vertical card, and it is
 *             most of how CLS stays near zero on a page full of cards.
 *   'fill'  — fills a parent that already has a size. Used by the
 *             horizontal card, whose height is set by the text column.
 *
 * Combining the two (a 4:3 box told to be `h-full`) makes the image grow
 * wider as the text wraps, which squeezes and clips the content column.
 *
 * A listing with no photo is common and must not look broken: the
 * placeholder is a token-coloured architectural form that reads as "no
 * photo yet", never as a failed image.
 */
export function PropertyImage({
  src,
  alt,
  priority,
  sizes,
  mode = 'ratio',
  className,
  isSample,
  sampleTag = 'left',
}: {
  src: string | null | undefined
  alt: string
  priority?: boolean
  sizes: string
  mode?: 'ratio' | 'fill'
  className?: string
  isSample?: boolean
  /** Which bottom corner the "Sample" label takes — cards with a price chip over the photo need the other one. */
  sampleTag?: 'left' | 'right'
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  return (
    <div
      className={cn(
        'overflow-hidden bg-media-ground',
        mode === 'ratio' ? 'relative aspect-[4/3] w-full' : 'absolute inset-0',
        className,
      )}
    >
      {src && failedSrc !== src ? (
        <>
          <Image src={src} alt={alt} fill sizes={sizes} priority={priority} onError={() => setFailedSrc(src)} className="object-cover" />
          {isSample && <span className={cn('absolute bottom-2 rounded-sm bg-ink-900/85 px-1.5 py-0.5 text-caption font-semibold text-ink-inverse', sampleTag === 'right' ? 'right-2' : 'left-2')}>Sample</span>}
        </>
      ) : src ? (
        <div role="img" aria-label={`${alt} — image could not load`} className="absolute inset-0 grid place-items-center px-2 text-center text-caption text-ink-700">Image could not load</div>
      ) : (
        <Placeholder alt={alt} />
      )}
    </div>
  )
}

function Placeholder({ alt }: { alt: string }) {
  return (
    <div className="absolute inset-0">
      <svg
        viewBox="0 0 120 90"
        className="size-full text-brand-600"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`${alt} — no photo added yet`}
      >
        <rect width="120" height="90" className="fill-media-ground" />
        <rect x="14" y="30" width="26" height="60" fill="currentColor" opacity="0.16" />
        <rect x="44" y="16" width="32" height="74" fill="currentColor" opacity="0.26" />
        <rect x="80" y="40" width="28" height="50" fill="currentColor" opacity="0.12" />
        <rect x="50" y="26" width="6" height="6" className="fill-surface-000" opacity="0.5" />
        <rect x="62" y="26" width="6" height="6" className="fill-surface-000" opacity="0.5" />
        <rect x="50" y="40" width="6" height="6" className="fill-surface-000" opacity="0.5" />
        <rect x="62" y="40" width="6" height="6" className="fill-surface-000" opacity="0.5" />
      </svg>
      <span className="absolute bottom-1.5 left-1.5 rounded-sm bg-surface-000/85 px-1.5 py-0.5 text-caption text-ink-500">
        No photo yet
      </span>
    </div>
  )
}
