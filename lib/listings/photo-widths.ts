/**
 * The widths the public listing photo route resizes to (UI-19), and the
 * next/image loader that asks it for them.
 *
 * That route checks on every request that the listing is still public and
 * answers `no-store`. Through the shared image optimizer the resized copy
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

export function listingPhotoLoader({ src, width }: { src: string; width: number }) {
  return `${src}?w=${width}`
}
