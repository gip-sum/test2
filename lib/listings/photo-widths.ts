/**
 * The widths the listing photo routes resize to (UI-19; the private routes
 * since UI-22), and the next/image loader that asks them for them.
 *
 * Every one of those routes checks access on every request — the listing
 * is still public, the viewer owns the draft or submission, the viewer is
 * staff — and answers `private, no-store`, resized copies included. Through the shared image optimizer the resized copy
 * would be cached and served publicly for hours — a withdrawn listing's
 * photos, or one removed in moderation, would outlive it. So a card that
 * needs a small photo asks the route itself (`?w=`), and next/image builds
 * the same responsive srcset with this loader instead of /_next/image.
 *
 * The list is next.config's deviceSizes and imageSizes together (the only
 * widths next/image ever requests); photo-widths.test.ts keeps them equal.
 */
export const LISTING_PHOTO_WIDTHS: readonly number[] = [96, 160, 200, 256, 320, 390, 412, 480, 640, 768, 1024, 1280, 1440]

/** null when no width was asked for (the original), undefined when one was asked for that is not offered. */
export function listingPhotoWidth(value: string | null): number | null | undefined {
  if (value === null) return null
  const width = Number(value)
  return LISTING_PHOTO_WIDTHS.includes(width) && String(width) === value ? width : undefined
}

/** Appends `w` to whatever the route already takes (the admin route's `?submission=`). */
export function listingPhotoLoader({ src, width }: { src: string; width: number }) {
  return `${src}${src.includes('?') ? '&' : '?'}w=${width}`
}

/** A srcset for a plain <img> on one of those routes, for the few slots that are not next/image. */
export function listingPhotoSrcSet(src: string, widths: readonly number[]) {
  return widths.map((width) => `${listingPhotoLoader({ src, width })} ${width}w`).join(', ')
}
