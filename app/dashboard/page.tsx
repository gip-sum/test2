import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OwnerShell } from '@/components/workspace/OwnerShell'
import { PropertyCard } from '@/components/dashboard/PropertyCard'
import { Pagination } from '@/components/ui/Pagination'
import { buttonClassName } from '@/components/ui/Button'
import { BuildingIcon, MailIcon, PlusIcon } from '@/components/ui/icons'
import { getVerifiedUser } from '@/lib/auth/session'
import { loadDashboard } from '@/lib/dashboard/queries'
import { arrange, attentionItems, dashboardHref, parseQuery, FILTERS, type DashboardQuery, type PropertyCard as PropertyCardModel } from '@/lib/dashboard/model'
import { loadActivity, type ActivityData } from '@/lib/analytics/queries'
import { buildPerformance, combineSeries, sumTotals } from '@/lib/analytics/model'
import { AttentionPanel, EMPTY_COPY, InterestPanel, PanelHeading, SortControl, StatusNav } from '@/components/dashboard/DashboardParts'
import { countUnreadNotifications } from '@/lib/enquiry/queries'
import { publishingConfigured } from '@/lib/listings/queries'
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { RestoreFocus } from '@/components/a11y/RestoreFocus'

export const metadata: Metadata = { title: 'My properties', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** The period of the dashboard's buyer-interest figures (the performance page's 30-day range). */
const INTEREST_RANGE = 30

/**
 * The seller's workspace (Phase 19, redrawn in UI-18).
 *
 * The URL is the state: `status`, `sort` and `page` come from the address
 * bar and every control here is a link that changes them, so back, refresh
 * and a shared link land on exactly this view. Nothing is mirrored in
 * component state.
 *
 * UI-18 lays it out around a seller's questions: what is waiting for me
 * (Needs your attention), what I have and what state each is in (the status
 * filters and the cards), and whether buyers are interested (Buyer
 * interest, the measured activity behind the performance page). From
 * 1280px the attention and interest panels sit beside the list; below, they
 * stack: attention first, then the list, then interest.
 */
export default async function SellerDashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseQuery(await searchParams)
  const user = await getVerifiedUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(dashboardHref(query))}`)
  const [result, unread, activity] = await Promise.all([loadDashboard(user), countUnreadNotifications(user), loadActivity(INTEREST_RANGE)])
  const publishing = publishingConfigured()
  const counts = result.ok ? arrange(result.cards, query).counts : null

  return <OwnerShell current="properties" title="My properties" unread={unread}
    description={counts && counts.all > 0
      ? [plural(counts.all, 'property', 'properties'), counts.active ? `${counts.active} live` : null, counts.review ? `${counts.review} under review` : null, counts.draft ? plural(counts.draft, 'draft', 'drafts') : null].filter(Boolean).join(' · ')
      : 'Post a property, follow its review and answer buyers, all from here.'}
    actions={<>
      <Link href="/dashboard/enquiries" className={buttonClassName({ variant: 'secondaryBrand', className: 'gap-2' })}>
        <MailIcon className="size-4" />Enquiries
        {unread != null && unread > 0 && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-caption font-semibold text-on-brand tabular" aria-label={`${unread} unread notifications`}>{unread > 99 ? '99+' : unread}</span>}
      </Link>
      <Link href="/post" className={buttonClassName({ variant: 'primary' })}><PlusIcon className="size-4" />Post a property</Link>
    </>}>
    {/* Where focus lands after a card's action refreshes this page (UI-09). */}
    <RestoreFocus token={crypto.randomUUID()} />
    {!result.ok ? <ErrorState surface="workspace" title="Your properties could not be loaded"
      action={<Link href={dashboardHref(query)} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Reload</Link>}>
      Nothing has changed with your drafts or listings. Please try again.
    </ErrorState> : result.cards.length === 0 ? <EmptyState surface="workspace" icon={<BuildingIcon />} title="You have not posted a property yet"
      action={<Link href="/post" className={buttonClassName({ variant: 'primary' })}>Post your first property</Link>}>
      Start with the basics. Your draft saves as you go and stays private until you submit it for review.
    </EmptyState> : <Workspace cards={result.cards} query={query} publishing={publishing} activity={activity} />}
  </OwnerShell>
}

function Workspace({ cards, query, publishing, activity }: { cards: PropertyCardModel[]; query: DashboardQuery; publishing: boolean; activity: ActivityData }) {
  const view = arrange(cards, query)
  const filter = FILTERS.find((f) => f.key === query.status)!
  const performance = activity.ok ? buildPerformance({ cards, ...activity, range: INTEREST_RANGE }) : null
  const byListing = new Map((performance ?? []).map((p) => [p.listingId, p.current]))
  const waiting = cards.reduce((n, c) => n + (c.enquiries && c.enquiries !== 'unavailable' ? c.enquiries.newCount : 0), 0)
  const submitted = cards.some((c) => c.listing && c.status !== 'REMOVED')
  const empty = EMPTY_COPY[filter.key]

  return <div className="dash-grid">
    <div className="dash-attention"><AttentionPanel items={attentionItems(cards.filter((c) => c.status !== 'REMOVED'))} /></div>

    <section aria-labelledby="properties-heading" className="dash-list min-w-0">
      <div className="dash-panel">
        <StatusNav counts={view.counts} query={query} />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <PanelHeading id="properties-heading" count={view.total}>{filter.key === 'all' ? 'All properties' : filter.label}</PanelHeading>
          <SortControl query={query} />
        </div>
      </div>
      {view.visible.length === 0
        // The shared empty state (UI-09), named for the filter and saying
        // what would be here (UI-18).
        ? <EmptyState surface="workspace" heading="h3" title={empty.title} className="mt-3"
          action={<div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href={dashboardHref({ sort: query.sort })} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Show all properties</Link>
            <Link href="/post" className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Post a property</Link>
          </div>}>
          {empty.body}
        </EmptyState>
        : <div className="mt-3 grid gap-3">{view.visible.map((card) => <PropertyCard key={card.draftId} card={card} publishing={publishing} views={card.listing ? byListing.get(card.listing.id) : undefined} />)}</div>}
      <Pagination page={view.page} pageCount={view.pageCount} hrefForPage={(page) => dashboardHref({ ...query, page })} />

      {view.removed.length > 0 && <details className="dash-panel mt-4 px-4 py-2">
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-ink-900"><h2 className="inline text-body font-semibold">Removed ({view.removed.length})</h2></summary>
        <p className="mt-2 text-body-sm text-ink-700">Removed listings are permanent and are not counted above. Their working drafts and history are kept.</p>
        <div className="mt-3 grid gap-3 pb-2">{view.removed.map((card) => <PropertyCard key={card.draftId} card={card} publishing={publishing} />)}</div>
      </details>}
    </section>

    <div className="dash-interest">
      <InterestPanel state={!submitted ? { kind: 'none' }
        : activity.ok ? { kind: 'ready', totals: sumTotals((performance ?? []).map((p) => p.current)), series: combineSeries(performance ?? []), waiting }
        : { kind: 'unavailable', reason: activity.reason, waiting }} />
    </div>
  </div>
}
