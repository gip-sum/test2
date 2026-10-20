import type { Metadata } from 'next'
import { ErrorState } from '@/components/ui/ErrorState'
import Link from 'next/link'
import { notFound,redirect } from 'next/navigation'
import { getVerifiedUser } from '@/lib/auth/session'
import { DraftError } from '@/lib/drafts/queries'
import { getPreview } from '@/lib/preview/queries'
import { UUID } from '@/lib/media/types'
import { PageShell } from '@/components/layout/PageShell'
import { ReloadDraft } from '@/components/drafts/ReloadDraft'
import { ConfirmPreview } from '@/components/preview/ConfirmPreview'
import { PublishedProperty } from '@/components/listings/PublishedProperty'
import { isPublishable } from '@/lib/listings/overview'
import { DescriptionAssistant } from '@/components/preview/DescriptionAssistant'
import { descriptionAIAvailable, latestDescriptionJob } from '@/lib/descriptions/queries'
export const metadata:Metadata={title:'Private property preview',robots:{index:false,follow:false},referrer:'no-referrer'}
export const dynamic='force-dynamic'
// What a seller should read for, in the preview's own order; guidance, not a verdict.
const CHECKS=['The first photo is the cover buyers see in search.','The price, and the charges beside it.','Bedrooms, bathrooms and carpet area.','The address, exactly as you typed it.']
export default async function PreviewPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;if(!UUID.test(id))notFound()
  const user=await getVerifiedUser();if(!user)redirect(`/login?next=${encodeURIComponent(`/post/drafts/${id}/preview`)}`)
  let result
  try { result=await getPreview(user,id) }catch(e){
    if(e instanceof DraftError&&e.status===404)notFound()
    return <PageShell><section className="mx-auto max-w-3xl p-6"><h1 className="text-heading-2">Preview unavailable</h1><ErrorState surface="inline" className="mt-4" action={<><ReloadDraft/><Link href={`/post/drafts/${id}`} className="inline-flex min-h-11 items-center text-brand-700 underline">Back to draft</Link></>}>We could not load all your saved information. Your draft is unchanged.</ErrorState></section></PageShell>
  }
  const {model:m,signature,confirmed}=result,edit=`/post/drafts/${id}`
  let job=null,jobError=''
  try {job=await latestDescriptionJob(user,id)} catch {jobError='Background job status is unavailable. You can still edit your description.'}
  const ready=m.warnings.length===0
  const confirm=<ConfirmPreview key={`${signature}:${confirmed}:${m.canConfirm}`} id={id} signature={signature} confirmed={confirmed} canConfirm={m.canConfirm}/>
  // UI-17: the seller's review is the buyer's page. The top is the seller's
  // own (what is missing, the description editor); under it the real
  // property layout (PublishedProperty, as /listing/[id] renders it), marked
  // as a preview, with the confirmation where a buyer would find the
  // contact card. Nothing on the preview is filled in for the seller: what
  // is missing is listed above it, never drawn into it.
  return <PageShell>
    <section aria-labelledby="post-heading" className="border-b border-border-subtle bg-surface-000">
      <div className="home-container pb-8 pt-5 lg:pb-10 lg:pt-6">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 text-overline uppercase text-brand-700"><span aria-hidden className="h-0.5 w-6 shrink-0 rounded-full bg-brand-500"/><span className="truncate"><span className="hidden sm:inline">Post a property · </span>Final review</span></p>
          <Link href={edit} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-label text-ink-700 hover:bg-surface-200 hover:text-brand-700"><svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6"/></svg>Edit draft</Link>
        </div>
        <div className="mt-3 max-w-3xl">
          <h1 id="post-heading" className="font-display text-heading-2 text-ink-900 sm:text-heading-1">Check your listing as buyers will see it.</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-body text-ink-700">
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-brand-100 px-3 text-body-sm font-semibold text-brand-700"><svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>Private preview · Not published</span>
            <span>Only you can open this preview. It shows your saved information.</span>
          </p>
        </div>
        <div className="mt-7 grid gap-5 lg:grid-cols-2 lg:items-start">
          {ready
            ? <section aria-labelledby="ready-heading" className="flex gap-4 rounded-lg border border-brand-200 bg-brand-50 p-5">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-on-brand"><svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>
                <div><h2 id="ready-heading" className="font-display text-heading-3 text-ink-900">Nothing is missing</h2><p className="mt-1 text-body-sm text-ink-700">Read the preview below the way a buyer would, then confirm your review beside it. Confirming does not publish your property.</p>
                  <ul aria-label="What to check" className="mt-4 grid gap-2 text-body-sm text-ink-900">{CHECKS.map(c=><li key={c} className="flex gap-2"><svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-brand-700" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 13l4 4L19 7"/></svg>{c}</li>)}</ul>
                </div>
              </section>
            : <section aria-labelledby="warnings-heading" className="rounded-lg bg-supply-100 p-5">
                <h2 id="warnings-heading" className="font-display text-heading-3 text-ink-900">Information to complete</h2>
                <p className="mt-1 text-body-sm text-ink-700">Buyers will not see these notes. Fix them before you confirm.</p>
                <ul className="mt-3 grid gap-2">{m.warnings.map((w,i)=><li key={`${w.section}-${i}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md bg-surface-000 px-4 py-2 text-body-sm text-ink-900"><span className="flex min-w-0 items-start gap-2"><span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-supply-600"/>{w.message}</span><Link href={w.section==='seller'?'/account':edit} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4">{w.section==='seller'?'Edit profile':'Edit draft'}</Link></li>)}</ul>
              </section>}
          <DescriptionAssistant key={`${id}:${result.draft.revision}`} id={id} revision={result.draft.revision} signature={signature} description={m.description??null} available={descriptionAIAvailable()} complete={m.canConfirm} initialJob={job} initialError={jobError}/>
        </div>
        {!isPublishable(m)&&<div className="mt-6 grid gap-5 lg:grid-cols-2 lg:items-start">
          <div className="rounded-lg border border-dashed border-border-strong bg-surface-100 p-6"><h2 className="font-display text-heading-3 text-ink-900">The buyer preview appears here</h2><p className="mt-1 text-body-sm text-ink-700">It needs the property type, who is posting, the details and the price. Complete them and the page buyers will see is drawn below.</p></div>
          <div>{confirm}</div>
        </div>}
      </div>
    </section>
    <PublishedProperty
      model={m}
      nameLevel={2}
      band={<div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1"><span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-brand-700 px-3 text-label font-semibold uppercase tracking-wide text-on-brand"><svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>Preview</span><p className="text-body-sm text-ink-700">What buyers will see once your listing is approved. Contact and save switch on when it is published.</p></div>}
      ownerPanel={<div className="grid gap-3"><p className="text-overline uppercase text-ink-500">Your controls · not shown to buyers</p>{confirm}</div>}
    />
  </PageShell>
}
