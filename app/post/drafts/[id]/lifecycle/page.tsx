import type { Metadata } from 'next'
import { ErrorState } from '@/components/ui/ErrorState'
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
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RestoreFocus } from '@/components/a11y/RestoreFocus'
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
 if(!loaded)return <PageShell><section className="mx-auto max-w-3xl px-4 py-8"><h1 className="text-heading-2">Publishing status unavailable</h1><ErrorState surface="inline" className="mt-3" action={<ReloadDraft/>}>Your listing could not be loaded. Please retry.</ErrorState></section></PageShell>
 const {listing,history,status,preview}=loaded
 const when=(iso:string)=>new Date(iso).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})
 // The listing's real path (UI-17), lit from its status: nothing here
 // promises a time or an outcome, it only says which state it is in.
 const path=[{key:'DRAFT',label:'Private draft'},{key:'UNDER_REVIEW',label:'Under review'},{key:'ACTIVE',label:'Published'}] as const
 const at=status==='DRAFT'||status==='REJECTED'||status==='CHANGES_REQUESTED'?0:status==='UNDER_REVIEW'?1:status==='ACTIVE'?2:-1
 const link='inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-label text-brand-700 hover:bg-brand-50'
 return <PageShell>
  <div className="post-band"><div className="home-container pb-6 pt-5 lg:pb-8 lg:pt-6">
   <p className="flex items-center gap-2 text-overline uppercase text-brand-700"><span aria-hidden className="h-0.5 w-6 shrink-0 rounded-full bg-brand-500"/>Post a property</p>
   <h1 className="mt-3 font-display text-heading-2 text-ink-900 sm:text-heading-1">Property publishing</h1>
   {at>=0&&<ol aria-label="Publishing steps" className="mt-5 grid max-w-2xl grid-cols-3 gap-2">{path.map((p,i)=><li key={p.key} aria-current={i===at?'step':undefined} className="min-w-0">
     <span aria-hidden className={`block h-1.5 rounded-full ${i<=at?'bg-brand-600':'bg-surface-000'}`}/>
     <span className={`mt-2 block truncate text-body-sm ${i===at?'font-semibold text-ink-900':i<at?'text-ink-700':'text-ink-500'}`}>{p.label}</span>
   </li>)}</ol>}
  </div></div>
  <div className="home-container grid gap-6 pb-24 pt-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-10 lg:pt-8">
   <div className="min-w-0">
    <section aria-label="Listing status" className="rounded-lg border border-border-subtle bg-surface-000 p-5 shadow-e1 sm:p-7"><RestoreFocus token={crypto.randomUUID()}/><p className="text-overline uppercase text-ink-500">Listing status</p>{/* The canonical badge (UI-09; it was brand-green text for every status, removed and rejected included). Focusable from script: an action refreshes the page and focus returns here. */}<p id="listing-status" tabIndex={-1} className="mt-2"><StatusBadge status={status} role="status" className="px-3 py-1.5 text-label"/></p>
     <p className="mt-3 max-w-2xl text-body text-ink-700">{status==='UNDER_REVIEW'?'Your submitted copy is private while it is being reviewed. Draft edits do not change it.':status==='ACTIVE'?'Your approved submission is public. Editing the working draft does not change the live listing.':status==='DELETED'?'This listing has been removed and cannot be reactivated. Your working draft is retained.':(status==='REJECTED'||status==='CHANGES_REQUESTED')?'Update the draft, review it again and re-submit.':status==='EXPIRED'?'This listing is no longer public. Review your latest information and re-submit to renew it.':'Your working draft is private. Review it before submitting.'}</p>
     {listing?.rejection_reason&&(status==='REJECTED'||status==='CHANGES_REQUESTED')&&<p className="mt-4 break-words rounded-md bg-supply-100 p-4 text-body-sm text-ink-900"><strong>Reason: </strong>{listing.rejection_reason}</p>}
     {status==='ACTIVE'&&listing&&<><Link href={`/listing/${listing.id}`} className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-700 underline">View public listing →</Link><p className="text-body-sm text-ink-700">Valid until {when(listing.expires_at!)} IST</p></>}
     {!preview&&<ErrorState surface="inline" className="mt-4">The current preview could not be loaded. Submission is unavailable; listing removal remains available.</ErrorState>}
     <div className="mt-5 border-t border-border-subtle pt-5">
      <LifecycleActions key={`${listing?.version??0}:${status}:${preview?.signature}:${preview?.confirmed}`} id={id} version={listing?.version??0} status={status} signature={preview?.signature??''} confirmed={preview?.confirmed??false} configured={publishingConfigured()}/>
     </div>
    </section>
    <section className="mt-8" aria-labelledby="history-heading"><h2 id="history-heading" className="font-display text-heading-3 text-ink-900">Status history</h2>{history.length?<ol className="mt-4 border-l-2 border-border-subtle pl-5" aria-label="Listing status history">{history.map(e=><li key={e.id} className="relative pb-5 last:pb-0"><span aria-hidden className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-surface-000 bg-brand-600"/><p className="font-semibold text-ink-900">{e.from_status?`${STATUS_LABEL[e.from_status]} → `:''}{STATUS_LABEL[e.to_status]}</p><time className="text-caption text-ink-500" dateTime={e.created_at}>{when(e.created_at)} IST</time><p className="text-caption text-ink-500">{e.actor_type==='OWNER'?'Changed by owner':e.actor_type==='SYSTEM'?'Automatic expiry':'Trusted review decision'}</p>{e.reason&&<p className="mt-1 break-words text-body-sm">{e.reason}</p>}</li>)}</ol>:<p className="mt-3 text-body-sm text-ink-500">No submission yet.</p>}</section>
   </div>
   <nav aria-label="This listing" className="rounded-lg border border-border-subtle bg-surface-000 p-3 shadow-e1 lg:sticky lg:top-24">
    <p className="px-2 pb-1 pt-1 text-overline uppercase text-ink-500">This listing</p>
    <ul className="grid">
     {listing?.current_submission_id&&status!=='DELETED'&&<li><Link href={`/post/drafts/${id}/submitted`} className={link}>View submitted copy</Link></li>}
     <li><Link href={`/post/drafts/${id}`} className={link}>Edit working draft</Link></li>
     <li><Link href={`/post/drafts/${id}/preview`} className={link}>Review preview</Link></li>
     <li><Link href="/dashboard" className={link}>My properties</Link></li>
    </ul>
   </nav>
  </div>
 </PageShell>
}
