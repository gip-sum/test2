import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { prepareImage } from './image'
import { fileError, ORIGINAL_LIMIT, UPLOAD_LIMIT, validOrder } from './types'
const uuid = 'a9140f33-a429-46f3-9514-3e8f32f18189'
describe('photo validation', () => {
  it('rejects empty, large and unsupported originals', () => {
    expect(fileError({size:0,type:'image/jpeg'})).toMatch(/empty/)
    expect(fileError({size:ORIGINAL_LIMIT+1,type:'image/jpeg'})).toMatch(/20 MB/)
    expect(fileError({size:100,type:'image/svg+xml'})).toMatch(/JPEG/)
    expect(fileError({size:100,type:'image/webp'})).toBeNull()
  })
  it('rejects malformed and duplicate order IDs', () => {
    expect(validOrder([uuid])).toBe(true)
    expect(validOrder([uuid,uuid])).toBe(false)
    expect(validOrder(['../other'])).toBe(false)
    expect(validOrder(null)).toBe(false)
  })
  it('decodes pixels and strips original metadata', async () => {
    const source = await sharp({create:{width:2400,height:1600,channels:3,background:'#298456'}}).jpeg().withMetadata().toBuffer()
    const result = await prepareImage(source)
    const meta = await sharp(result.data).metadata()
    expect(result.width).toBe(1920); expect(result.height).toBe(1280)
    expect(meta.format).toBe('jpeg'); expect(meta.exif).toBeUndefined(); expect(meta.icc).toBeUndefined()
    expect(result.bytes).toBeLessThanOrEqual(UPLOAD_LIMIT)
  })
  it('rejects content masquerading as a photo', async () => {
    await expect(prepareImage(Buffer.from('<svg>not a photo</svg>'))).rejects.toThrow()
    await expect(prepareImage(Buffer.alloc(UPLOAD_LIMIT+1))).rejects.toThrow(/2 MB/)
  })
  it('rejects tiny and excessive-pixel sources', async () => {
    const tiny = await sharp({create:{width:200,height:400,channels:3,background:'#ffffff'}}).png().toBuffer()
    await expect(prepareImage(tiny)).rejects.toThrow(/320/)
    const huge = await sharp({create:{width:7000,height:7000,channels:3,background:'#ffffff'}}).png().toBuffer()
    await expect(prepareImage(huge)).rejects.toThrow()
  })
  it('flattens transparent PNG and handles WebP', async () => {
    for (const format of ['png','webp'] as const) {
      const source = await sharp({create:{width:400,height:400,channels:4,background:'#00000000'}}).toFormat(format).toBuffer()
      const result = await prepareImage(source)
      expect((await sharp(result.data).metadata()).hasAlpha).toBe(false)
    }
  })
})
