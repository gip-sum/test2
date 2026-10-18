import type { Metadata } from 'next'
import { AdminShell, Unreadable } from '@/components/admin/AdminShell'
import { ListingRows } from '@/components/admin/ListingRows'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
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
    <p className="max-w-3xl text-body-sm text-ink-700">Open a submitted copy to review its facts and photos, then approve, reject or request corrections. Listings stay private while they wait.</p>
    <div className="workspace-toolbar mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border-subtle py-4">
      <h2 className="font-display text-heading-3 text-ink-900">Waiting for review{result && <span className="tabular font-normal text-ink-500"> ({result.total})</span>}</h2>
      <p className="text-caption text-ink-700">Oldest submission first. Waits over 2 days are marked.</p>
    </div>
    {result?.rows.length === 0 ? <EmptyState surface="workspace" heading="h3" title="The queue is empty">Nothing is waiting for review.</EmptyState>
    : <div className="workspace-panel overflow-hidden rounded-lg border border-border-subtle bg-surface-000">{!result ? <div className="p-4"><Unreadable what="The queue" /></div> : <ListingRows rows={result.rows} queue now={now} />}</div>}
    {result && <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} hrefForPage={(p) => p > 1 ? `/admin/moderation?page=${p}` : '/admin/moderation'} />}
  </AdminShell>
}
