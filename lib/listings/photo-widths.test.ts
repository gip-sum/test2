import { it, expect } from 'vitest'
import config from '../../next.config'
import { LISTING_PHOTO_WIDTHS, listingPhotoLoader, listingPhotoSrcSet, listingPhotoWidth } from './photo-widths'

it('offers exactly the widths next/image requests, so no srcset entry is refused', () => {
  const requested = [...new Set([...(config.images?.deviceSizes ?? []), ...(config.images?.imageSizes ?? [])])].sort((a, b) => a - b)
  expect([...LISTING_PHOTO_WIDTHS].sort((a, b) => a - b)).toEqual(requested)
})
it('reads only an offered width; absent means the original', () => {
  expect(listingPhotoWidth(null)).toBeNull()
  expect(listingPhotoWidth('320')).toBe(320)
  for (const bad of ['', '321', '3200', '320.0', '0320', '-96', 'abc']) expect(listingPhotoWidth(bad)).toBeUndefined()
})
it('asks the route itself, never the shared optimizer, keeping any query it already takes', () => {
  expect(listingPhotoLoader({ src: '/api/listings/l/photos/p', width: 320 })).toBe('/api/listings/l/photos/p?w=320')
  expect(listingPhotoLoader({ src: '/api/admin/moderation/l/photos/p?submission=s', width: 320 })).toBe('/api/admin/moderation/l/photos/p?submission=s&w=320')
})
it('builds a plain <img> srcset from the same URLs', () => {
  expect(listingPhotoSrcSet('/api/posting/photos/p', [96, 320])).toBe('/api/posting/photos/p?w=96 96w, /api/posting/photos/p?w=320 320w')
})
