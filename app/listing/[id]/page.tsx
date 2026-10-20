import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { PublishedProperty } from '@/components/listings/PublishedProperty'
import { ViewBeacon } from '@/components/analytics/ViewBeacon'
import { SaveButton } from '@/components/property/SaveButton'
import { getVerifiedUser } from '@/lib/auth/session'
import { getPublishedListing, ownsListing } from '@/lib/listings/queries'
import { UUID } from '@/lib/media/types'
export const dynamic='force-dynamic'
async function resolve(params:Promise<{id:string}>){const {id}=await params;if(!UUID.test(id))notFound();const r=await getPublishedListing(id);if(!r)notFound();return r}
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const r=await resolve(params);return {title:r.model.title,description:`${r.model.title}. Seller-provided property information.`,alternates:{canonical:`/listing/${r.listing.id}`}}}
export default async function ListingPage({params}:{params:Promise<{id:string}>}){
 const r=await resolve(params),user=await getVerifiedUser()
 // An owner sees where their enquiries arrive instead of a form addressed to
 // themselves; the database refuses that enquiry regardless.
 const own=user?await ownsListing(user,r.listing.id):false
 return <PageShell alwaysShowBottomNav={own}>
  <PublishedProperty model={r.model} postedAt={r.listing.activated_at!} listingId={r.listing.id} isPublic contact={!own}
   saveAction={own?undefined:<SaveButton id={r.listing.id} title={r.model.title} visualClassName="bg-surface-000 shadow-e2"/>}
   ownerPanel={own?<div className="rounded-lg border border-border-subtle bg-surface-000 p-5 shadow-e1"><h2 className="font-display text-heading-3 text-ink-900">This is your listing</h2><p className="mt-1 text-body-sm text-ink-700">Buyer enquiries arrive in your seller inbox.</p><div className="mt-2 flex flex-wrap gap-x-4"><Link href={`/dashboard/enquiries?listing=${r.listing.id}`} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Enquiries for this listing</Link><Link href="/dashboard" className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">My properties</Link></div></div>:undefined}/>
  {!own&&<ViewBeacon listingId={r.listing.id}/>}
 </PageShell>
}
