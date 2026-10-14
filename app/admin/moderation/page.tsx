import type { Metadata } from 'next'
import { AdminShell, Unreadable } from '@/components/admin/AdminShell'
import { ListingRows } from '@/components/admin/ListingRows'
import { Pagination } from '@/components/ui/Pagination'
import { requireStaff } from '@/lib/admin/queries'
import { moderationQueue } from '@/lib/moderation/queries'
import { ADMIN_PAGE_SIZE, parseListingsQuery } from '@/lib/admin/model'

export const metadata: Metadata = { title: 'Moderation queue', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** The review queue, oldest first, shared by admins and moderators. */
export default async function ModerationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { page } = parseListingsQuery(await searchParams)
  const { role, now } = await requireStaff(page > 1 ? `/admin/moderation?page=${page}` : '/admin/moderation', ['ADMIN', 'MODERATOR'])
  const result = await moderationQueue(page).catch(() => null)
  const pageCount = result ? Math.max(1, Math.ceil(result.total / ADMIN_PAGE_SIZE)) : 1
  return <AdminShell current="moderation" title="Moderation queue" role={role}>
    <p className="max-w-3xl rounded-md bg-surface-200 p-4 text-body-sm text-ink-900">Open a submitted copy to review its facts and photos, then approve, reject or request corrections. Listings stay private while they wait.</p>
    <h2 className="mt-6 font-display text-heading-2 text-ink-900">Waiting for review{result && <span className="tabular text-ink-500"> ({result.total})</span>}</h2>
    <p className="mt-1 text-body-sm text-ink-700">Oldest submission first. Waits over 2 days are marked.</p>
    <div className="mt-4">{!result ? <Unreadable what="The queue" /> : result.rows.length === 0 ? <p className="rounded-lg border border-border-subtle bg-surface-000 p-5 text-body-sm text-ink-700">Nothing is waiting for review.</p> : <ListingRows rows={result.rows} queue now={now} />}</div>
    {result && <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} hrefForPage={(p) => p > 1 ? `/admin/moderation?page=${p}` : '/admin/moderation'} />}
  </AdminShell>
}
