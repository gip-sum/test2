import type { SyntheticEvent } from 'react'

/**
 * Progressive photo fade-in (UI-04). Pass as `ref` and `onLoad` to an image.
 *
 * The fade is an enhancement layered on after hydration, never a gate:
 *  - Server HTML has no mark, so without JavaScript, or before it runs on a
 *    slow phone, a photo shows the moment it loads.
 *  - When React attaches, an image that is still loading is marked pending
 *    (transparent inside its already reserved box — the box never changes
 *    size) and fades in when it arrives. An image that already loaded is left
 *    alone, so nothing visible ever blinks out.
 *  - A failed load never fades in; the caller's error state replaces it.
 * The CSS lives with the motion layer in app/globals.css (img[data-fade]).
 */
export function markPendingImage(img: HTMLImageElement | null) {
  if (img && !img.complete) img.dataset.fade = 'pending'
}

export function revealImage(event: SyntheticEvent<HTMLImageElement> | { currentTarget: HTMLImageElement }) {
  const img = event.currentTarget
  if (img.dataset.fade === 'pending') img.dataset.fade = 'in'
}

/**
 * A photo's ref that also reports failure (UI-22), in place of next/image's
 * `onError`. With `onError` set, next/image re-assigns `img.src` after
 * hydration so that an error raised before React attached is not lost —
 * which restarts the request. For a cacheable photo the cache absorbs it;
 * an access-checked photo answers `no-store`, so every one of them was
 * downloaded twice. This checks for an image that already failed, then
 * listens for a later failure, and never touches `src`.
 */
export function photoRef(onFail: () => void) {
  return (img: HTMLImageElement | null) => {
    if (!img) return
    markPendingImage(img)
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) { onFail(); return }
    img.addEventListener('error', onFail)
    return () => img.removeEventListener('error', onFail)
  }
}
