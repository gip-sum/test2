import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { PropertyCard } from '@/components/property/PropertyCard'
import { SaveButton } from '@/components/property/SaveButton'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { getVerifiedUser } from '@/lib/auth/session'
import { getPublishedSummaries } from '@/lib/listings/queries'
import type { SubmissionSummary } from '@/lib/listings/types'
import { listSaved, listSavedListings } from '@/lib/saved/queries'
import { getPropertySummary } from '@/lib/property/queries'

export const metadata: Metadata = { title: 'Saved properties', robots: { index: false, follow: false } }

export default async function SavedPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/login?next=%2Faccount%2Fsaved')
  const [result, listingResult] = await Promise.all([listSaved(user), listSavedListings(user)])
  // Saved real listings (Phase 20). Before the migration none can exist, so a
  // missing table reads as none; any other failure is reported as a failure.
  const savedListings = listingResult.ok ? listingResult.rows : listingResult.missing ? [] : null
  let summaries: Map<string, SubmissionSummary> | null = new Map()
  if (savedListings?.length) { try { summaries = await getPublishedSummaries(savedListings.map((row) => row.listing_id)) } catch { summaries = null } }
  const total = result.ok && savedListings ? result.rows.length + savedListings.length : null

  return <PageShell><div className="mx-auto max-w-6xl px-4 py-9 sm:py-14">
    <p className="text-overline uppercase tracking-widest text-brand-700">Your space</p>
    <h1 className="mt-2 font-display text-heading-1 text-ink-900">Saved properties</h1>
    <p className="mt-2 text-body text-ink-700">Homes you want to look at again, all in one place.</p>
    {!result.ok || savedListings === null ? <div role="alert" className="glass-panel mt-8 rounded-lg border border-border-subtle p-6">
      <h2 className="font-display text-heading-3">Your saved properties are temporarily unavailable</h2>
      <p className="mt-2 text-body-sm">Please try refreshing this page in a moment.</p>
    </div> : total === 0 ? <div className="glass-panel mt-8 rounded-lg border border-border-subtle p-7 sm:p-10">
      <h2 className="font-display text-heading-3 text-ink-900">Your shortlist is empty</h2>
      <p className="mt-2 text-body text-ink-700">Tap the heart on a property to keep it here.</p>
      <Link href="/buy/kolkata" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-brand-700 px-5 font-semibold text-on-brand focus-visible:outline-2 focus-visible:outline-focus-ring">Browse properties</Link>
    </div> : <>
      <p className="mt-6 text-body-sm text-ink-700">{total} saved {total === 1 ? 'property' : 'properties'}</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {savedListings.map((row) => {
          const listing = summaries?.get(row.listing_id)
          return listing ? <article key={row.listing_id} className="glass-card min-w-0 rounded-lg border border-border-subtle p-5 shadow-e1">
            <div className="flex items-start justify-between gap-3">
              <PriceDisplay amount={listing.price} intent={listing.intent} />
              <SaveButton id={row.listing_id} title={listing.title} className="shrink-0" />
            </div>
            <h2 className="mt-2 break-words font-display text-heading-3 text-ink-900"><Link href={`/listing/${row.listing_id}`} className="text-brand-700 underline underline-offset-4">{listing.title}</Link></h2>
            <p className="mt-1 break-words text-body-sm text-ink-700">{listing.locality_name}, {listing.city_name}</p>
          </article> : <article key={row.listing_id} className="glass-card min-w-0 rounded-lg border border-border-subtle p-5 shadow-e1">
            <h2 className="font-display text-heading-3 text-ink-900">{summaries ? 'Listing no longer available' : 'Listing details unavailable'}</h2>
            <p className="mt-2 text-body-sm text-ink-700">{summaries ? 'This listing is not public right now. You can remove it from your shortlist.' : 'Its details could not be loaded. Please refresh this page.'}</p>
            <div className="mt-4"><SaveButton id={row.listing_id} title={summaries ? 'unavailable listing' : 'saved listing'} /></div>
          </article>
        })}
        {result.rows.map((row) => {
          const property = getPropertySummary(row.property_public_id)
          return property ? <PropertyCard key={row.property_public_id} property={property} /> :
            <article key={row.property_public_id} className="glass-card rounded-lg border border-border-subtle p-5 shadow-e1">
              <h2 className="font-display text-heading-3 text-ink-900">Listing unavailable</h2>
              <p className="mt-2 text-body-sm text-ink-700">This property is no longer in the current listings. You can remove it from your shortlist.</p>
              <div className="mt-4"><SaveButton id={row.property_public_id} title="unavailable listing" /></div>
            </article>
        })}
      </div>
    </>}
    <Link href="/account" className="mt-8 inline-flex min-h-11 items-center text-label text-brand-700 underline underline-offset-4">Back to account</Link>
  </div></PageShell>
}
