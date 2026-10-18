import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminShell, Unreadable } from '@/components/admin/AdminShell'
import { ListingRows } from '@/components/admin/ListingRows'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { adminListings, adminOverview, requireStaff } from '@/lib/admin/queries'
import { ADMIN_FILTERS, ADMIN_PAGE_SIZE, listingsHref, parseListingsQuery } from '@/lib/admin/model'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'Admin listings', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** Every submitted listing; status and page are the URL. */
export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseListingsQuery(await searchParams)
  const { role, now } = await requireStaff(listingsHref(query))
  const [result, overview] = await Promise.all([adminListings(query.status, query.page), adminOverview()])
  const pageCount = result ? Math.max(1, Math.ceil(result.total / ADMIN_PAGE_SIZE)) : 1
  const filter = ADMIN_FILTERS.find((f) => f.key === query.status)!
  const countOf = (status: (typeof ADMIN_FILTERS)[number]['status']) => overview ? (status ? overview.listings[status] ?? 0 : Object.entries(overview.listings).filter(([k]) => k !== 'DRAFT').reduce((sum, [, n]) => sum + (n ?? 0), 0)) : null
  return <AdminShell current="listings" title="Listings" role={role}>
    <nav aria-label="Filter by status" className="workspace-tabs border-b border-border-subtle"><ul className="flex flex-wrap gap-x-4 gap-y-1">{ADMIN_FILTERS.map((f) => {
      const current = f.key === query.status, n = countOf(f.status)
      return <li key={f.key}><Link href={listingsHref({ status: f.key })} aria-current={current ? 'page' : undefined}
        className={cn('inline-flex min-h-11 items-center gap-2 border-b-2 px-1 text-label font-semibold', current ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-700 hover:border-border-strong hover:text-ink-900')}>
        {f.label}{n !== null && <span className={cn('tabular rounded-md px-1.5 py-0.5 text-caption', current ? 'bg-brand-100 text-brand-700' : 'bg-surface-200 text-ink-700')}>{n}</span>}</Link></li>
    })}</ul></nav>
    <div className="workspace-toolbar flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
      <h2 className="font-display text-heading-3 text-ink-900">{filter.key === 'all' ? 'All submitted listings' : filter.label}{result && <span className="tabular font-normal text-ink-500"> ({result.total})</span>}</h2>
      <p className="text-caption text-ink-700">{filter.key === 'review' ? 'Oldest submission first.' : 'Most recently changed first.'}</p>
    </div>
    {result?.rows.length === 0 ? <EmptyState surface="workspace" heading="h3" title={query.page > 1 ? 'No listings on this page' : 'No listings here'}
      action={filter.key !== 'all' || query.page > 1 ? <Link href={listingsHref({ status: 'all' })} className="inline-flex min-h-11 items-center text-body-sm font-semibold text-brand-700 underline underline-offset-4">Show all listings</Link> : undefined}>No listings have this status.</EmptyState>
    : <div className="workspace-panel overflow-hidden rounded-lg border border-border-subtle bg-surface-000">{!result ? <div className="p-4"><Unreadable what="Listings" /></div> : <ListingRows rows={result.rows} queue={filter.key === 'review'} now={now} />}</div>}
    <p className="mt-3 text-caption text-ink-500">Private drafts that were never submitted are not listed.</p>
    {result && <Pagination page={Math.min(query.page, pageCount)} pageCount={pageCount} hrefForPage={(page) => listingsHref({ ...query, page })} />}
  </AdminShell>
}
