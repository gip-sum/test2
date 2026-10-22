import { readPublishedPhoto } from '@/lib/listings/queries'
import { DraftError } from '@/lib/drafts/queries'
import { UUID } from '@/lib/media/types'
import { resizeListingPhoto } from '@/lib/listings/image'
import { listingPhotoWidth } from '@/lib/listings/photo-widths'
export const runtime='nodejs'
export const dynamic='force-dynamic'
// `?w=` resizes here, after the per-request check and still no-store, so a
// card's small photo never enters the shared optimizer's cache (UI-19,
// lib/listings/photo-widths).
export async function GET(request:Request,{params}:{params:Promise<{id:string;photoId:string}>}){
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}
 try{const {id,photoId}=await params,width=listingPhotoWidth(new URL(request.url).searchParams.get('w'));if(!UUID.test(id)||!UUID.test(photoId)||width===undefined)return new Response(null,{status:404,headers});const r=await readPublishedPhoto(id,photoId);const body=width?await resizeListingPhoto(new Uint8Array(await r.arrayBuffer()),width):r.body;return new Response(body as BodyInit,{headers:{...headers,'Content-Type':'image/jpeg','Content-Disposition':'inline; filename="property-photo.jpg"'}})}
 catch(e){return new Response(null,{status:e instanceof DraftError?e.status:503,headers})}
}
