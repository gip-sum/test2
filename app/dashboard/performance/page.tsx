import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OwnerShell } from '@/components/workspace/OwnerShell'
import { DailyActivityChart } from '@/components/analytics/DailyActivityChart'
import { PeriodPending } from '@/components/analytics/PeriodPending'
import { PeriodSummary } from '@/components/analytics/PeriodSummary'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getVerifiedUser } from '@/lib/auth/session'
import { buildPerformance, combineSeries, enquiriesChange, enquiryRate, parseQuery, performanceHref, RANGES, sumTotals, viewsChange, type DayPoint, type ListingPerformance, type PerformanceQuery, type Totals } from '@/lib/analytics/model'
import { loadPerformance } from '@/lib/analytics/queries'
import { cn } from '@/lib/cn'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'

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

  return <OwnerShell current="performance" title={selected ? selected.card.title : 'Listing performance'} description="Measured views, enquiries and saves for your submitted listings."
    actions={query.listing ? <Link href={performanceHref({ range: query.range })} className={link}>All listings</Link> : undefined}>
    <nav aria-label="Period" className="workspace-tabs">
      <ul className="flex flex-wrap gap-x-1">{RANGES.map((range) => {
        const current = range === query.range
        return <li key={range}><Link href={performanceHref({ ...query, range })} aria-current={current ? 'page' : undefined}
          className={cn('inline-flex min-h-11 items-center border-b-2 px-4 text-label font-semibold', current ? 'border-brand-700 text-brand-700' : 'border-transparent text-ink-700 hover:text-ink-900')}>Last {range} days<PeriodPending /></Link></li>
      })}</ul>
    </nav>
    <details className="mb-4 text-body-sm text-ink-700"><summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-brand-700">How these figures are counted</summary><p className="max-w-3xl pb-3">A view is one browser opening a listing’s public page on one day (India time). Your own visits and known crawlers are not counted, and a listing is counted only while it is public. Saves are buyers who have it saved right now.</p></details>

    <div className="analytics-body">
    {!data.ok ? <ErrorState surface="workspace" title={data.reason === 'not-ready' ? 'Performance data is not available yet' : 'Performance could not be loaded'}
      action={<Link href={performanceHref(query)} className={link}>Reload</Link>}>
      {data.reason === 'not-ready' ? 'View and save counting has not been switched on for this site yet. Your listings and enquiries are unaffected.' : 'Nothing has changed with your listings. Please try again.'}
    </ErrorState> : listings.length === 0 ? <EmptyState surface="workspace" title="No listings to measure yet"
      action={<Link href="/dashboard" className={link}>Go to My properties</Link>}>
      Performance appears once a property has been submitted. Drafts are private and have no public page to view.
    </EmptyState> : query.listing && !selected ? <EmptyState surface="workspace" title="This listing is not available here"
      action={<Link href={performanceHref({ range: query.range })} className={link}>See all your listings</Link>}>
      It may have been removed, or it belongs to another account.
    </EmptyState> : selected ? <Detail listing={selected} query={query} viewsSince={data.viewsSince} /> : <Overview listings={listings} query={query} savesKnown={data.saveCounts !== null} viewsSince={data.viewsSince} />}
    </div>
  </OwnerShell>
}

function Overview({ listings, query, savesKnown, viewsSince }: { listings: ListingPerformance[]; query: PerformanceQuery; savesKnown: boolean; viewsSince: string | null }) {
  const series = combineSeries(listings)
  const current = sumTotals(listings.map((l) => l.current)), previous = sumTotals(listings.map((l) => l.previous))
  return <>
    <section aria-labelledby="totals-heading" className="mb-5">
      <h2 id="totals-heading" className="mb-3 text-body font-semibold text-ink-900">All listings together, last {query.range} days</h2>
      <PeriodSummary current={current} views={viewsChange(current, previous, query.range)} enquiries={enquiriesChange(current, previous)} range={query.range}
        saves={savesKnown ? listings.reduce((n, l) => n + (l.saves ?? 0), 0) : null} rate={enquiryRate(current)} />
      <Untracked totals={current} viewsSince={viewsSince} />
      <div className="workspace-panel mt-3 p-4"><DailyActivityChart id="all-activity" points={series} period={`all listings, last ${query.range} days`} /></div>
      <DailyTable points={series} range={query.range} />
    </section>
    <ListingTable listings={listings} query={query} />
  </>
}

