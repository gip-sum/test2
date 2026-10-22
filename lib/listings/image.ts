import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { PIXEL_LIMIT, UPLOAD_LIMIT } from '@/lib/media/types'
/** A listing photo at a card's width (UI-19): never enlarged, re-encoded without metadata. */
export async function resizeListingPhoto(data:Uint8Array,width:number):Promise<Uint8Array> {
 return sharp(data,{limitInputPixels:PIXEL_LIMIT}).resize({width,withoutEnlargement:true}).jpeg({quality:75,mozjpeg:true}).toBuffer()
}
export async function validateStoredPhoto(data:Uint8Array,expected:{width:number;height:number;bytes:number;sha256:string}) {
 if(!data.length||data.length>UPLOAD_LIMIT||data.length!==expected.bytes||createHash('sha256').update(data).digest('hex')!==expected.sha256)throw Error('Photo bytes changed. Upload and review the photo again.')
 const image=sharp(data,{limitInputPixels:PIXEL_LIMIT,failOn:'warning'}),meta=await image.metadata()
 if(meta.format!=='jpeg'||(meta.pages??1)!==1||meta.width!==expected.width||meta.height!==expected.height||meta.exif||meta.xmp||meta.iptc||meta.icc||!meta.width||!meta.height||Math.min(meta.width,meta.height)<320||Math.max(meta.width,meta.height)>1920)throw Error('Stored photo is invalid. Upload and review it again.')
 await image.raw().toBuffer() // Decode the complete file; metadata alone accepts truncated JPEGs.
}
