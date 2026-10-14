import 'server-only'
import { cookies } from 'next/headers'
import { createHash } from 'node:crypto'
import { ACCESS_COOKIE } from '@/lib/auth/session'
import { authConfig, type AuthUser } from '@/lib/auth/provider'
import { DraftError } from '@/lib/drafts/queries'
import { getPreview } from '@/lib/preview/queries'
import { listPhotos, readPhoto } from '@/lib/media/queries'
import { validateStoredPhoto } from './image'
import { UUID } from '@/lib/media/types'
import { canSubmit, effectiveStatus, publishedModel, submissionOf, type Listing, type ListingEvent, type ListingPhoto, type PublicSubmission, type PublicListingPhoto, type SubmissionSummary } from './types'
export function publishingConfigured(){return Boolean(authConfig()&&process.env.SUPABASE_SERVICE_ROLE_KEY)}
async function request(path:string,mode:'owner'|'public'|'service',method='GET',body?:BodyInit,contentType='application/json') {
 const config=authConfig(),token=mode==='service'?process.env.SUPABASE_SERVICE_ROLE_KEY:mode==='owner'?(await cookies()).get(ACCESS_COOKIE)?.value:config?.key
 if(!config||!token)throw new DraftError(mode==='service'?'Publishing is temporarily unavailable. Your draft is saved.':'Sign in to manage your listing.',mode==='owner'?401:503)
 try{return await fetch(config.base.replace(/\/auth\/v1$/,'')+path,{method,body,headers:{apikey:mode==='service'?token:config.key,...(mode==='owner'||!token.startsWith('sb_')?{Authorization:`Bearer ${token}`} : {}),'Content-Type':contentType,Prefer:'return=representation'},cache:'no-store',signal:AbortSignal.timeout(25000)})}
 catch{throw new DraftError('Listing storage could not be reached. Retry with the same action; your draft is unchanged.')}
}
async function photoBytes(response:Response):Promise<Buffer> {
 const reader=response.body?.getReader();if(!reader)throw new DraftError('A photo could not be read. Retry.',422)
 const chunks:Uint8Array[]=[];let size=0
 for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>2097152){await reader.cancel();throw new DraftError('Stored photo is too large. Upload it again.',422)}chunks.push(part.value)}
 return Buffer.concat(chunks)
}
async function rows<T>(path:string,mode:'owner'|'public'='owner'):Promise<T[]> {
 const r=await request('/rest/v1/'+path,mode)
 if(!r.ok)throw new DraftError('Listings could not be loaded. Please retry.')
 const data=await r.json();if(!Array.isArray(data))throw new DraftError('Listing storage returned an invalid response. Please retry.')
 return data as T[]
}
const ownerFilter=(user:AuthUser)=>`owner_id=eq.${encodeURIComponent(user.id)}`
export async function getListingForDraft(user:AuthUser,draftId:string){
 return (await rows<Listing>(`property_listings?${ownerFilter(user)}&draft_id=eq.${draftId}`))[0]??null
}
export async function listingHistory(user:AuthUser,listing:Listing):Promise<ListingEvent[]> {
 if(listing.owner_id!==user.id)throw new DraftError('Listing not found.',404)
 return rows<ListingEvent>(`property_listing_events?listing_id=eq.${listing.id}&order=id.desc&limit=100`)
}
function stableId(input:string){const h=createHash('sha256').update(input).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`}
export async function submitListing(user:AuthUser,draftId:string,signature:string,version:number) {
 const requestId=stableId(`submission:${user.id}:${draftId}:${signature}:${version}`)
 // Read only the caller's identity first; privileged credentials never discover foreign drafts.
 const listing=await getListingForDraft(user,draftId)
 if(listing?.current_submission_id===requestId)return listing // Lost response: never re-open a later review decision.
 const current=await getPreview(user,draftId)
 if(!current.confirmed||current.signature!==signature)throw new DraftError('Review the current property preview and confirm it before submitting.',409)
 if(!current.model.canConfirm)throw new DraftError('Complete the missing property information.',422)
 if((listing?.version??0)!==version||!canSubmit(listing?effectiveStatus(listing):'DRAFT'))throw new DraftError('Listing status changed. Reload before submitting.',409)
 if(!publishingConfigured())throw new DraftError('Publishing is temporarily unavailable. Your draft is saved.')
 const photos=await listPhotos(user,current.draft.collection_id),manifest:ListingPhoto[]=[]
 for(const photo of photos){
  const expected=photo as typeof photo & {sha256:string}
  const response=await readPhoto(user,photo.id)
  // Bound the actual download rather than trusting storage Content-Length.
  const bytes=await photoBytes(response)
  try{await validateStoredPhoto(bytes,expected)}catch{throw new DraftError('A stored photo failed validation. Upload and review it again.',422)}
  const path=`${requestId}/${photo.id}.jpg`
  const copied=await request(`/storage/v1/object/listing-photos/${path}`,'service','POST',new Uint8Array(bytes),'image/jpeg')
  if(!copied.ok&&![400,409].includes(copied.status))throw new DraftError('Could not copy a photo for review. Retry with the same submission.')
  if([400,409].includes(copied.status)){
   const stored=await request(`/storage/v1/object/authenticated/listing-photos/${path}`,'service')
   if(!stored.ok||stored.headers.get('content-length')&&Number(stored.headers.get('content-length'))>2097152)throw new DraftError('Existing submission photo could not be checked. Reload before submitting.',409)
   const existing=await photoBytes(stored)
   try{await validateStoredPhoto(new Uint8Array(existing),expected)}catch{throw new DraftError('This submission already has a different photo. Reload and submit again.',409)}
  }
  manifest.push({id:photo.id,source_id:photo.id,submission_id:requestId,object_path:path,position:photo.position,width:photo.width,height:photo.height,bytes:photo.bytes,sha256:expected.sha256})
 }
 const after=await getPreview(user,draftId)
 if(!after.confirmed||after.signature!==signature)throw new DraftError('Your property changed during submission. Reload and review it again.',409)
 const r=await request('/rest/v1/rpc/submit_property_listing','service','POST',JSON.stringify({p_owner:user.id,p_draft:draftId,p_listing:listing?.id??stableId('gharbazaar-listing:'+draftId),p_request:requestId,p_version:version,p_snapshot:submissionOf(after.model,after.draft.revision,signature),p_photos:manifest}))
 if(!r.ok)throw new DraftError(r.status===409||r.status===400?'Listing changed. Reload and check its status before retrying.':'Submission could not be confirmed. Retry with the same submission.',r.status===409||r.status===400?409:503)
 const raw=await r.json(),result=(Array.isArray(raw)?raw.length===1?raw[0]:null:raw) as Listing|null
 if(!result||result.owner_id!==user.id||result.draft_id!==draftId||!Number.isSafeInteger(result.version))throw new DraftError('Submission confirmation was invalid.')
 return result
}
export async function changeListing(user:AuthUser,draftId:string,action:'withdraw'|'delete',version:number) {
 const listing=await getListingForDraft(user,draftId)
 if(!listing)throw new DraftError('Listing not found.',404)
 if(action==='delete'&&listing.status==='DELETED'||action==='withdraw'&&listing.status==='DRAFT')return listing
 const r=await request('/rest/v1/rpc/change_property_listing','service','POST',JSON.stringify({p_owner:user.id,p_listing:listing.id,p_version:version,p_action:action}))
 if(!r.ok)throw new DraftError('Listing changed or the action could not be saved. Reload before trying again.',r.status===400||r.status===409?409:503)
 const raw=await r.json(),result=(Array.isArray(raw)?raw.length===1?raw[0]:null:raw) as Listing|null
 if(!result||result.owner_id!==user.id||result.draft_id!==draftId)throw new DraftError('Listing confirmation was invalid.')
 return result
}
const publicSubmissionFields='id,listing_id,title,seller_name,seller_type,intent,property_type,bedrooms,bathrooms,area_unit,carpet_area,built_up_area,super_area,furnishing,floor,total_floors,construction_status,age_years,possession_by,available_from,city_name,locality_name,city_id,locality_id,sub_locality_id,society_name,address,latitude,longitude,price,deposit,maintenance_status,maintenance_monthly,negotiable,created_at'
export async function getPublishedListing(id:string){
 if(!authConfig())return null
 const listing=(await rows<Pick<Listing,'id'|'status'|'current_submission_id'|'activated_at'|'expires_at'>>(`property_listings?id=eq.${id}&select=id,status,current_submission_id,activated_at,expires_at`,'public'))[0]
 if(!listing||effectiveStatus(listing)!=='ACTIVE')return null
 const [submissions,photos]=await Promise.all([rows<PublicSubmission>(`property_listing_submissions?id=eq.${listing.current_submission_id}&select=${publicSubmissionFields}`,'public'),rows<PublicListingPhoto>(`property_listing_photos?submission_id=eq.${listing.current_submission_id}&select=id,submission_id,object_path,position,width,height,bytes&order=position`,'public')])
 const submission=submissions[0];if(!submission)return null
 return {listing,submission,photos,model:publishedModel(submission,photos,id)}
}
export async function readPublishedPhoto(id:string,photoId:string){
 const current=await getPublishedListing(id),photo=current?.photos.find(p=>p.id===photoId)
 if(!photo)throw new DraftError('Photo not found.',404)
 const r=await request(`/storage/v1/object/authenticated/listing-photos/${photo.object_path}`,'public')
 if(!r.ok)throw new DraftError('Photo not found.',r.status===404||r.status===403?404:503)
 return r
}

async function ownerSubmission(user:AuthUser,listing:Listing){
 if(listing.owner_id!==user.id||!listing.current_submission_id||listing.status==='DELETED')throw new DraftError('Submitted copy not found.',404)
 const [submissions,photos]=await Promise.all([rows<PublicSubmission>(`property_listing_submissions?id=eq.${listing.current_submission_id}&select=${publicSubmissionFields}`),rows<PublicListingPhoto>(`property_listing_photos?submission_id=eq.${listing.current_submission_id}&select=id,submission_id,object_path,position,width,height,bytes&order=position`)])
 const submission=submissions[0];if(!submission)throw new DraftError('Submitted copy not found.',404)
 const model=publishedModel(submission,photos,listing.id)
 model.media=model.media.map(p=>({...p,url:`/api/posting/submissions/${listing.id}/photos/${p.id}`}))
 return {listing,submission,photos,model}
}
export async function getSubmittedCopy(user:AuthUser,draftId:string){
 const listing=await getListingForDraft(user,draftId)
 if(!listing)throw new DraftError('Submitted copy not found.',404)
 return ownerSubmission(user,listing)
}
export async function readSubmittedPhoto(user:AuthUser,id:string,photoId:string){
 const listing=(await rows<Listing>(`property_listings?${ownerFilter(user)}&id=eq.${id}`))[0]
 if(!listing)throw new DraftError('Photo not found.',404)
 const result=await ownerSubmission(user,listing),photo=result.photos.find(p=>p.id===photoId)
 if(!photo)throw new DraftError('Photo not found.',404)
 const r=await request(`/storage/v1/object/authenticated/listing-photos/${photo.object_path}`,'owner')
 if(!r.ok)throw new DraftError('Photo could not be loaded.',r.status===404||r.status===403?404:503)
 return r
}

// ── Seller dashboard reads (Phase 19) ────────────────────────────────────
// Owner session only: row policies scope every read, and the service key is
// never used to discover what a seller owns.
const ids=(values:readonly string[])=>{const valid=values.filter(v=>UUID.test(v));return valid.length?`(${valid.join(',')})`:null}
export async function listOwnerListings(user:AuthUser){
 // One listing per draft and at most 50 drafts per account, so 100 is never reached.
 return rows<Listing>(`property_listings?${ownerFilter(user)}&order=updated_at.desc&limit=100`)
}
/** Latest-first DRAFT transitions, from which "Withdrawn" is derived. */
export async function listDraftEvents(user:AuthUser,listingIds:readonly string[]){
 const list=ids(listingIds);if(!list)return []
 return rows<Pick<ListingEvent,'listing_id'|'from_status'|'to_status'|'created_at'>>(`property_listing_events?listing_id=in.${list}&to_status=eq.DRAFT&select=listing_id,from_status,to_status,created_at&order=id.desc&limit=500`)
}
export async function listSubmissionSummaries(user:AuthUser,submissionIds:readonly string[]){
 const list=ids(submissionIds);if(!list)return []
 return rows<SubmissionSummary>(`property_listing_submissions?id=in.${list}&select=id,listing_id,title,intent,price,city_name,locality_name`)
}
/** Whether the signed-in user owns this listing; false on any failure, so the buyer form is the default. */
export async function ownsListing(user:AuthUser,id:string){
 if(!UUID.test(id))return false
 try{return (await rows<Pick<Listing,'id'>>(`property_listings?${ownerFilter(user)}&id=eq.${id}&select=id`)).length===1}catch{return false}
}

/**
 * What a buyer's saved list shows of real listings (Phase 20): only those
 * that are public right now, read with the publishable key under the public
 * row policies. An id missing from the result is no longer public, which the
 * caller says in words rather than dropping the save.
 */
export async function getPublishedSummaries(listingIds:readonly string[]):Promise<Map<string,SubmissionSummary>>{
 const list=ids(listingIds);if(!list||!authConfig())return new Map()
 const listings=(await rows<Pick<Listing,'id'|'status'|'current_submission_id'|'expires_at'>>(`property_listings?id=in.${list}&select=id,status,current_submission_id,expires_at`,'public')).filter(l=>effectiveStatus(l)==='ACTIVE'&&l.current_submission_id)
 const current=ids(listings.map(l=>l.current_submission_id!));if(!current)return new Map()
 const submissions=await rows<SubmissionSummary>(`property_listing_submissions?id=in.${current}&select=id,listing_id,title,intent,price,city_name,locality_name`,'public')
 return new Map(submissions.filter(s=>listings.some(l=>l.id===s.listing_id&&l.current_submission_id===s.id)).map(s=>[s.listing_id,s]))
}
