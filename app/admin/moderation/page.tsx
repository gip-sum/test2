import type { Metadata } from 'next'
import { AdminShell, Unreadable } from '@/components/admin/AdminShell'
import { ListingRows, Waiting } from '@/components/admin/AdminParts'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { CheckIcon } from '@/components/ui/icons'
import { requireStaff } from '@/lib/admin/queries'
import { moderationQueue } from '@/lib/moderation/queries'
import { ADMIN_PAGE_SIZE, parseListingsQuery, REVIEW_OVERDUE_MS } from '@/lib/admin/model'

export const metadata: Metadata = { title: 'Review queue', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * The review queue, oldest first, shared by admins and moderators (Phase 22;
 * a scannable queue since UI-20). Each row leads with how long it has
 * waited and its place in line; a wait over 2 days is marked Overdue in
 * words. The summary counts what is on this page only when the whole queue
 * is on it — it never extrapolates.
 */
export default async function ModerationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { page } = parseListingsQuery(await searchParams)
  const { role, now } = await requireStaff(page > 1 ? `/admin/moderation?page=${page}` : '/admin/moderation', ['ADMIN', 'MODERATOR'])
  const result = await moderationQueue(page).catch(() => null)
  const pageCount = result ? Math.max(1, Math.ceil(result.total / ADMIN_PAGE_SIZE)) : 1
  const whole = result && result.rows.length === result.total
  const overdue = result ? result.rows.filter((r) => now - Date.parse(r.submitted_at) > REVIEW_OVERDUE_MS).length : 0
  const oldest = page === 1 ? result?.rows[0] : undefined
  return <AdminShell current="moderation" title="Review queue" role={role}
    description="Submitted listings waiting for a decision, oldest first. Open one to check what buyers would see, then approve, request corrections or reject. Listings stay private while they wait.">
    {!result ? <Unreadable what="The queue" /> : result.total === 0
      ? <EmptyState surface="workspace" icon={<CheckIcon />} title="No listings awaiting review">When a seller submits a listing it appears here, oldest first, and stays private until someone decides.</EmptyState>
      : <section aria-labelledby="queue-heading" className="admin-panel">
        <div className="admin-panel-head">
          <h2 id="queue-heading" className="admin-panel-title">Waiting for review <span className="tabular font-normal text-ink-500">({result.total})</span></h2>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-ink-700">
            {oldest && <span className="inline-flex items-center gap-2">Oldest <Waiting since={oldest.submitted_at} now={now} compact /></span>}
            {whole && overdue > 0 && <span><strong className="tabular text-ink-900">{overdue}</strong> overdue</span>}
          </p>
        </div>
        <ListingRows rows={result.rows} now={now} queue start={(Math.min(page, pageCount) - 1) * ADMIN_PAGE_SIZE} label="Waiting for review, oldest first" />
      </section>}
    {result && result.total > 0 && <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} hrefForPage={(p) => p > 1 ? `/admin/moderation?page=${p}` : '/admin/moderation'} />}
  </AdminShell>
}
