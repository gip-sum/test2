import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { DailyColumns } from '@/components/analytics/DailyColumns'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { getVerifiedUser } from '@/lib/auth/session'
import { buildPerformance, parseQuery, performanceHref, RANGES, RATE_MIN_VIEWS, type ListingPerformance, type PerformanceQuery, type Totals } from '@/lib/analytics/model'
import { loadPerformance } from '@/lib/analytics/queries'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'Listing performance', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const link = 'inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4'
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const viewsText = (t: Totals) => t.views === null ? 'not tracked' : plural(t.views, 'view', 'views')
const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', dateStyle: 'medium' })

/**
 * Listing performance (Phase 20). The period and the listing are the URL:
 * `range` (7, 30, 90) and `listing`. Every figure here was measured; what
 * was not measured says so.
 */
export default async function PerformancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseQuery(await searchParams)
  const user = await getVerifiedUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(performanceHref(query))}`)
  const data = await loadPerformance(user, query.range)
  const listings = data.ok ? buildPerformance({ ...data, range: query.range }) : []
  const selected = query.listing ? listings.find((l) => l.listingId === query.listing) : undefined

  return <PageShell><div className="mx-auto max-w-5xl px-4 pb-28 pt-9 sm:pt-14">
    <p className="text-overline uppercase tracking-widest text-supply-700">Seller workspace</p>
    <h1 className="mt-2 break-words font-display text-heading-1 text-ink-900">{selected ? selected.card.title : 'Listing performance'}</h1>
    <p className="mt-1 flex flex-wrap gap-x-5 text-body-sm">
      <Link href="/dashboard" className={link}>My properties</Link>
      {query.listing && <Link href={performanceHref({ range: query.range })} className={link}>All listings</Link>}
    </p>

    <nav aria-label="Period" className="mt-6">
      <ul className="flex flex-wrap gap-2">{RANGES.map((range) => {
        const current = range === query.range
        return <li key={range}><Link href={performanceHref({ ...query, range })} aria-current={current ? 'page' : undefined}
          className={cn('inline-flex min-h-11 items-center rounded-full border px-4 text-label font-semibold', current ? 'border-brand-600 bg-brand-600 text-on-brand' : 'border-border-subtle bg-surface-000 text-ink-900 hover:border-border-strong')}>Last {range} days</Link></li>
      })}</ul>
    </nav>
    <p className="mt-4 max-w-3xl text-body-sm text-ink-700">A view is one browser opening a listing’s public page on one day (India time). Your own visits and known crawlers are not counted, and a listing is counted only while it is public. Saves are buyers who have it saved right now.</p>

    {!data.ok ? <div role="alert" className="mt-8 rounded-lg border border-border-strong bg-surface-000 p-6">
      <h2 className="font-display text-heading-3 text-ink-900">{data.reason === 'not-ready' ? 'Performance data is not available yet' : 'Performance could not be loaded'}</h2>
      <p className="mt-2 text-body-sm text-ink-700">{data.reason === 'not-ready' ? 'View and save counting has not been switched on for this site yet. Your listings and enquiries are unaffected.' : 'Nothing has changed with your listings. Please try again.'}</p>
      <Link href={performanceHref(query)} className={link}>Reload</Link>
    </div> : listings.length === 0 ? <div className="mt-8 rounded-lg border border-border-subtle bg-surface-000 p-6 shadow-e1">
      <h2 className="font-display text-heading-3 text-ink-900">No listings to measure yet</h2>
      <p className="mt-2 text-body-sm text-ink-700">Performance appears once a property has been submitted. Drafts are private and have no public page to view.</p>
      <Link href="/dashboard" className={link}>Go to My properties</Link>
    </div> : query.listing && !selected ? <div role="alert" className="mt-8 rounded-lg border border-border-strong bg-surface-000 p-6">
      <h2 className="font-display text-heading-3 text-ink-900">This listing is not available here</h2>
      <p className="mt-2 text-body-sm text-ink-700">It may have been removed, or it belongs to another account.</p>
      <Link href={performanceHref({ range: query.range })} className={link}>See all your listings</Link>
    </div> : selected ? <Detail listing={selected} query={query} viewsSince={data.viewsSince} /> : <Overview listings={listings} query={query} />}
  </div></PageShell>
}

function Overview({ listings, query }: { listings: ListingPerformance[]; query: PerformanceQuery }) {
  return <section aria-labelledby="overview-heading" className="mt-8">
    <h2 id="overview-heading" className="font-display text-heading-2 text-ink-900">Your listings, last {query.range} days</h2>
    <p className="mt-1 text-body-sm text-ink-700">Removed listings and never-submitted drafts are not shown.</p>
    <table className="mt-4 hidden w-full border-collapse text-left text-body-sm md:table">
      <thead><tr className="border-b border-border-strong text-ink-700">
        <th scope="col" className="py-2 pr-3 font-semibold">Listing</th><th scope="col" className="px-3 py-2 text-right font-semibold">Views</th><th scope="col" className="px-3 py-2 text-right font-semibold">Enquiries</th><th scope="col" className="py-2 pl-3 text-right font-semibold">Saved now</th>
      </tr></thead>
      <tbody>{listings.map((l) => <tr key={l.listingId} className="border-b border-border-subtle align-top">
        <th scope="row" className="py-3 pr-3 font-normal"><StatusBadge status={l.card.status} /><Link href={performanceHref({ range: query.range, listing: l.listingId })} className={cn(link, 'block break-words')}>{l.card.title}</Link></th>
        <td className="tabular px-3 py-3 text-right text-ink-900">{l.current.views ?? 'Not tracked'}</td>
        <td className="tabular px-3 py-3 text-right text-ink-900">{l.current.enquiries}</td>
        <td className="tabular py-3 pl-3 text-right text-ink-900">{l.saves ?? 'Unavailable'}</td>
      </tr>)}</tbody>
    </table>
    <ul className="mt-4 grid gap-3 md:hidden">{listings.map((l) => <li key={l.listingId} className="min-w-0 rounded-lg border border-border-subtle bg-surface-000 p-4 shadow-e1">
      <StatusBadge status={l.card.status} />
      <Link href={performanceHref({ range: query.range, listing: l.listingId })} className={cn(link, 'mt-1 break-words')}>{l.card.title}</Link>
      <p className="text-body-sm text-ink-700">{viewsText(l.current)} · {plural(l.current.enquiries, 'enquiry', 'enquiries')} · {l.saves === null ? 'saves unavailable' : `saved by ${plural(l.saves, 'buyer', 'buyers')}`}</p>
    </li>)}</ul>
  </section>
}

function Detail({ listing: l, query, viewsSince }: { listing: ListingPerformance; query: PerformanceQuery; viewsSince: string | null }) {
  const { card } = l
  return <>
    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1">
      <StatusBadge status={card.status} />
      {card.status === 'ACTIVE' && <Link href={`/listing/${l.listingId}`} className={link}>View public page</Link>}
      <Link href={`/post/drafts/${card.draftId}/lifecycle`} className={link}>Publishing status</Link>
      <Link href={`/dashboard/enquiries?listing=${l.listingId}`} className={link}>Enquiries inbox</Link>
    </div>
    <section aria-labelledby="totals-heading" className="mt-6">
      <h2 id="totals-heading" className="sr-only">Totals for the last {query.range} days</h2>
      <dl className="grid gap-3 sm:grid-cols-3">
        <Tile label={`Views, last ${query.range} days`} value={l.current.views === null ? 'Not tracked' : String(l.current.views)} note={`Previous ${query.range} days: ${viewsText(l.previous)}`} />
        <Tile label={`Enquiries, last ${query.range} days`} value={String(l.current.enquiries)} note={`Previous ${query.range} days: ${plural(l.previous.enquiries, 'enquiry', 'enquiries')}`} />
        <Tile label="Saved now" value={l.saves === null ? 'Unavailable' : String(l.saves)} note={l.saves === null ? 'Save counts could not be loaded.' : `${plural(l.saves, 'buyer has', 'buyers have')} it saved`} />
      </dl>
      <p className="mt-3 text-body-sm text-ink-700">{l.rate === null
        ? `Enquiry rate appears once the period has at least ${RATE_MIN_VIEWS} views.`
        : <>Enquiry rate: <strong className="text-ink-900">{l.rate} enquiries per 100 views</strong> in the last {query.range} days.</>}</p>
      {l.current.untrackedDays > 0 && <p className="mt-1 text-body-sm text-ink-700">{viewsSince ? `Views are counted from ${day(viewsSince)}.` : 'View counting has not started.'} Earlier days in this period show as not tracked, not as zero.</p>}
    </section>
    <section aria-labelledby="trend-heading" className="mt-8">
      <h2 id="trend-heading" className="font-display text-heading-2 text-ink-900">Day by day</h2>
      <div className="mt-4 grid gap-6 rounded-lg border border-border-subtle bg-surface-000 p-4 md:grid-cols-2">
        <DailyColumns title="Views per day" unit={['view', 'views']} points={l.series.map((p) => ({ day: p.day, value: p.views }))} />
        <DailyColumns title="Enquiries per day" unit={['enquiry', 'enquiries']} points={l.series.map((p) => ({ day: p.day, value: p.enquiries }))} />
      </div>
      <details className="mt-4 rounded-lg border border-border-subtle bg-surface-000 p-4">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-ink-900">Daily figures</summary>
        <div className="mt-2 max-h-96 overflow-y-auto">
          <table className="w-full border-collapse text-left text-body-sm">
            <caption className="sr-only">Views and enquiries per day, last {query.range} days</caption>
            <thead><tr className="border-b border-border-strong text-ink-700"><th scope="col" className="py-2 pr-3 font-semibold">Date</th><th scope="col" className="px-3 py-2 text-right font-semibold">Views</th><th scope="col" className="py-2 pl-3 text-right font-semibold">Enquiries</th></tr></thead>
            <tbody>{[...l.series].reverse().map((p) => <tr key={p.day} className="border-b border-border-subtle">
              <th scope="row" className="py-2 pr-3 font-normal text-ink-900">{day(p.day)}</th>
              <td className="tabular px-3 py-2 text-right text-ink-900">{p.views ?? 'Not tracked'}</td>
              <td className="tabular py-2 pl-3 text-right text-ink-900">{p.enquiries}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </details>
    </section>
  </>
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-lg border border-border-subtle bg-surface-000 p-4 shadow-e1">
    <dt className="text-body-sm text-ink-700">{label}</dt>
    <dd className="mt-1 font-display text-heading-1 font-semibold text-ink-900">{value}</dd>
    <dd className="mt-1 text-caption text-ink-500">{note}</dd>
  </div>
}
