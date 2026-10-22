import { it, expect } from 'vitest'
import config from '../../next.config'
import { LISTING_PHOTO_WIDTHS, listingPhotoLoader, listingPhotoWidth } from './photo-widths'

it('offers exactly the widths next/image requests, so no srcset entry is refused', () => {
  const requested = [...new Set([...(config.images?.deviceSizes ?? []), ...(config.images?.imageSizes ?? [])])].sort((a, b) => a - b)
  expect([...LISTING_PHOTO_WIDTHS].sort((a, b) => a - b)).toEqual(requested)
})
it('reads only an offered width; absent means the original', () => {
  expect(listingPhotoWidth(null)).toBeNull()
  expect(listingPhotoWidth('320')).toBe(320)
  for (const bad of ['', '321', '3200', '320.0', '0320', '-96', 'abc']) expect(listingPhotoWidth(bad)).toBeUndefined()
})
it('asks the route itself, never the shared optimizer', () => {
  expect(listingPhotoLoader({ src: '/api/listings/l/photos/p', width: 320 })).toBe('/api/listings/l/photos/p?w=320')
})
