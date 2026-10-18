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
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { buttonClassName } from '@/components/ui/Button'
import { RestoreFocus } from '@/components/a11y/RestoreFocus'
import { SavedGrid } from '@/components/account/SavedGrid'

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
    <RestoreFocus token={crypto.randomUUID()} />
    <h1 className="mt-2 font-display text-heading-1 text-ink-900">Saved properties</h1>
    <p className="mt-2 text-body text-ink-700">Homes you want to look at again, all in one place.</p>
    {!result.ok || savedListings === null ? <ErrorState className="mt-8" title="Your saved properties are temporarily unavailable">
      Please try refreshing this page in a moment.
    </ErrorState> : total === 0 ? <div id="saved-empty" tabIndex={-1} className="mt-8"><EmptyState title="Your shortlist is empty"
      action={<Link href="/buy/kolkata" className={buttonClassName({ variant: 'primary' })}>Browse properties</Link>}>
      Tap the heart on a property to keep it here.
    </EmptyState></div> : <>
      {/* The count and each heart are focus targets after a removal refreshes this page (UI-12). */}
      <p id="saved-count" tabIndex={-1} className="mt-6 text-body-sm text-ink-700">{total} saved {total === 1 ? 'property' : 'properties'}</p>
      <SavedGrid className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {savedListings.map((row) => {
          const listing = summaries?.get(row.listing_id)
          return <div key={row.listing_id} data-flip-key={row.listing_id} className="min-w-0">{listing ? <article className="glass-card min-w-0 rounded-lg border border-border-subtle p-5 shadow-e1">
            <div className="flex items-start justify-between gap-3">
              <PriceDisplay amount={listing.price} intent={listing.intent} />
              <SaveButton id={row.listing_id} title={listing.title} className="shrink-0" />
            </div>
            <h2 className="mt-2 break-words font-display text-heading-3 text-ink-900"><Link href={`/listing/${row.listing_id}`} className="text-brand-700 underline underline-offset-4">{listing.title}</Link></h2>
            <p className="mt-1 break-words text-body-sm text-ink-700">{listing.locality_name}, {listing.city_name}</p>
          </article> : <article className="glass-card min-w-0 rounded-lg border border-border-subtle p-5 shadow-e1">
            <h2 className="font-display text-heading-3 text-ink-900">{summaries ? 'Listing no longer available' : 'Listing details unavailable'}</h2>
            <p className="mt-2 text-body-sm text-ink-700">{summaries ? 'This listing is not public right now. You can remove it from your shortlist.' : 'Its details could not be loaded. Please refresh this page.'}</p>
            <div className="mt-4"><SaveButton id={row.listing_id} title={summaries ? 'unavailable listing' : 'saved listing'} /></div>
          </article>}</div>
        })}
        {result.rows.map((row) => {
          const property = getPropertySummary(row.property_public_id)
          return <div key={row.property_public_id} data-flip-key={row.property_public_id} className="min-w-0">{property ? <PropertyCard property={property} /> :
            <article className="glass-card rounded-lg border border-border-subtle p-5 shadow-e1">
              <h2 className="font-display text-heading-3 text-ink-900">Listing unavailable</h2>
              <p className="mt-2 text-body-sm text-ink-700">This property is no longer in the current listings. You can remove it from your shortlist.</p>
              <div className="mt-4"><SaveButton id={row.property_public_id} title="unavailable listing" /></div>
            </article>}</div>
        })}
      </SavedGrid>
    </>}
    <Link href="/account" className="mt-8 inline-flex min-h-11 items-center text-label text-brand-700 underline underline-offset-4">Back to account</Link>
  </div></PageShell>
}
