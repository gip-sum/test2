import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminShell, Unreadable } from '@/components/admin/AdminShell'
import { ListingRows } from '@/components/admin/ListingRows'
import { Pagination } from '@/components/ui/Pagination'
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
    <nav aria-label="Filter by status"><ul className="flex flex-wrap gap-2">{ADMIN_FILTERS.map((f) => {
      const current = f.key === query.status, n = countOf(f.status)
      return <li key={f.key}><Link href={listingsHref({ status: f.key })} aria-current={current ? 'page' : undefined}
        className={cn('inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-label font-semibold', current ? 'border-brand-600 bg-brand-600 text-on-brand' : 'border-border-subtle bg-surface-000 text-ink-900 hover:border-border-strong')}>
        {f.label}{n !== null && <span className="tabular">{n}</span>}</Link></li>
    })}</ul></nav>
    <h2 className="mt-6 font-display text-heading-2 text-ink-900">{filter.key === 'all' ? 'All submitted listings' : filter.label}{result && <span className="tabular text-ink-500"> ({result.total})</span>}</h2>
    <p className="mt-1 text-body-sm text-ink-700">{filter.key === 'review' ? 'Oldest submission first.' : 'Most recently changed first.'} Private drafts that were never submitted are not listed.</p>
    <div className="mt-4">{!result ? <Unreadable what="Listings" /> : result.rows.length === 0 ? <p className="rounded-lg border border-border-subtle bg-surface-000 p-5 text-body-sm text-ink-700">No listings have this status.</p> : <ListingRows rows={result.rows} queue={filter.key === 'review'} now={now} />}</div>
    {result && <Pagination page={Math.min(query.page, pageCount)} pageCount={pageCount} hrefForPage={(page) => listingsHref({ ...query, page })} />}
  </AdminShell>
}
