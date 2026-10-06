import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound,redirect } from 'next/navigation'
import { getVerifiedUser } from '@/lib/auth/session'
import { DraftError } from '@/lib/drafts/queries'
import { getPreview } from '@/lib/preview/queries'
import { UUID } from '@/lib/media/types'
import { PageShell } from '@/components/layout/PageShell'
import { ReloadDraft } from '@/components/drafts/ReloadDraft'
import { Gallery } from '@/components/property/Gallery'
import { KeyDetails } from '@/components/property/KeyDetails'
import { AreaBreakdown } from '@/components/property/AreaBreakdown'
import { SellerBlock } from '@/components/property/SellerBlock'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { PropertyDisclaimer } from '@/components/property/PropertyDisclaimer'
import { ConfirmPreview } from '@/components/preview/ConfirmPreview'
import { formatAmount } from '@/lib/format/price'
export const metadata:Metadata={title:'Private property preview',robots:{index:false,follow:false},referrer:'no-referrer'}
export const dynamic='force-dynamic'
export default async function PreviewPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;if(!UUID.test(id))notFound()
  const user=await getVerifiedUser();if(!user)redirect(`/login?next=${encodeURIComponent(`/post/drafts/${id}/preview`)}`)
  let result
  try { result=await getPreview(user,id) }catch(e){
    if(e instanceof DraftError&&e.status===404)notFound()
    return <PageShell><section className="mx-auto max-w-3xl p-6"><h1 className="text-heading-2">Preview unavailable</h1><p role="alert" className="mt-4">We could not load all your saved information. Your draft is unchanged.</p><ReloadDraft/><Link href={`/post/drafts/${id}`} className="ml-4 inline-flex min-h-11 items-center text-brand-700">Back to draft</Link></section></PageShell>
  }
  const {model:m,signature,confirmed}=result,edit=`/post/drafts/${id}`
  const amount=m.pricing?(m.pricing.intent==='buy'?m.pricing.price:m.pricing.monthlyRent):undefined
  return <PageShell><article className="mx-auto max-w-[1320px] px-4 pb-28 pt-5 lg:px-8">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-100 p-4"><div><p className="font-semibold text-brand-700">Private preview · Not published</p><p className="text-body-sm text-ink-700">Only you can open this preview. It shows your saved information.</p></div><Link href={edit} className="inline-flex min-h-11 items-center px-3 font-semibold text-brand-700">Edit draft</Link></div>
    {m.warnings.length>0&&<section aria-labelledby="warnings-heading" className="mt-5 rounded-lg border border-border-strong bg-surface-000 p-5"><h2 id="warnings-heading" className="text-heading-3 font-display text-ink-900">Information to complete</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-body-sm text-ink-700">{m.warnings.map((w,i)=><li key={`${w.section}-${i}`}>{w.message} <Link href={w.section==='seller'?'/account':edit} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">{w.section==='seller'?'Edit profile':'Edit draft'}</Link></li>)}</ul></section>}
    <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="min-w-0">
        <Gallery photos={m.media} title={m.title}/>
        <header className="mt-5">
          {m.pricing&&amount!==undefined?<PriceDisplay amount={amount} intent={m.pricing.intent} size="detail" areaForRate={m.pricing.intent==='buy'?m.carpetSqft:undefined}/>:<p className="font-semibold text-ink-500">Complete pricing to preview the amount</p>}
          {m.pricing&&<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-ink-700">
            {m.pricing.intent==='rent'&&<span>Deposit {formatAmount(m.pricing.deposit)}</span>}
            <span>{m.pricing.maintenance.status==='separate'?`Maintenance ${formatAmount(m.pricing.maintenance.monthly)}/mo`:m.pricing.maintenance.status==='none'?'No maintenance charge':m.pricing.maintenance.status==='included'?'Maintenance included in rent':'Maintenance not specified'}</span>
            <span>{m.pricing.negotiable?'Negotiable':'Non-negotiable'}</span>
          </div>}
          <h1 className="mt-3 break-words font-display text-heading-2 text-ink-900 lg:text-heading-1">{m.title}</h1>
          {m.locality&&<p className="mt-1 text-body text-ink-700">{m.locality}, {m.city}</p>}
        </header>
        <section className="mt-8" aria-labelledby="facts-heading"><h2 id="facts-heading" className="text-heading-3 font-display text-ink-900">Property details</h2>
          {m.facts?<div className="mt-3"><KeyDetails property={{...m.facts,propertyType:m.entry.type,availableFrom:typeof m.facts.availableFrom==='object'?m.facts.availableFrom.from:undefined}}/>{m.facts.possessionBy&&<p className="mt-3 text-body-sm text-ink-700">Expected possession: {m.facts.possessionBy}</p>}{m.facts.availableFrom==='now'&&<p className="mt-3 text-body-sm text-ink-700">Available now</p>}</div>:<p className="mt-3 text-ink-500">Complete the property details to preview this section.</p>}
        </section>
        {m.facts&&amount!==undefined&&<section className="mt-8" aria-labelledby="area-heading"><h2 id="area-heading" className="mb-3 text-heading-3 font-display text-ink-900">Area breakdown</h2><AreaBreakdown property={{...m.facts,price:amount,intent:m.entry.intent}}/></section>}
        <section className="mt-8" aria-labelledby="location-heading"><h2 id="location-heading" className="text-heading-3 font-display text-ink-900">Location</h2>{m.location?<dl className="mt-3 grid gap-3 sm:grid-cols-2">{[['City',m.city],['Locality',m.locality],['Society / building',m.location.societyName],['Building or street address',m.location.address]].filter(([,v])=>v).map(([k,v])=><div key={k} className="min-w-0 rounded-md border border-border-subtle p-3"><dt className="text-caption text-ink-500">{k}</dt><dd className="mt-1 break-words text-body-sm font-semibold text-ink-900">{v}</dd></div>)}</dl>:<p className="mt-3 text-ink-500">Complete the property location to preview this section.</p>}<p className="mt-3 text-caption text-ink-500">Location is seller-provided and has not been verified.</p></section>
        <div className="mt-8"><PropertyDisclaimer/></div>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-24">
        {m.entry.role?<SellerBlock property={{sellerType:m.entry.role,sellerName:m.sellerName??undefined}}/>:<p className="rounded-lg border border-border-subtle p-4 text-ink-500">Choose your seller category to preview seller information.</p>}
        <ConfirmPreview key={`${signature}:${confirmed}:${m.canConfirm}`} id={id} signature={signature} confirmed={confirmed} canConfirm={m.canConfirm}/>
        <p className="text-caption text-ink-500">Buyer contact and save actions become available only for published listings.</p>
      </aside>
    </div>
  </article></PageShell>
}
