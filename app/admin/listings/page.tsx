import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminShell, Unreadable } from '@/components/admin/AdminShell'
import { ListingRows } from '@/components/admin/AdminParts'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { adminListings, adminOverview, requireStaff } from '@/lib/admin/queries'
import { ADMIN_FILTERS, ADMIN_PAGE_SIZE, listingsHref, parseListingsQuery, type AdminFilter } from '@/lib/admin/model'

export const metadata: Metadata = { title: 'Admin listings', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** What a status with nothing in it would hold (UI-20). */
const EMPTY: Record<AdminFilter, string> = {
  all: 'Submitted listings appear here. Private drafts that were never submitted are not listed.',
  review: 'Listings a seller has submitted appear here until someone decides.',
  active: 'Approved listings appear here while they are public.',
  expired: 'Listings that reach the end of their approval appear here.',
  rejected: 'Listings a reviewer rejects appear here, with the reason given.',
  corrections: 'Listings sent back for corrections appear here until the seller re-submits.',
  withdrawn: 'Listings their sellers take down appear here.',
  removed: 'Listings removed from the marketplace appear here.',
}

/** Every submitted listing; status and page are the URL. */
export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseListingsQuery(await searchParams)
  const { role, now } = await requireStaff(listingsHref(query))
  const [result, overview] = await Promise.all([adminListings(query.status, query.page), adminOverview()])
  const pageCount = result ? Math.max(1, Math.ceil(result.total / ADMIN_PAGE_SIZE)) : 1
  const filter = ADMIN_FILTERS.find((f) => f.key === query.status)!
  const countOf = (status: (typeof ADMIN_FILTERS)[number]['status']) => overview ? (status ? overview.listings[status] ?? 0 : Object.entries(overview.listings).filter(([k]) => k !== 'DRAFT').reduce((sum, [, n]) => sum + (n ?? 0), 0)) : null
  return <AdminShell current="listings" title="Listings" role={role} description="Every submitted listing, by status. Open one to see its submitted copy and decision history.">
    <section aria-labelledby="listings-heading" className="admin-panel">
      {/* The status navigation (UI-18's pattern): links with the overview's counts, the current one marked in words and shape. */}
      <nav aria-label="Filter by status" className="dash-status"><ul>{ADMIN_FILTERS.map((f) => {
        const current = f.key === query.status, n = countOf(f.status)
        return <li key={f.key}><Link href={listingsHref({ status: f.key })} aria-current={current ? 'page' : undefined} data-empty={n === 0 || undefined} className="dash-status-link">
          <span>{f.label}</span>{n !== null && <span className="dash-status-count tabular">{n}</span>}</Link></li>
      })}</ul></nav>
      <div className="admin-panel-head">
        <h2 id="listings-heading" className="admin-panel-title">{filter.key === 'all' ? 'All submitted listings' : filter.label}{result && <span className="tabular font-normal text-ink-500"> ({result.total})</span>}</h2>
        <p className="text-caption text-ink-700">{filter.key === 'review' ? 'Oldest submission first.' : 'Most recently changed first.'}</p>
      </div>
      {!result ? <div className="p-4"><Unreadable what="Listings" /></div>
        : result.rows.length === 0 ? <div className="px-5 pb-5"><EmptyState surface="workspace" heading="h3" title={query.page > 1 ? 'No listings on this page' : filter.key === 'all' ? 'No submitted listings' : `No listings ${filter.key === 'review' ? 'under review' : `marked ${filter.label.toLowerCase()}`}`}
          action={filter.key !== 'all' || query.page > 1 ? <Link href={listingsHref({ status: 'all' })} className="inline-flex min-h-11 items-center text-body-sm font-semibold text-brand-700 underline underline-offset-4">Show all listings</Link> : undefined}>{EMPTY[filter.key]}</EmptyState></div>
          : <ListingRows rows={result.rows} now={now} queue={filter.key === 'review'} start={(query.page - 1) * ADMIN_PAGE_SIZE} label={filter.key === 'all' ? 'Submitted listings' : `${filter.label} listings`} />}
    </section>
    <p className="mt-3 text-caption text-ink-500">Private drafts that were never submitted are not listed.</p>
    {result && <Pagination page={Math.min(query.page, pageCount)} pageCount={pageCount} hrefForPage={(page) => listingsHref({ ...query, page })} />}
  </AdminShell>
}