function ListingTable({ listings, query }: { listings: ListingPerformance[]; query: PerformanceQuery }) {
  return <section aria-labelledby="overview-heading" className="workspace-panel overflow-hidden">
    <div className="workspace-toolbar px-4 pt-3"><h2 id="overview-heading" className="text-body font-semibold text-ink-900">Your listings, last {query.range} days</h2><p className="text-caption text-ink-500">{listings.length} {listings.length === 1 ? 'listing' : 'listings'}</p></div>
    <p className="px-4 pb-3 text-caption text-ink-700">Removed listings and never-submitted drafts are not shown.</p>
    <table className="workspace-table hidden w-full border-collapse text-left text-body-sm md:table">
      <thead><tr className="border-b border-border-strong text-ink-700">
        <th scope="col" className="py-2 pl-4 pr-3 font-semibold">Listing</th><th scope="col" className="px-3 py-2 text-right font-semibold">Views</th><th scope="col" className="px-3 py-2 text-right font-semibold">Enquiries</th><th scope="col" className="py-2 pl-3 pr-4 text-right font-semibold">Saved now</th>
      </tr></thead>
      <tbody>{listings.map((l) => <tr key={l.listingId} className="border-b border-border-subtle align-top">
        <th scope="row" className="py-3 pl-4 pr-3 font-normal"><StatusBadge status={l.card.status} /><Link href={performanceHref({ range: query.range, listing: l.listingId })} className={cn(link, 'break-words')}>{l.card.title}</Link></th>
        <td className="tabular px-3 py-3 text-right text-ink-900">{l.current.views ?? 'Not tracked'}</td>
        <td className="tabular px-3 py-3 text-right text-ink-900">{l.current.enquiries}</td>
        <td className="tabular py-3 pl-3 pr-4 text-right text-ink-900">{l.saves ?? 'Unavailable'}</td>
      </tr>)}</tbody>
    </table>
    <ul className="md:hidden">{listings.map((l) => <li key={l.listingId} className="min-w-0 border-t border-border-subtle p-4">
      <StatusBadge status={l.card.status} />
      <Link href={performanceHref({ range: query.range, listing: l.listingId })} className={cn(link, 'mt-1 break-words')}>{l.card.title}</Link>
      <p className="text-body-sm text-ink-700">{viewsText(l.current)} · {plural(l.current.enquiries, 'enquiry', 'enquiries')} · {l.saves === null ? 'saves unavailable' : `saved by ${plural(l.saves, 'buyer', 'buyers')}`}</p>
    </li>)}</ul>
  </section>
}

function Detail({ listing: l, query, viewsSince }: { listing: ListingPerformance; query: PerformanceQuery; viewsSince: string | null }) {
  const { card } = l
  return <>
    <div className="workspace-toolbar mb-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
      <StatusBadge status={card.status} />
      {card.status === 'ACTIVE' && <Link href={`/listing/${l.listingId}`} className={link}>View public page</Link>}
      <Link href={`/post/drafts/${card.draftId}/lifecycle`} className={link}>Publishing status</Link>
      <Link href={`/dashboard/enquiries?listing=${l.listingId}`} className={link}>Enquiries inbox</Link>
      </div>
    </div>
    <section aria-labelledby="totals-heading">
      <h2 id="totals-heading" className="sr-only">Totals for the last {query.range} days</h2>
      <PeriodSummary current={l.current} views={viewsChange(l.current, l.previous, query.range)} enquiries={enquiriesChange(l.current, l.previous)} saves={l.saves} rate={l.rate} range={query.range} />
      <Untracked totals={l.current} viewsSince={viewsSince} />
    </section>
    <section aria-labelledby="trend-heading" className="mt-5">
      <h2 id="trend-heading" className="text-body font-semibold text-ink-900">Day by day</h2>
      <div className="workspace-panel mt-3 p-4"><DailyActivityChart id="listing-activity" points={l.series} period={`last ${query.range} days`} /></div>
      <DailyTable points={l.series} range={query.range} />
    </section>
  </>
}

function Untracked({ totals, viewsSince }: { totals: Totals; viewsSince: string | null }) {
  if (totals.untrackedDays === 0) return null
  return <p className="mt-3 text-body-sm text-ink-700">{viewsSince ? `Views are counted from ${day(viewsSince)}.` : 'View counting has not started.'} Earlier days in this period show as not tracked, not as zero.</p>
}

/** Every figure the chart draws, in a table: the chart is never the only way to read a day. */
function DailyTable({ points, range }: { points: DayPoint[]; range: number }) {
  return <details className="workspace-panel mt-3 px-4 py-2">
    <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-ink-900">Daily figures</summary>
    <div className="mt-2 max-h-96 overflow-y-auto">
      <table className="w-full border-collapse text-left text-body-sm">
        <caption className="sr-only">Views and enquiries per day, last {range} days</caption>
        <thead><tr className="border-b border-border-strong text-ink-700"><th scope="col" className="py-2 pr-3 font-semibold">Date</th><th scope="col" className="px-3 py-2 text-right font-semibold">Views</th><th scope="col" className="py-2 pl-3 text-right font-semibold">Enquiries</th></tr></thead>
        <tbody>{[...points].reverse().map((p) => <tr key={p.day} className="border-b border-border-subtle">
          <th scope="row" className="py-2 pr-3 font-normal text-ink-900">{day(p.day)}</th>
          <td className="tabular px-3 py-2 text-right text-ink-900">{p.views ?? 'Not tracked'}</td>
          <td className="tabular py-2 pl-3 text-right text-ink-900">{p.enquiries}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </details>
}
