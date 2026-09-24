import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { PropertyCard } from '@/components/property/PropertyCard'
import { SaveButton } from '@/components/property/SaveButton'
import { getVerifiedUser } from '@/lib/auth/session'
import { listSaved } from '@/lib/saved/queries'
import { getPropertySummary } from '@/lib/property/queries'

export const metadata: Metadata = { title: 'Saved properties', robots: { index: false, follow: false } }

export default async function SavedPage() {
  const user = await getVerifiedUser()
  if (!user) redirect('/login?next=%2Faccount%2Fsaved')
  const result = await listSaved(user)

  return <PageShell><div className="mx-auto max-w-6xl px-4 py-9 sm:py-14">
    <p className="text-overline uppercase tracking-widest text-brand-700">Your space</p>
    <h1 className="mt-2 font-display text-heading-1 text-ink-900">Saved properties</h1>
    <p className="mt-2 text-body text-ink-700">Homes you want to look at again, all in one place.</p>
    {!result.ok ? <div role="alert" className="glass-panel mt-8 rounded-lg border border-border-subtle p-6">
      <h2 className="font-display text-heading-3">Your saved properties are temporarily unavailable</h2>
      <p className="mt-2 text-body-sm">Please try refreshing this page in a moment.</p>
    </div> : result.rows.length === 0 ? <div className="glass-panel mt-8 rounded-lg border border-border-subtle p-7 sm:p-10">
      <h2 className="font-display text-heading-3 text-ink-900">Your shortlist is empty</h2>
      <p className="mt-2 text-body text-ink-700">Tap the heart on a property to keep it here.</p>
      <Link href="/buy/kolkata" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-brand-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-focus-ring">Browse properties</Link>
    </div> : <>
      <p className="mt-6 text-body-sm text-ink-700">{result.rows.length} saved {result.rows.length === 1 ? 'property' : 'properties'}</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {result.rows.map((row) => {
          const property = getPropertySummary(row.property_public_id)
          return property ? <PropertyCard key={row.property_public_id} property={property} /> :
            <article key={row.property_public_id} className="glass-card rounded-lg border border-border-subtle p-5 shadow-e1">
              <h2 className="font-display text-heading-3 text-ink-900">Listing unavailable</h2>
              <p className="mt-2 text-body-sm text-ink-700">This property is no longer in the current listings. You can remove it from your shortlist.</p>
              <div className="mt-4"><SaveButton publicId={row.property_public_id} title="unavailable listing" /></div>
            </article>
        })}
      </div>
    </>}
    <Link href="/account" className="mt-8 inline-flex min-h-11 items-center text-label text-brand-700 underline underline-offset-4">Back to account</Link>
  </div></PageShell>
}
