import { fileError, PIXEL_LIMIT, UPLOAD_LIMIT } from './types'

export async function compressPhoto(file: File): Promise<Blob> {
  const error = fileError(file)
  if (error) throw new Error(error)
  // Reject animation before canvas flattens it into an apparently still photo.
  const bytes = new Uint8Array(await file.arrayBuffer())
  const text = (start: number, count: number) => String.fromCharCode(...bytes.slice(start, start + count))
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const png = bytes[0] === 0x89 && text(1, 3) === 'PNG' && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10
  const webp = text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP'
  if (!(file.type === 'image/jpeg' && jpeg || file.type === 'image/png' && png || file.type === 'image/webp' && webp)) throw new Error('File contents do not match its photo format. Export a fresh JPEG, PNG or WebP.')
  const view = new DataView(bytes.buffer)
  for (let offset = png ? 8 : 12; (png || webp) && offset + 8 <= bytes.length;) {
    const length = view.getUint32(png ? offset : offset + 4, webp)
    const kind = text(png ? offset + 4 : offset, 4)
    if (kind === 'acTL' || kind === 'ANIM') throw new Error('Animated images are not supported.')
    offset += png ? length + 12 : length + 8 + (length % 2)
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => { throw new Error('This photo could not be opened. Try a JPEG, PNG or WebP export.') })
  try {
    if (bitmap.width * bitmap.height > PIXEL_LIMIT || Math.min(bitmap.width, bitmap.height) < 320) throw new Error('Choose a photo at least 320 pixels on each side and no more than 40 megapixels.')
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Your browser cannot prepare this photo.')
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
      if (blob && blob.size <= UPLOAD_LIMIT) return blob
    }
    throw new Error('This photo is too large after compression. Choose a smaller image.')
  } finally { bitmap.close() }
}
