import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OwnerShell } from '@/components/workspace/OwnerShell'
import { PropertyCard } from '@/components/dashboard/PropertyCard'
import { Pagination } from '@/components/ui/Pagination'
import { buttonClassName } from '@/components/ui/Button'
import { BuildingIcon, PlusIcon } from '@/components/ui/icons'
import { getVerifiedUser } from '@/lib/auth/session'
import { loadDashboard } from '@/lib/dashboard/queries'
import { arrange, dashboardHref, parseQuery, EXPIRY_WARNING_DAYS, FILTERS, SORTS } from '@/lib/dashboard/model'
import { countUnreadNotifications } from '@/lib/enquiry/queries'
import { publishingConfigured } from '@/lib/listings/queries'
import { cn } from '@/lib/cn'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { RestoreFocus } from '@/components/a11y/RestoreFocus'

export const metadata: Metadata = { title: 'My properties', robots: { index: false, follow: false } }

const EMPTY_TITLE: Record<(typeof FILTERS)[number]['key'], string> = {
  all: 'No properties', draft: 'No drafts', review: 'Nothing under review', active: 'No active listings',
  expired: 'No expired listings', rejected: 'No rejected listings', corrections: 'Nothing waiting for corrections', withdrawn: 'No withdrawn listings',
}
export const dynamic = 'force-dynamic'

/**
 * The seller's workspace (Phase 19).
 *
 * The URL is the state: `status`, `sort` and `page` come from the address
 * bar and every control here is a link that changes them, so back, refresh
 * and a shared link land on exactly this view. Nothing is mirrored in
 * component state.
 */
export default async function SellerDashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseQuery(await searchParams)
  const user = await getVerifiedUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(dashboardHref(query))}`)
  const [result, unread] = await Promise.all([loadDashboard(user), countUnreadNotifications(user)])
  const publishing = publishingConfigured()

  return <OwnerShell current="properties" title="My properties" description="Manage your listings, drafts and next steps." unread={unread}
    actions={<Link href="/post" className={buttonClassName({ variant: 'primary' })}><PlusIcon className="size-4" />Post a property</Link>}>
    {/* Where focus lands after a card's action refreshes this page (UI-09). */}
    <RestoreFocus token={crypto.randomUUID()} />
    {!result.ok ? <ErrorState surface="workspace" title="Your properties could not be loaded"
      action={<Link href={dashboardHref(query)} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Reload</Link>}>
      Nothing has changed with your drafts or listings. Please try again.
    </ErrorState> : result.cards.length === 0 ? <EmptyState surface="workspace" icon={<BuildingIcon />} title="You have not posted a property yet"
      action={<Link href="/post" className={buttonClassName({ variant: 'primary' })}>Post your first property</Link>}>
      Start with the basics. Your draft saves as you go and stays private until you submit it for review.
    </EmptyState> : <Workspace cards={result.cards} query={query} publishing={publishing} />}
  </OwnerShell>
}

function Workspace({ cards, query, publishing }: { cards: Parameters<typeof arrange>[0]; query: ReturnType<typeof parseQuery>; publishing: boolean }) {
  const view = arrange(cards, query)
  const filter = FILTERS.find((f) => f.key === query.status)!
  return <>
    <dl className="workspace-summary workspace-counts [&_dt]:text-caption [&_dt]:text-ink-700 [&_dd]:mt-1 [&_dd]:text-[26px] [&_dd]:font-semibold [&_dd]:leading-tight [&_dd]:text-ink-900" aria-label="Property summary">
      <div><dt>Properties</dt><dd>{view.counts.all}</dd></div>
      <div><dt>Active</dt><dd>{view.counts.active}</dd></div>
      <div><dt>Under review</dt><dd>{view.counts.review}</dd></div>
      <div><dt>Need corrections</dt><dd>{view.counts.rejected + view.counts.corrections}</dd></div>
    </dl>
    <nav aria-label="Filter by status" className="workspace-tabs mt-5">
      <ul className="flex flex-wrap gap-x-1">
        {FILTERS.map((f) => {
          const current = f.key === query.status
          return <li key={f.key}>
            <Link href={dashboardHref({ status: f.key, sort: query.sort })} aria-current={current ? 'page' : undefined}
              className={cn('inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-label font-semibold', current ? 'border-brand-700 text-brand-700' : 'border-transparent text-ink-700 hover:text-ink-900')}>
              {f.label}<span className="tabular">{view.counts[f.key]}</span>
            </Link>
          </li>
        })}
      </ul>
    </nav>

    {view.expiringSoon > 0 && <p className="mt-4 flex flex-wrap items-center gap-x-3 rounded-md border border-border-subtle bg-warn-100 px-4 py-2 text-body-sm text-ink-900">
      <strong>{view.expiringSoon} active {view.expiringSoon === 1 ? 'listing expires' : 'listings expire'} within {EXPIRY_WARNING_DAYS} days.</strong>{' '}
      <Link href={dashboardHref({ status: 'active', sort: 'expiring' })} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4">Review expiring listings</Link>
    </p>}

    <section aria-labelledby="properties-heading" className="mt-4">
      <div className="workspace-toolbar">
        <h2 id="properties-heading" tabIndex={-1} className="text-body font-semibold text-ink-900">{filter.key === 'all' ? 'All properties' : filter.label} <span className="tabular font-normal text-ink-500">({view.total})</span></h2>
        <nav aria-label="Sort properties" className="flex flex-wrap items-center gap-x-4 text-body-sm">
          <span className="text-ink-700">Sort:</span>
          {SORTS.map((s) => <Link key={s.key} href={dashboardHref({ status: query.status, sort: s.key })} aria-current={s.key === query.sort ? 'page' : undefined}
            className={cn('inline-flex min-h-11 items-center underline-offset-4', s.key === query.sort ? 'font-semibold text-ink-900 no-underline' : 'text-brand-700 underline')}>{s.label}</Link>)}
        </nav>
      </div>
      {view.visible.length === 0
        // The shared empty state (UI-09), named for the filter: "No drafts"
        // says what an empty list cannot.
        ? <EmptyState surface="workspace" heading="h3" title={EMPTY_TITLE[filter.key]}
          action={<Link href={dashboardHref({ sort: query.sort })} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Show all properties</Link>}>
          No properties have this status.
        </EmptyState>
        : <div className="workspace-panel overflow-hidden"><div aria-hidden="true" className="hidden grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-4 border-b border-border-subtle bg-surface-100 px-4 py-3 text-caption font-semibold text-ink-700 lg:grid"><span>Property</span><span>Price</span><span>Status</span><span>Updated / enquiries</span></div>{view.visible.map((card) => <PropertyCard key={card.draftId} card={card} publishing={publishing} />)}</div>}
      <Pagination page={view.page} pageCount={view.pageCount} hrefForPage={(page) => dashboardHref({ ...query, page })} />
    </section>

    {view.removed.length > 0 && <details className="workspace-panel mt-5 px-4 py-2">
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-ink-900"><h2 className="inline text-body font-semibold">Removed ({view.removed.length})</h2></summary>
      <p className="mt-2 text-body-sm text-ink-700">Removed listings are permanent and are not counted above. Their working drafts and history are kept.</p>
      <div className="mt-3 -mx-4 border-t border-border-subtle">{view.removed.map((card) => <PropertyCard key={card.draftId} card={card} publishing={publishing} />)}</div>
    </details>}
  </>
}
