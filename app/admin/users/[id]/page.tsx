import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminShell, Unreadable } from '@/components/admin/AdminShell'
import { AccountControls } from '@/components/admin/AccountControls'
import { RestoreFocus } from '@/components/a11y/RestoreFocus'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { isBadgeStatus } from '@/lib/listings/status-tone'
import { Pagination } from '@/components/ui/Pagination'
import { requireStaff } from '@/lib/admin/queries'
import { AccountError, getAccount } from '@/lib/users/queries'
import { USER_PAGE_SIZE, pageNumber, userHref, type HistoryQuery, type PageOf } from '@/lib/users/model'
import { UUID } from '@/lib/media/types'

export const metadata: Metadata = { title: 'Account details', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'
const date = (v: string | null) => v && Number.isFinite(Date.parse(v)) ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(v)) + ' IST' : 'Unavailable'
function HistoryPages({ id, h, kind, data }: { id: string; h: HistoryQuery; kind: keyof HistoryQuery; data: PageOf<unknown> }) {
  return <Pagination page={data.page} pageCount={Math.max(1, Math.ceil(data.total / USER_PAGE_SIZE))} hrefForPage={page => userHref(id, { ...h, [kind]: page }) + '#' + kind} />
}
export default async function UserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params, p = await searchParams
  const h: HistoryQuery = { listings: pageNumber(p.listings), leads: pageNumber(p.leads), changes: pageNumber(p.changes) }
  const { role, user } = await requireStaff(userHref(id, h))
  if (!UUID.test(id)) notFound()
  const result = await getAccount(id, h).catch(e => { if (e instanceof AccountError && e.status === 404) notFound(); return null })
  if (!result) return <AdminShell current="users" title="Account details" role={role}><Unreadable what="Account details" /></AdminShell>
  const a = result.account
  return <AdminShell current="users" title="Account details" role={role}>
    <RestoreFocus token={crypto.randomUUID()} />
    <div className="flex flex-wrap items-center justify-between gap-x-4"><Link href="/admin/users" className="inline-flex min-h-11 items-center gap-2 text-body-sm font-semibold text-ink-700 hover:text-brand-700 hover:underline underline-offset-4"><span aria-hidden="true">←</span> Back to users & sellers</Link><span className="text-caption text-ink-500">Private staff view</span></div>
    <div className="mt-3 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
    <section className="workspace-panel min-w-0 rounded-lg border border-border-subtle bg-surface-000" aria-labelledby="identity-title">
      <div className="border-b border-border-subtle px-5 py-4"><p className="mb-1 text-caption text-ink-500">Account profile</p><h2 id="identity-title" tabIndex={-1} className="break-all font-display text-heading-3 text-ink-900">{a.full_name || 'Name not provided'}</h2></div>
      {/* Status and role are focusable from script: an account change refreshes the page and focus lands on what changed (UI-11). */}
      <dl className="grid gap-x-5 gap-y-4 break-words p-5 text-body-sm md:grid-cols-2 xl:grid-cols-1">{([
        ['Email', a.email || 'Unavailable'], ['Account ID', a.id], ['Marketplace status', <StatusBadge key="s" status={a.status} />, 'account-status-value'], ['Assigned seller role', <span key="r" className="capitalize">{a.seller_role?.toLowerCase() || 'Unassigned'}</span>, 'account-role-value'],
        ['Contact phone (unverified)', result.contact_phone || 'Not provided'], ['Buyer preference', result.preferred_intent || 'Not provided'], ['Created', date(a.created_at)], ['Last sign-in', date(a.last_sign_in_at)],
      ] as [string, React.ReactNode, string?][]).map(([label, value, focusId]) => <div key={label}><dt className="text-caption text-ink-700">{label}</dt><dd id={focusId} tabIndex={focusId ? -1 : undefined} className="mt-1 break-all font-medium text-ink-900">{value}</dd></div>)}</dl>
    </section>
    <div className="min-w-0">{a.id === user.id || a.operator_managed ? <p className="workspace-panel rounded-lg border border-border-subtle bg-surface-000 p-5 text-body-sm text-ink-700">Your own account and current or former staff accounts are managed by a trusted operator.</p> : <AccountControls key={`${a.id}:${a.version}`} id={a.id} version={a.version} status={a.status} role={a.seller_role} />}</div>
    </div>
    <nav aria-label="Account activity" className="workspace-tabs my-5 flex flex-wrap gap-x-5 border-b border-border-subtle">{[['listings', 'Listing history', result.listings.total], ['leads', 'Lead activity', result.leads.total], ['changes', 'Account changes', result.changes.total]].map(([key, label, count]) => <Link key={key} href={`#${key}`} className="inline-flex min-h-11 items-center gap-2 text-body-sm font-semibold text-ink-700 hover:text-brand-700">{label}<span className="tabular rounded-md bg-surface-200 px-1.5 py-0.5 text-caption">{count}</span></Link>)}</nav>
    <section id="listings" className="workspace-panel scroll-mt-20 rounded-lg border border-border-subtle bg-surface-000" aria-labelledby="listings-title"><div className="border-b border-border-subtle px-5 py-4"><h2 id="listings-title" className="font-display text-heading-3 text-ink-900">Listing history ({result.listings.total})</h2>
      <p className="mt-1 text-caption text-ink-700">Submitted listings, newest submission first. Private drafts are excluded.</p></div>
      <ul className="divide-y divide-border-subtle">{result.listings.rows.map(l => <li key={l.id} className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-2"><Link href={'/admin/moderation/' + l.id} className="inline-flex min-h-11 max-w-full items-center break-words text-body-sm font-semibold text-ink-900 hover:text-brand-700 hover:underline underline-offset-4">{l.title}</Link><p className="flex flex-wrap items-center gap-x-2 gap-y-1 break-words text-caption text-ink-700">{isBadgeStatus(l.status) ? <StatusBadge status={l.status} /> : l.status.replaceAll('_', ' ')}<span>{l.seller_type.toLowerCase()} · {date(l.created_at)}</span></p></li>)}</ul>
      {!result.listings.total && <p className="p-5 text-body-sm text-ink-700">No submitted listings.</p>}<HistoryPages id={id} h={h} kind="listings" data={result.listings} />
    </section>
    <section id="leads" className="workspace-panel mt-5 scroll-mt-20 rounded-lg border border-border-subtle bg-surface-000" aria-labelledby="leads-title"><div className="border-b border-border-subtle px-5 py-4"><h2 id="leads-title" className="font-display text-heading-3 text-ink-900">Lead activity ({result.leads.total})</h2>
      <p className="mt-1 text-caption text-ink-700">Sent and received enquiries, newest first. Other people’s contact details and messages are private.</p></div>
      <ul className="divide-y divide-border-subtle">{result.leads.rows.map(l => <li key={l.id} className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4"><h3 className="break-words text-body-sm font-semibold text-ink-900">{l.listing_title}</h3><p className="break-words text-caption text-ink-700">{l.direction === 'both' ? 'Sent and received' : l.direction === 'sent' ? 'Sent' : 'Received'} · {l.status} · {date(l.created_at)}</p></li>)}</ul>
      {!result.leads.total && <p className="p-5 text-body-sm text-ink-700">No lead activity.</p>}<HistoryPages id={id} h={h} kind="leads" data={result.leads} />
    </section>
    <section id="changes" className="workspace-panel mt-5 scroll-mt-20 rounded-lg border border-border-subtle bg-surface-000" aria-labelledby="changes-title"><div className="border-b border-border-subtle px-5 py-4"><h2 id="changes-title" className="font-display text-heading-3 text-ink-900">Account change history ({result.changes.total})</h2></div>
      <ol className="divide-y divide-border-subtle">{result.changes.rows.map(c => <li key={c.id} className="p-5 text-body-sm"><p className="font-semibold text-ink-900">{c.status_before} → {c.status_after} · {c.role_before || 'Unassigned'} → {c.role_after || 'Unassigned'}</p><p className="mt-2 whitespace-pre-wrap break-words text-ink-900">{c.reason}</p><p className="mt-3 break-all text-caption text-ink-700">{date(c.created_at)} · Admin {c.actor_id} · Version {c.version_after}</p></li>)}</ol>
      {!result.changes.total && <p className="p-5 text-body-sm text-ink-700">No account changes recorded.</p>}<HistoryPages id={id} h={h} kind="changes" data={result.changes} />
    </section>
  </AdminShell>
}
