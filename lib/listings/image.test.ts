import { it,expect } from 'vitest'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { validateStoredPhoto } from './image'
const bytes=await sharp({create:{width:640,height:480,channels:3,background:'#557755'}}).jpeg().toBuffer()
const expected={width:640,height:480,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}
it('validates the actual JPEG including full decode',async()=>{await expect(validateStoredPhoto(bytes,expected)).resolves.toBeUndefined()})
it('rejects hash, dimension and length mismatches',async()=>{for(const override of [{sha256:'a'.repeat(64)},{width:800},{bytes:1}])await expect(validateStoredPhoto(bytes,{...expected,...override})).rejects.toThrow()})
it('does not trust a hash for corrupt content',async()=>{const b=Buffer.from('not a photo');await expect(validateStoredPhoto(b,{...expected,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')})).rejects.toThrow()})
it('rejects EXIF rather than publishing location metadata',async()=>{const b=await sharp(bytes).withExif({IFD0:{Copyright:'private'}}).jpeg().toBuffer();await expect(validateStoredPhoto(b,{...expected,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')})).rejects.toThrow()})
