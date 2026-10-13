import { readSubmittedPhoto } from '@/lib/listings/queries'
import { DraftError,draftUser } from '@/lib/drafts/queries'
import { UUID } from '@/lib/media/types'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(_request:Request,{params}:{params:Promise<{id:string;photoId:string}>}){
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}
 try{const user=await draftUser(),{id,photoId}=await params;if(!UUID.test(id)||!UUID.test(photoId))return new Response(null,{status:404,headers});const r=await readSubmittedPhoto(user,id,photoId);return new Response(r.body,{headers:{...headers,'Content-Type':'image/jpeg'}})}
 catch(e){return new Response(null,{status:e instanceof DraftError?e.status:503,headers})}
}
