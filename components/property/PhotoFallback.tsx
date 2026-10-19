import { ImageOffIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

/**
 * A listing photo that failed to load (UI-16) — one look for the gallery,
 * the listing cards and the seller's photo manager.
 *
 * It fills the box the photo reserved, so nothing collapses and every
 * control laid over the photo (arrows, counter, full screen, save) stays
 * where it was. The faint street is the "no photo yet" placeholder's own
 * architecture at a quarter of its strength, so a failure reads as part of
 * the product, and the slashed frame and the words say it is a failure,
 * not a listing without photos. One `role="img"` carries the photo's own
 * description plus what happened; the drawing inside is decorative.
 *
 * `size` follows the box: `full` for a gallery frame or a card, `compact`
 * for a preview tile (icon and short words), `icon` for a thumbnail.
 *
 * A server component, so it costs no client JavaScript where it is used
 * from a server tree; the client callers already ship it.
 */
export function PhotoFallback({
  alt,
  size = 'full',
  tone = 'light',
  hint,
  className,
}: {
  alt: string
  size?: 'full' | 'compact' | 'icon'
  /** `dark` in the full-screen viewer, whose ground is ink. */
  tone?: 'light' | 'dark'
  /** One short line under the words, in the gallery frame only. */
  hint?: string
  className?: string
}) {
  const dark = tone === 'dark'
  return (
    <div
      role="img"
      aria-label={`${alt} — image could not load`}
      data-photo-fallback=""
      className={cn('absolute inset-0 grid place-items-center overflow-hidden', dark ? 'bg-ink-900' : 'bg-media-ground', className)}
    >
      <svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMax slice" className={cn('absolute inset-0 size-full', dark ? 'text-ink-inverse opacity-[0.06]' : 'text-brand-600 opacity-25')} aria-hidden>
        <rect x="14" y="30" width="26" height="60" fill="currentColor" opacity="0.16" />
        <rect x="44" y="16" width="32" height="74" fill="currentColor" opacity="0.26" />
        <rect x="80" y="40" width="28" height="50" fill="currentColor" opacity="0.12" />
      </svg>
      <span className={cn('relative flex flex-col items-center text-center', size === 'full' ? 'gap-2 px-4' : 'gap-1 px-1')}>
        <span className={cn(
          'grid place-items-center rounded-full',
          dark ? 'bg-ink-inverse/10 text-ink-inverse' : 'bg-surface-000 text-brand-700 shadow-e1',
          size === 'full' ? 'size-12' : size === 'compact' ? 'size-9' : 'size-7',
        )}>
          <ImageOffIcon className={size === 'full' ? 'size-6' : size === 'compact' ? 'size-4.5' : 'size-4'} />
        </span>
        {size !== 'icon' && (
          <span className={cn(size === 'full' ? 'text-label' : 'text-caption font-semibold', dark ? 'text-ink-inverse' : 'text-ink-900')}>
            Image could not load
          </span>
        )}
        {size === 'full' && hint && <span className={cn('max-w-64 text-caption', dark ? 'text-ink-inverse/75' : 'text-ink-700')}>{hint}</span>}
      </span>
    </div>
  )
}
