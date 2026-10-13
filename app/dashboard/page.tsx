import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { PropertyCard } from '@/components/dashboard/PropertyCard'
import { Pagination } from '@/components/ui/Pagination'
import { buttonClassName } from '@/components/ui/Button'
import { getVerifiedUser } from '@/lib/auth/session'
import { loadDashboard } from '@/lib/dashboard/queries'
import { arrange, dashboardHref, parseQuery, EXPIRY_WARNING_DAYS, FILTERS, SORTS } from '@/lib/dashboard/model'
import { countUnreadNotifications } from '@/lib/enquiry/queries'
import { publishingConfigured } from '@/lib/listings/queries'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'My properties', robots: { index: false, follow: false } }
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

  return <PageShell><div className="mx-auto max-w-5xl px-4 pb-28 pt-9 sm:pt-14">
    <p className="text-overline uppercase tracking-widest text-supply-700">Seller workspace</p>
    <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
      <h1 className="font-display text-heading-1 text-ink-900">My properties</h1>
      <Link href="/post" className={buttonClassName({ variant: 'supply' })}>Post a property</Link>
    </div>
    <p className="mt-2 text-body text-ink-700">Your drafts and listings, one card per property.</p>
    <p className="mt-1 text-body-sm">
      <Link href="/dashboard/enquiries" className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4">Enquiries inbox</Link>
      {unread ? <span className="ml-2 text-ink-700">{unread >= 100 ? '100 or more' : unread} unread {unread === 1 ? 'notification' : 'notifications'}</span> : null}
    </p>

    {!result.ok ? <div role="alert" className="mt-8 rounded-lg border border-border-strong bg-surface-000 p-6">
      <h2 className="font-display text-heading-3 text-ink-900">Your properties could not be loaded</h2>
      <p className="mt-2 text-body-sm text-ink-700">Nothing has changed with your drafts or listings. Please try again.</p>
      <Link href={dashboardHref(query)} className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Reload</Link>
    </div> : result.cards.length === 0 ? <div className="mt-8 rounded-lg border border-border-subtle bg-surface-000 p-6 shadow-e1">
      <h2 className="font-display text-heading-3 text-ink-900">You have not posted a property yet</h2>
      <p className="mt-2 text-body-sm text-ink-700">Start with the basics. Your draft saves as you go and stays private until you submit it for review.</p>
      <Link href="/post" className={cn(buttonClassName({ variant: 'supply' }), 'mt-4')}>Post your first property</Link>
    </div> : <Workspace cards={result.cards} query={query} publishing={publishing} />}
  </div></PageShell>
}

function Workspace({ cards, query, publishing }: { cards: Parameters<typeof arrange>[0]; query: ReturnType<typeof parseQuery>; publishing: boolean }) {
  const view = arrange(cards, query)
  const filter = FILTERS.find((f) => f.key === query.status)!
  return <>
    <nav aria-label="Filter by status" className="mt-8">
      <ul className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const current = f.key === query.status
          return <li key={f.key}>
            <Link href={dashboardHref({ status: f.key, sort: query.sort })} aria-current={current ? 'page' : undefined}
              className={cn('inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-label font-semibold', current ? 'border-brand-600 bg-brand-600 text-on-brand' : 'border-border-subtle bg-surface-000 text-ink-900 hover:border-border-strong')}>
              {f.label}<span className="tabular">{view.counts[f.key]}</span>
            </Link>
          </li>
        })}
      </ul>
    </nav>

    {view.expiringSoon > 0 && <p className="mt-5 rounded-md bg-warn-100 p-4 text-body-sm text-ink-900">
      <strong>{view.expiringSoon} active {view.expiringSoon === 1 ? 'listing expires' : 'listings expire'} within {EXPIRY_WARNING_DAYS} days.</strong>{' '}
      <Link href={dashboardHref({ status: 'active', sort: 'expiring' })} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4">Review expiring listings</Link>
    </p>}

    <section aria-labelledby="properties-heading" className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="properties-heading" className="font-display text-heading-2 text-ink-900">{filter.key === 'all' ? 'All properties' : filter.label} <span className="tabular text-ink-500">({view.total})</span></h2>
        <nav aria-label="Sort properties" className="flex flex-wrap items-center gap-x-4 text-body-sm">
          <span className="text-ink-700">Sort:</span>
          {SORTS.map((s) => <Link key={s.key} href={dashboardHref({ status: query.status, sort: s.key })} aria-current={s.key === query.sort ? 'page' : undefined}
            className={cn('inline-flex min-h-11 items-center underline-offset-4', s.key === query.sort ? 'font-semibold text-ink-900 no-underline' : 'text-brand-700 underline')}>{s.label}</Link>)}
        </nav>
      </div>
      {view.visible.length === 0
        ? <p className="mt-4 rounded-lg border border-border-subtle bg-surface-000 p-5 text-body-sm text-ink-700">No properties have this status. <Link href={dashboardHref({ sort: query.sort })} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Show all properties</Link></p>
        : <div className="mt-4 grid gap-4 md:grid-cols-2">{view.visible.map((card) => <PropertyCard key={card.draftId} card={card} publishing={publishing} />)}</div>}
      <Pagination page={view.page} pageCount={view.pageCount} hrefForPage={(page) => dashboardHref({ ...query, page })} />
    </section>

    {view.removed.length > 0 && <details className="mt-10 rounded-lg border border-border-subtle bg-surface-100 p-4">
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-ink-900"><h2 className="inline text-body font-semibold">Removed ({view.removed.length})</h2></summary>
      <p className="mt-2 text-body-sm text-ink-700">Removed listings are permanent and are not counted above. Their working drafts and history are kept.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{view.removed.map((card) => <PropertyCard key={card.draftId} card={card} publishing={publishing} />)}</div>
    </details>}
  </>
}
