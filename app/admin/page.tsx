import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { AdminShell, CheckBadge, Unreadable } from '@/components/admin/AdminShell'
import { adminOverview, adminSystemStatus, requireStaff } from '@/lib/admin/queries'
import { configurationChecks, providerCheck } from '@/lib/admin/system'
import { CHECK_WORD, databaseChecks, formatWait, listingsHref, overallState, REVIEW_OVERDUE_MS, type AdminStatus } from '@/lib/admin/model'

export const metadata: Metadata = { title: 'Admin overview', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const link = 'inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4'
const STATUS_ROWS: [AdminStatus, string, string][] = [
  ['UNDER_REVIEW', 'Under review', 'review'], ['ACTIVE', 'Active', 'active'], ['EXPIRED', 'Expired', 'expired'],
  ['REJECTED', 'Rejected', 'rejected'], ['WITHDRAWN', 'Withdrawn', 'withdrawn'], ['REMOVED', 'Removed', 'removed'],
]

/** The control centre (Phase 21): every figure measured at request time. */
export default async function AdminOverviewPage() {
  const { role, now } = await requireStaff('/admin')
  const [overview, system, provider] = await Promise.all([adminOverview(), adminSystemStatus(), providerCheck()])
  const checks = [...configurationChecks(), provider, ...(system ? databaseChecks(system.status, now) : [])]
  const state = system ? overallState(checks) : 'unknown'
  return <AdminShell current="overview" title="Admin overview" role={role}>
    {!overview ? <Unreadable what="The overview" /> : <div className="grid gap-4 md:grid-cols-2">
      <Card title="Listings">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-body-sm">{STATUS_ROWS.map(([status, label, key]) => <div key={status} className="contents">
          <dt><Link href={listingsHref({ status: key as never })} className={link}>{label}</Link></dt>
          <dd className="tabular self-center text-right text-ink-900">{overview.listings[status] ?? 0}</dd>
        </div>)}</dl>
        <p className="mt-2 text-body-sm text-ink-700">{plural(overview.drafts_never_submitted, 'draft has', 'drafts have')} never been submitted.</p>
      </Card>
      <Card title="Moderation queue">
        <p className="text-body text-ink-900">{overview.queue.waiting ? plural(overview.queue.waiting, 'listing is', 'listings are') + ' waiting for review.' : 'Nothing is waiting for review.'}</p>
        {overview.queue.oldest_since && <p className="mt-1 text-body-sm text-ink-700">Oldest wait: {formatWait(now - Date.parse(overview.queue.oldest_since))}{now - Date.parse(overview.queue.oldest_since) > REVIEW_OVERDUE_MS ? ' — over 2 days.' : '.'}</p>}
        <Link href="/admin/moderation" className={link}>Open the queue</Link>
      </Card>
      <Card title="Leads">
        <ul className="space-y-1 text-body-sm text-ink-900">
          <li>{plural(overview.leads.last_7_days, 'enquiry', 'enquiries')} in the last 7 days; {overview.leads.last_30_days} in 30 days.</li>
          <li>{overview.leads.real_listings_30_days} of the 30-day enquiries are on real listings.</li>
          <li>{plural(overview.leads.no_seller_30_days, 'enquiry', 'enquiries')} in 30 days reached no seller (demo listings without an assigned seller).</li>
          <li>{plural(overview.leads.untouched_over_2_days, 'lead is', 'leads are')} still new after more than 2 days.</li>
        </ul>
        <p className="mt-2 text-caption text-ink-500">Counts only. Buyer details stay with the seller who received them.</p>
      </Card>
      <Card title="Users">
        <ul className="space-y-1 text-body-sm text-ink-900">
          <li>{plural(overview.users.total, 'account', 'accounts')} in total; {overview.users.new_7_days} new in the last 7 days.</li>
          <li>{plural(overview.users.with_listings, 'account has', 'accounts have')} submitted a listing.</li>
          <li>{plural(overview.users.staff, 'active staff member', 'active staff members')}.</li>
        </ul>
        <p className="mt-2 text-caption text-ink-500">Account search and management arrive in Phase 23.</p>
      </Card>
    </div>}
    <section aria-labelledby="system-summary" className="mt-4 rounded-lg border border-border-subtle bg-surface-000 p-5 shadow-e1">
      <div className="flex flex-wrap items-center gap-3"><h2 id="system-summary" className="font-display text-heading-3 text-ink-900">System status</h2><CheckBadge state={state} /></div>
      <p className="mt-2 text-body-sm text-ink-700">{!system ? 'Database health could not be read.' : state === 'ok' ? 'Every check passed.' : `${checks.filter((c) => c.state !== 'ok').length} of ${checks.length} checks need attention (worst: ${CHECK_WORD[state].toLowerCase()}).`}</p>
      <Link href="/admin/system" className={link}>See every check</Link>
    </section>
  </AdminShell>
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-lg border border-border-subtle bg-surface-000 p-5 shadow-e1">
    <h2 className="mb-3 font-display text-heading-3 text-ink-900">{title}</h2>{children}
  </section>
}
