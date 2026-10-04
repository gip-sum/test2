import sharp from 'sharp'
import { PIXEL_LIMIT, UPLOAD_LIMIT } from './types'

/** Decode pixels, not extensions or claimed MIME; never preserve EXIF/GPS. */
export async function prepareImage(input: Uint8Array) {
  if (!input.length || input.length > UPLOAD_LIMIT) throw new Error('Upload must be between 1 byte and 2 MB.')
  const image = sharp(input, { limitInputPixels: PIXEL_LIMIT, failOn: 'warning' })
  const metadata = await image.metadata()
  if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) !== 1) throw new Error('Choose a still JPEG, PNG or WebP photo.')
  if (!metadata.width || !metadata.height || Math.min(metadata.width, metadata.height) < 320) throw new Error('Photos must be at least 320 pixels on each side.')
  const { data, info } = await image.rotate().resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true })
  if (Math.min(info.width, info.height) < 320) throw new Error('This image is too narrow after resizing. Choose a less panoramic photo.')
  if (data.length > UPLOAD_LIMIT) throw new Error('This photo is too detailed to fit. Choose a smaller image.')
  return { data, width: info.width, height: info.height, bytes: data.length }
}
