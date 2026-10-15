import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminShell, Unreadable } from '@/components/admin/AdminShell'
import { AccountControls } from '@/components/admin/AccountControls'
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
    <Link href="/admin/users" className="inline-flex min-h-11 items-center font-semibold text-ink-900 underline">Back to users & sellers</Link>
    <section className="mt-4 rounded-lg border border-border-subtle bg-surface-000 p-5" aria-labelledby="identity-title">
      <h2 id="identity-title" className="break-words font-display text-heading-2 text-ink-900">{a.full_name || 'Name not provided'}</h2>
      <dl className="mt-4 grid gap-4 break-words text-body-sm md:grid-cols-2">{[
        ['Email', a.email || 'Unavailable'], ['Account ID', a.id], ['Marketplace status', a.status === 'ACTIVE' ? 'Active' : 'Suspended'], ['Assigned seller role', a.seller_role?.toLowerCase() || 'Unassigned'],
        ['Contact phone (unverified)', result.contact_phone || 'Not provided'], ['Buyer preference', result.preferred_intent || 'Not provided'], ['Created', date(a.created_at)], ['Last sign-in', date(a.last_sign_in_at)],
      ].map(([label, value]) => <div key={label}><dt className="text-ink-700">{label}</dt><dd className="mt-1 break-all font-semibold text-ink-900">{value}</dd></div>)}</dl>
    </section>
    <div className="mt-6">{a.id === user.id || a.operator_managed ? <p className="rounded-lg border border-border-subtle bg-surface-000 p-5 text-body-sm text-ink-700">Your own account and current or former staff accounts are managed by a trusted operator.</p> : <AccountControls key={`${a.id}:${a.version}`} id={a.id} version={a.version} status={a.status} role={a.seller_role} />}</div>
    <section id="listings" className="mt-8" aria-labelledby="listings-title"><h2 id="listings-title" className="font-display text-heading-2 text-ink-900">Listing history ({result.listings.total})</h2>
      <p className="mt-1 text-body-sm text-ink-700">Submitted listings, newest submission first. Private drafts are excluded.</p>
      <ul className="mt-4 space-y-3">{result.listings.rows.map(l => <li key={l.id} className="rounded-lg border border-border-subtle bg-surface-000 p-4"><Link href={'/admin/moderation/' + l.id} className="inline-flex min-h-11 max-w-full items-center break-words font-semibold text-ink-900 underline">{l.title}</Link><p className="text-body-sm text-ink-700">{l.status.replaceAll('_', ' ')} · {l.seller_type.toLowerCase()} · {date(l.created_at)}</p></li>)}</ul>
      {!result.listings.total && <p className="mt-4 text-body-sm text-ink-700">No submitted listings.</p>}<HistoryPages id={id} h={h} kind="listings" data={result.listings} />
    </section>
    <section id="leads" className="mt-8" aria-labelledby="leads-title"><h2 id="leads-title" className="font-display text-heading-2 text-ink-900">Lead activity ({result.leads.total})</h2>
      <p className="mt-1 text-body-sm text-ink-700">Sent and received enquiries, newest first. Other people’s contact details and messages are private.</p>
      <ul className="mt-4 space-y-3">{result.leads.rows.map(l => <li key={l.id} className="rounded-lg border border-border-subtle bg-surface-000 p-4"><h3 className="break-words font-semibold text-ink-900">{l.listing_title}</h3><p className="mt-2 text-body-sm text-ink-700">{l.direction === 'both' ? 'Sent and received' : l.direction === 'sent' ? 'Sent' : 'Received'} · {l.status} · {date(l.created_at)}</p></li>)}</ul>
      {!result.leads.total && <p className="mt-4 text-body-sm text-ink-700">No lead activity.</p>}<HistoryPages id={id} h={h} kind="leads" data={result.leads} />
    </section>
    <section id="changes" className="mt-8" aria-labelledby="changes-title"><h2 id="changes-title" className="font-display text-heading-2 text-ink-900">Account change history ({result.changes.total})</h2>
      <ol className="mt-4 space-y-3">{result.changes.rows.map(c => <li key={c.id} className="rounded-lg border border-border-subtle bg-surface-000 p-4 text-body-sm"><p className="font-semibold text-ink-900">{c.status_before} → {c.status_after} · {c.role_before || 'Unassigned'} → {c.role_after || 'Unassigned'}</p><p className="mt-2 whitespace-pre-wrap break-words text-ink-900">{c.reason}</p><p className="mt-2 break-all text-ink-700">{date(c.created_at)} · Admin {c.actor_id} · Version {c.version_after}</p></li>)}</ol>
      {!result.changes.total && <p className="mt-4 text-body-sm text-ink-700">No account changes recorded.</p>}<HistoryPages id={id} h={h} kind="changes" data={result.changes} />
    </section>
  </AdminShell>
}
