import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminShell, CheckBadge, Unreadable } from '@/components/admin/AdminShell'
import { AdminPanel, Figure, ListingRows, PanelLink, Waiting } from '@/components/admin/AdminParts'
import { buttonClassName } from '@/components/ui/Button'
import { CheckIcon, LayersIcon, SlidersIcon } from '@/components/ui/icons'
import { adminOverview, adminSystemStatus, requireStaff } from '@/lib/admin/queries'
import { moderationQueue } from '@/lib/moderation/queries'
import { configurationChecks, providerCheck } from '@/lib/admin/system'
import { databaseChecks, listingsHref, overallState, type AdminFilter, type AdminStatus } from '@/lib/admin/model'

export const metadata: Metadata = { title: 'Admin overview', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
/** Where each submitted listing stands, in the order a listing moves. */
const PIPELINE: { title: string; note: string; items: [AdminStatus, string, AdminFilter][] }[] = [
  { title: 'Waiting', note: 'Private until a decision', items: [['UNDER_REVIEW', 'Under review', 'review']] },
  { title: 'Public', note: 'Buyers can see these', items: [['ACTIVE', 'Active', 'active']] },
  { title: 'Returned to the seller', note: 'Private; the seller can fix and re-submit', items: [['CHANGES_REQUESTED', 'Corrections requested', 'corrections'], ['REJECTED', 'Rejected', 'rejected']] },
  { title: 'Off the market', note: 'No longer public', items: [['EXPIRED', 'Expired', 'expired'], ['WITHDRAWN', 'Withdrawn', 'withdrawn'], ['REMOVED', 'Removed', 'removed']] },
]

/**
 * The control centre (Phase 21; reorganised around the work in UI-20).
 *
 * First what needs a person — the review queue and any failing check — with
 * the way to act on it; then the next submissions in line, straight to their
 * review; then where every listing stands. Every figure is read at request
 * time from the same reads as before (admin_overview, the system status);
 * the queue's count is the overview's, and the "next" list only names rows.
 * Nothing is a trend, score or target: the console has none to show.
 */
export default async function AdminOverviewPage() {
  const { role, now } = await requireStaff('/admin')
  const [overview, system, provider, next] = await Promise.all([adminOverview(), adminSystemStatus(), providerCheck(), moderationQueue(1).catch(() => null)])
  const checks = [...configurationChecks(), provider, ...(system ? databaseChecks(system.status, now) : [])]
  const state = system ? overallState(checks) : 'unknown'
  const failing = checks.filter((c) => c.state !== 'ok')
  const waiting = overview?.queue.waiting ?? null
  const allClear = waiting === 0 && state === 'ok'

  return <AdminShell current="overview" title="Overview" role={role} description="What needs you, what is waiting for review, and where every listing stands. Every figure is read now.">
    {!overview ? <Unreadable what="The overview" /> : <div className="admin-overview">
      <div className="admin-overview-main">
        <AdminPanel id="attention-heading" title="Needs attention" flush>
          <ul className="divide-y divide-border-subtle">
            <li className="admin-attention">
              <span aria-hidden className="admin-attention-mark"><LayersIcon className="size-5" /></span>
              <div className="min-w-0 flex-1 basis-64">
                <p className="text-body font-semibold text-ink-900">{waiting ? <><span className="tabular">{plural(waiting, 'listing', 'listings')}</span> waiting for review</> : 'Nothing is waiting for review'}</p>
                {overview.queue.oldest_since && waiting ? <p className="mt-1 flex flex-wrap items-center gap-x-2 text-body-sm text-ink-700">Oldest has waited <Waiting since={overview.queue.oldest_since} now={now} /></p>
                  : <p className="mt-1 text-body-sm text-ink-700">New submissions appear here, oldest first.</p>}
              </div>
              <Link href="/admin/moderation" className={buttonClassName({ variant: waiting ? 'primary' : 'secondary', className: 'shrink-0 max-sm:w-full' })}>Open review queue</Link>
            </li>
            <li className="admin-attention">
              <span aria-hidden className="admin-attention-mark"><SlidersIcon className="size-5" /></span>
              <div className="min-w-0 flex-1 basis-64">
                <p className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink-900">
                  {!system ? 'System health could not be read' : state === 'ok' ? 'Every system check passed' : `${failing.length} of ${checks.length} system checks need attention`}<CheckBadge state={state} />
                </p>
                {state !== 'ok' && failing.length > 0 && <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-ink-700">{failing.map((c) => <li key={c.key} className="flex items-center gap-1.5"><CheckBadge state={c.state} />{c.label}</li>)}</ul>}
              </div>
              <Link href="/admin/system" className={buttonClassName({ variant: 'secondary', className: 'shrink-0 max-sm:w-full' })}>See system status</Link>
            </li>
          </ul>
          {allClear && <p className="flex items-center gap-2 border-t border-border-subtle px-5 py-3 text-body-sm text-ink-700"><CheckIcon className="size-4 text-brand-700" />Nothing needs you right now.</p>}
        </AdminPanel>

        <AdminPanel id="next-heading" title="Next in the queue" action={waiting ? <PanelLink href="/admin/moderation">See all {waiting}</PanelLink> : undefined} flush>
          {!next ? <div className="p-4"><Unreadable what="The queue" /></div>
            : next.rows.length === 0 ? <p className="px-5 py-4 text-body-sm text-ink-700">No listings are waiting for review. Submissions appear here, oldest first, the moment a seller sends one.</p>
              : <ListingRows rows={next.rows.slice(0, 3)} now={now} queue label="Next submissions to review, oldest first" />}
        </AdminPanel>

        <AdminPanel id="pipeline-heading" title="Where listings stand" action={<PanelLink href="/admin/listings">All listings</PanelLink>}>
          <div className="admin-pipeline">
            {PIPELINE.map((group) => <section key={group.title} aria-label={group.title} className="min-w-0">
              <h3 className="text-caption font-semibold uppercase tracking-wide text-ink-500">{group.title}</h3>
              <p className="text-caption text-ink-500">{group.note}</p>
              <ul className="mt-2 grid gap-1.5">{group.items.map(([status, label, key]) => <li key={status}>
                <Link href={listingsHref({ status: key })} className="admin-pipeline-link"><span>{label}</span><span className="tabular font-display text-heading-3 font-semibold text-ink-900">{overview.listings[status] ?? 0}</span></Link>
              </li>)}</ul>
            </section>)}
          </div>
          <p className="mt-4 border-t border-border-subtle pt-3 text-caption text-ink-700">{plural(overview.drafts_never_submitted, 'draft has', 'drafts have')} never been submitted; drafts stay private to their seller and are not listed here.</p>
        </AdminPanel>
      </div>

      <div className="admin-overview-side">
        <dl className="admin-figures">
          <Figure label="Published listings" value={overview.listings.ACTIVE ?? 0} note="Active, in front of buyers" />
          <Figure label="Accounts" value={overview.users.total} note={`${overview.users.new_7_days} new in 7 days`} />
          <Figure label="Enquiries · 7 days" value={overview.leads.last_7_days} note={`${overview.leads.last_30_days} in 30 days`} />
          <Figure label="Staff" value={overview.users.staff} note="Active staff members" />
        </dl>
        <AdminPanel id="accounts-heading" title="Accounts" action={<PanelLink href="/admin/users">Manage</PanelLink>}>
          <ul className="admin-facts">
            <li><span>Registered</span><strong className="tabular">{overview.users.total}</strong></li>
            <li><span>New in the last 7 days</span><strong className="tabular">{overview.users.new_7_days}</strong></li>
            <li><span>Have submitted a listing</span><strong className="tabular">{overview.users.with_listings}</strong></li>
          </ul>
        </AdminPanel>
        <AdminPanel id="enquiries-heading" title="Enquiry activity">
          <ul className="admin-facts">
            <li><span>Last 7 days</span><strong className="tabular">{overview.leads.last_7_days}</strong></li>
            <li><span>Last 30 days</span><strong className="tabular">{overview.leads.last_30_days}</strong></li>
            <li><span>On real listings · 30 days</span><strong className="tabular">{overview.leads.real_listings_30_days}</strong></li>
            <li><span>Reached no seller · 30 days</span><strong className="tabular">{overview.leads.no_seller_30_days}</strong></li>
            <li><span>Still new after 2 days</span><strong className="tabular">{overview.leads.untouched_over_2_days}</strong></li>
          </ul>
          <p className="mt-3 text-caption text-ink-500">Counts only. Buyer details stay with the seller who received them; enquiries reaching no seller are on demo listings without one.</p>
        </AdminPanel>
      </div>
    </div>}
  </AdminShell>
}
