import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound,redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { ReloadDraft } from '@/components/drafts/ReloadDraft'
import { LifecycleActions } from '@/components/listings/LifecycleActions'
import { getVerifiedUser } from '@/lib/auth/session'
import { DraftError,getDraft } from '@/lib/drafts/queries'
import { getPreview } from '@/lib/preview/queries'
import { getListingForDraft,listingHistory,publishingConfigured } from '@/lib/listings/queries'
import { effectiveStatus,STATUS_LABEL } from '@/lib/listings/types'
import { UUID } from '@/lib/media/types'
export const metadata:Metadata={title:'Property publishing status',robots:{index:false,follow:false},referrer:'no-referrer'}
export const dynamic='force-dynamic'
export default async function LifecyclePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!UUID.test(id))notFound()
 const user=await getVerifiedUser();if(!user)redirect(`/login?next=${encodeURIComponent(`/post/drafts/${id}/lifecycle`)}`)
 let loaded
 try{
  await getDraft(user,id)
  const listing=await getListingForDraft(user,id),history=listing?await listingHistory(user,listing):[],status=listing?effectiveStatus(listing):'DRAFT'
  // A media/profile outage must not prevent withdrawing an already public listing.
  let preview:Awaited<ReturnType<typeof getPreview>>|null=null
  try{preview=await getPreview(user,id)}catch{}
  loaded={listing,history,status,preview}
 }catch(e){if(e instanceof DraftError&&e.status===404)notFound()}
 if(!loaded)return <PageShell><section className="mx-auto max-w-3xl px-4 py-8"><h1 className="text-heading-2">Publishing status unavailable</h1><p role="alert" className="mt-3">Your listing could not be loaded. Please retry.</p><ReloadDraft/></section></PageShell>
 const {listing,history,status,preview}=loaded
 return <PageShell><article className="mx-auto max-w-4xl px-4 pb-28 pt-8 sm:px-8">
   <h1 className="font-display text-heading-1 text-ink-900">Property publishing</h1>
   <div className="mt-5 rounded-lg bg-brand-100 p-5"><p className="text-caption text-ink-500">Listing status</p><p role="status" className="mt-1 text-heading-2 font-semibold text-brand-700">{STATUS_LABEL[status]}</p>
    <p className="mt-2 text-body-sm text-ink-700">{status==='UNDER_REVIEW'?'Your submitted copy is private while it is being reviewed. Draft edits do not change it.':status==='ACTIVE'?'Your approved submission is public. Editing the working draft does not change the live listing.':status==='DELETED'?'This listing has been removed and cannot be reactivated. Your working draft is retained.':status==='REJECTED'?'Update the draft, review it again and re-submit.':status==='EXPIRED'?'This listing is no longer public. Review your latest information and re-submit to renew it.':'Your working draft is private. Review it before submitting.'}</p>
    {listing?.rejection_reason&&status==='REJECTED'&&<p className="mt-3 break-words text-body-sm"><strong>Reason: </strong>{listing.rejection_reason}</p>}
    {status==='ACTIVE'&&listing&&<><Link href={`/listing/${listing.id}`} className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-700 underline">View public listing →</Link><p className="text-body-sm text-ink-700">Valid until {new Date(listing.expires_at!).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})} IST</p></>}
   </div>
   <div className="my-4 flex flex-wrap gap-5">{listing?.current_submission_id&&status!=='DELETED'&&<Link href={`/post/drafts/${id}/submitted`} className="inline-flex min-h-11 items-center text-brand-700 underline">View submitted copy</Link>}<Link href={`/post/drafts/${id}`} className="inline-flex min-h-11 items-center text-brand-700 underline">Edit working draft</Link><Link href={`/post/drafts/${id}/preview`} className="inline-flex min-h-11 items-center text-brand-700 underline">Review preview</Link><Link href="/post/drafts" className="inline-flex min-h-11 items-center text-brand-700 underline">My drafts</Link></div>
   {!preview&&<p role="alert" className="mb-4 rounded-md border border-border-strong p-4">The current preview could not be loaded. Submission is unavailable; listing removal remains available.</p>}
   <LifecycleActions key={`${listing?.version??0}:${status}:${preview?.signature}:${preview?.confirmed}`} id={id} version={listing?.version??0} status={status} signature={preview?.signature??''} confirmed={preview?.confirmed??false} configured={publishingConfigured()}/>
   <section className="mt-8" aria-labelledby="history-heading"><h2 id="history-heading" className="font-display text-heading-3 text-ink-900">Status history</h2>{history.length?<ol className="mt-4 space-y-3" aria-label="Listing status history">{history.map(e=><li key={e.id} className="rounded-md border border-border-subtle p-4"><p className="font-semibold">{e.from_status?`${STATUS_LABEL[e.from_status]} → `:''}{STATUS_LABEL[e.to_status]}</p><time className="text-caption text-ink-500" dateTime={e.created_at}>{new Date(e.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})} IST</time><p className="text-caption text-ink-500">{e.actor_type==='OWNER'?'Changed by owner':e.actor_type==='SYSTEM'?'Automatic expiry':'Trusted review decision'}</p>{e.reason&&<p className="mt-1 break-words text-body-sm">{e.reason}</p>}</li>)}</ol>:<p className="mt-3 text-body-sm text-ink-500">No submission yet.</p>}</section>
  </article></PageShell>
}
