import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { PublishedProperty } from '@/components/listings/PublishedProperty'
import { ListingContactBar, ListingContactCard } from '@/components/listings/ListingContact'
import { ViewBeacon } from '@/components/analytics/ViewBeacon'
import { SaveButton } from '@/components/property/SaveButton'
import { getVerifiedUser } from '@/lib/auth/session'
import { getPublishedListing, ownsListing } from '@/lib/listings/queries'
import { UUID } from '@/lib/media/types'
import { SELLER_LABEL } from '@/lib/property/types'
export const dynamic='force-dynamic'
async function resolve(params:Promise<{id:string}>){const {id}=await params;if(!UUID.test(id))notFound();const r=await getPublishedListing(id);if(!r)notFound();return r}
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const r=await resolve(params);return {title:r.model.title,description:`${r.model.title}. Seller-provided property information.`,alternates:{canonical:`/listing/${r.listing.id}`}}}
export default async function ListingPage({params}:{params:Promise<{id:string}>}){
 const r=await resolve(params),user=await getVerifiedUser()
 // An owner sees where their enquiries arrive instead of a form addressed to
 // themselves; the database refuses that enquiry regardless.
 const own=user?await ownsListing(user,r.listing.id):false
 const p=r.model.pricing!,contact={listingId:r.listing.id,sellerLabel:SELLER_LABEL[r.model.entry.role!],title:r.model.title,place:`${r.model.locality}, ${r.model.city}`,amount:p.intent==='buy'?p.price:p.monthlyRent,intent:p.intent}
 return <PageShell alwaysShowBottomNav={own}>
  <PublishedProperty model={r.model} postedAt={r.listing.activated_at!} save={own?undefined:<SaveButton id={r.listing.id} title={r.model.title} className="shrink-0"/>} contact={own
   ?<div className="rounded-lg border border-border-subtle bg-surface-000 p-4"><p className="font-semibold text-ink-900">This is your listing</p><p className="mt-1 text-body-sm text-ink-700">Buyer enquiries arrive in your seller inbox.</p><Link href={`/dashboard/enquiries?listing=${r.listing.id}`} className="mt-2 inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Enquiries for this listing</Link><Link href="/dashboard" className="ml-4 inline-flex min-h-11 items-center font-semibold text-brand-700 underline">My properties</Link></div>
   :<div className="hidden lg:block"><ListingContactCard {...contact}/></div>}/>
  {/* Without JavaScript the phone sheet cannot open; the same form is here instead (UI-12). */}
  {!own&&<noscript><div className="mx-auto max-w-xl px-4 pb-28 pt-2 lg:hidden"><ListingContactCard {...contact}/></div></noscript>}
  {!own&&<ListingContactBar {...contact}/>}
  {!own&&<ViewBeacon listingId={r.listing.id}/>}
 </PageShell>
}
