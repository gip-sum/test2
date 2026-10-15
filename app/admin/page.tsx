import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { AdminShell, CheckBadge, Unreadable } from '@/components/admin/AdminShell'
import { adminOverview, adminSystemStatus, requireStaff } from '@/lib/admin/queries'
import { configurationChecks, providerCheck } from '@/lib/admin/system'
import { CHECK_WORD, databaseChecks, formatWait, listingsHref, overallState, REVIEW_OVERDUE_MS, type AdminFilter, type AdminStatus } from '@/lib/admin/model'

export const metadata: Metadata = { title: 'Admin overview', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const link = 'inline-flex min-h-11 items-center gap-2 text-body-sm font-semibold text-brand-700 hover:underline underline-offset-4'
const STATUS_ROWS: [AdminStatus, string, AdminFilter][] = [
  ['UNDER_REVIEW', 'Under review', 'review'], ['ACTIVE', 'Active', 'active'], ['EXPIRED', 'Expired', 'expired'],
  ['REJECTED', 'Rejected', 'rejected'], ['CHANGES_REQUESTED', 'Corrections requested', 'corrections'], ['WITHDRAWN', 'Withdrawn', 'withdrawn'], ['REMOVED', 'Removed', 'removed'],
]

/** The control centre (Phase 21): every figure measured at request time. */
export default async function AdminOverviewPage() {
  const { role, now } = await requireStaff('/admin')
  const [overview, system, provider] = await Promise.all([adminOverview(), adminSystemStatus(), providerCheck()])
  const checks = [...configurationChecks(), provider, ...(system ? databaseChecks(system.status, now) : [])]
  const state = system ? overallState(checks) : 'unknown'
  return <AdminShell current="overview" title="Admin overview" role={role}>
    <p className="mb-5 text-body-sm text-ink-700">Your marketplace at a glance. Review submissions, manage accounts and check service health.</p>
    {!overview ? <Unreadable what="The overview" /> : <>
      <dl className="workspace-summary mb-5 grid grid-cols-2 divide-x divide-border-subtle overflow-hidden rounded-lg border border-border-subtle bg-surface-000 lg:grid-cols-4">
        {[
          ['Published listings', overview.listings.ACTIVE ?? 0], ['Waiting for review', overview.queue.waiting],
          ['Registered accounts', overview.users.total], ['Enquiries · last 7 days', overview.leads.last_7_days],
        ].map(([label, value]) => <div key={label} className="min-w-0 px-4 py-4"><dt className="text-caption text-ink-700">{label}</dt><dd className="tabular mt-1 font-display text-heading-2 font-semibold text-ink-900">{value}</dd></div>)}
      </dl>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <Card title="Moderation queue" action={<Link href="/admin/moderation" className={link}>Open the queue <span aria-hidden="true">→</span></Link>}>
        <p className="text-body-sm text-ink-900">{overview.queue.waiting ? plural(overview.queue.waiting, 'listing is', 'listings are') + ' waiting for review.' : 'Nothing is waiting for review.'}</p>
        {overview.queue.oldest_since && <p className="mt-2 text-body-sm text-ink-700">Oldest wait: {formatWait(now - Date.parse(overview.queue.oldest_since))}{now - Date.parse(overview.queue.oldest_since) > REVIEW_OVERDUE_MS ? ' — over 2 days.' : '.'}</p>}
        <p className="mt-3 text-caption text-ink-500">Review the oldest submissions first. Seller corrections stay attached to the submitted copy.</p>
      </Card>
      <Card title="Users & sellers" action={<Link href="/admin/users" className={link}>Manage accounts <span aria-hidden="true">→</span></Link>}>
        <ul className="space-y-2 text-body-sm text-ink-900">
          <li>{plural(overview.users.total, 'account', 'accounts')} in total; {overview.users.new_7_days} new in the last 7 days.</li>
          <li>{plural(overview.users.with_listings, 'account has', 'accounts have')} submitted a listing.</li>
          <li>{plural(overview.users.staff, 'active staff member', 'active staff members')}.</li>
        </ul>
      </Card>
      <Card title="Listing status" action={<Link href="/admin/listings" className={link}>All listings <span aria-hidden="true">→</span></Link>}>
        <dl className="divide-y divide-border-subtle text-body-sm">{STATUS_ROWS.map(([status, label, key]) => <div key={status} className="flex items-center justify-between gap-4">
          <dt><Link href={listingsHref({ status: key })} className={link}>{label}</Link></dt>
          <dd className="tabular text-right font-semibold text-ink-900">{overview.listings[status] ?? 0}</dd>
        </div>)}</dl>
        <p className="mt-3 border-t border-border-subtle pt-3 text-caption text-ink-700">{plural(overview.drafts_never_submitted, 'draft has', 'drafts have')} never been submitted.</p>
      </Card>
      <Card title="Enquiry activity">
        <ul className="space-y-1 text-body-sm text-ink-900">
          <li>{plural(overview.leads.last_7_days, 'enquiry', 'enquiries')} in the last 7 days; {overview.leads.last_30_days} in 30 days.</li>
          <li>{overview.leads.real_listings_30_days} of the 30-day enquiries are on real listings.</li>
          <li>{plural(overview.leads.no_seller_30_days, 'enquiry', 'enquiries')} in 30 days reached no seller (demo listings without an assigned seller).</li>
          <li>{plural(overview.leads.untouched_over_2_days, 'lead is', 'leads are')} still new after more than 2 days.</li>
        </ul>
        <p className="mt-4 border-t border-border-subtle pt-3 text-caption text-ink-500">Counts only. Buyer details stay with the seller who received them.</p>
      </Card>
      </div>
    </>}
    <section aria-labelledby="system-summary" className="workspace-panel mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-000 px-5 py-3">
      <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-3"><h2 id="system-summary" className="font-display text-heading-3 text-ink-900">System status</h2><CheckBadge state={state} /></div>
      <p className="mt-2 text-body-sm text-ink-700">{!system ? 'Database health could not be read.' : state === 'ok' ? 'Every check passed.' : `${checks.filter((c) => c.state !== 'ok').length} of ${checks.length} checks need attention (worst: ${CHECK_WORD[state].toLowerCase()}).`}</p>
      </div>
      <Link href="/admin/system" className={link}>See every check</Link>
    </section>
  </AdminShell>
}

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section className="workspace-panel min-w-0 rounded-lg border border-border-subtle bg-surface-000">
    <div className="flex flex-wrap items-center justify-between gap-x-3 border-b border-border-subtle px-5 py-2"><h2 className="font-display text-heading-3 text-ink-900">{title}</h2>{action}</div><div className="p-5">{children}</div>
  </section>
}
