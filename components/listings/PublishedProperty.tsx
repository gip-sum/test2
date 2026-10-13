import type { PreviewModel } from '@/lib/preview/model'
import { Gallery } from '@/components/property/Gallery'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { KeyDetails } from '@/components/property/KeyDetails'
import { AreaBreakdown } from '@/components/property/AreaBreakdown'
import { SellerBlock } from '@/components/property/SellerBlock'
import { PropertyDisclaimer } from '@/components/property/PropertyDisclaimer'
import { formatAmount } from '@/lib/format/price'
export function PublishedProperty({model:m,postedAt}:{model:PreviewModel;postedAt?:string}){
 const f=m.facts!,p=m.pricing!,amount=p.intent==='buy'?p.price:p.monthlyRent
 return <article className="mx-auto max-w-[1320px] px-4 pb-28 pt-6 lg:px-8"><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
  <div className="min-w-0"><Gallery photos={m.media} title={m.title}/><header className="mt-5"><PriceDisplay amount={amount} intent={p.intent} size="detail" areaForRate={p.intent==='buy'?m.carpetSqft:undefined}/>
   <p className="mt-2 flex flex-wrap gap-3 text-body-sm text-ink-700">{p.intent==='rent'&&<span>Deposit {formatAmount(p.deposit)}</span>}<span>{p.maintenance.status==='separate'?`Maintenance ${formatAmount(p.maintenance.monthly)}/mo`:p.maintenance.status==='none'?'No maintenance charge':p.maintenance.status==='included'?'Maintenance included in rent':'Maintenance not specified'}</span><span>{p.negotiable?'Negotiable':'Non-negotiable'}</span></p>
   <h1 className="mt-3 break-words font-display text-heading-1 text-ink-900">{m.title}</h1><p className="mt-2 text-ink-700">{m.locality}, {m.city}</p>
  </header><section className="mt-8" aria-labelledby="details-heading"><h2 id="details-heading" className="mb-3 font-display text-heading-3">Property details</h2><KeyDetails property={{...f,propertyType:m.entry.type,availableFrom:typeof f.availableFrom==='object'?f.availableFrom.from:undefined}}/>{f.availableFrom==='now'&&<p className="mt-3">Available now</p>}{f.possessionBy&&<p className="mt-3">Expected possession: {f.possessionBy}</p>}</section>
  <section className="mt-8" aria-labelledby="area-heading"><h2 id="area-heading" className="mb-3 font-display text-heading-3">Area breakdown</h2><AreaBreakdown property={{...f,price:amount,intent:p.intent}}/></section>
  <section className="mt-8" aria-labelledby="location-heading"><h2 id="location-heading" className="mb-3 font-display text-heading-3">Location</h2><p className="break-words">{m.location?.societyName}</p><p className="break-words">{m.location?.address}</p><p className="mt-2 text-caption text-ink-500">Seller-provided location. It has not been verified.</p></section><div className="mt-8"><PropertyDisclaimer/></div>
  </div><aside className="lg:sticky lg:top-24 lg:self-start"><SellerBlock property={{sellerType:m.entry.role!,sellerName:m.sellerName!,postedAt}}/><p className="mt-3 text-caption text-ink-500">Approval allows publication and does not certify property ownership or accuracy.</p></aside>
 </div></article>
}
