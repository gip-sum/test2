import 'server-only'
import { createHash } from 'node:crypto'
import { cookies } from 'next/headers'
import { ACCESS_COOKIE } from '@/lib/auth/session'
import { authConfig, type AuthUser } from '@/lib/auth/provider'
import { getDraft, DraftError } from '@/lib/drafts/queries'
import { listPhotos } from '@/lib/media/queries'
import { getBuyerProfile } from '@/lib/account/queries'
import { getPostingLocations } from '@/lib/location/queries'
import { kolkataToday } from '@/lib/posting/details'
import { buildPreview } from './model'
export type DraftReview = { draft_id:string; draft_revision:number; content_hash:string; confirmed_at:string }
async function request(user: AuthUser, id: string, body?: object) {
  const config=authConfig(), token=(await cookies()).get(ACCESS_COOKIE)?.value
  if (!config || !token) throw new DraftError('Sign in to review this draft.',401)
  try {
    return await fetch(config.base.replace(/\/auth\/v1$/,'')+'/rest/v1/property_draft_reviews'+(body?'?on_conflict=draft_id':`?owner_id=eq.${encodeURIComponent(user.id)}&draft_id=eq.${id}&select=draft_id,draft_revision,content_hash,confirmed_at`), {
      method:body?'POST':'GET', headers:{apikey:config.key,Authorization:`Bearer ${token}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(15000),
    })
  } catch { throw new DraftError('Review storage is unavailable. Please retry.') }
}
export async function getPreview(user: AuthUser, id: string) {
  const draft=await getDraft(user,id)
  const [photos, profile, reviewResponse]=await Promise.all([listPhotos(user,draft.collection_id),getBuyerProfile(user),request(user,id)])
  if (!profile.ok || !reviewResponse.ok) throw new DraftError('The preview could not be loaded completely. Please retry; your draft is unchanged.')
  const model=buildPreview(draft,photos,profile.profile?.full_name??null,getPostingLocations(),kolkataToday())
  // Hash only the display name; never return private profile phone/email to the client.
  const signature=createHash('sha256').update(JSON.stringify({draft,photos:[...photos].sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id)),sellerName:model.sellerName})).digest('hex')
  const reviews=await reviewResponse.json() as DraftReview[]
  const review=reviews[0]??null
  return {draft,model,signature,review,confirmed: model.canConfirm && review?.draft_revision===draft.revision && review?.content_hash===signature}
}
export async function confirmPreview(user: AuthUser,id:string,signature:string) {
  const current=await getPreview(user,id)
  if (current.signature!==signature) throw new DraftError('This draft, its photos or seller information changed. Reload the preview and review it again.',409)
  if (!current.model.canConfirm) throw new DraftError('Complete the missing information before confirming.',422)
  const response=await request(user,id,{draft_id:id,owner_id:user.id,draft_revision:current.draft.revision,content_hash:signature,confirmed_at:new Date().toISOString()})
  if (!response.ok) throw new DraftError('Your review could not be confirmed. Please retry.')
  const rows=await response.json() as DraftReview[]
  if (!rows[0] || rows[0].content_hash!==signature) throw new DraftError('Review confirmation was not received. Please retry.')
  // Catch edits racing the write. A stored stale hash never counts as a current review.
  const after=await getPreview(user,id)
  if (!after.confirmed) throw new DraftError('The content changed while confirming. Reload and review again.',409)
  return rows[0]
}
