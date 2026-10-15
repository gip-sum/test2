import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminShell, Unreadable } from '@/components/admin/AdminShell'
import { Pagination } from '@/components/ui/Pagination'
import { requireStaff } from '@/lib/admin/queries'
import { searchAccounts } from '@/lib/users/queries'
import { ACCOUNT_STATUSES, SELLER_ROLES, USER_PAGE_SIZE, parseUserQuery, usersHref, userHref } from '@/lib/users/model'

export const metadata: Metadata = { title: 'Users & sellers', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'
const field = 'mt-2 min-h-11 w-full rounded-md border border-border-strong bg-surface-000 px-3 text-ink-900'
export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = parseUserQuery(await searchParams)
  const { role } = await requireStaff(usersHref(q))
  const result = await searchAccounts(q).catch(() => null)
  return <AdminShell current="users" title="Users & sellers" role={role}>
    <p className="text-body-sm text-ink-700">Find an account to review its activity or manage marketplace access.</p>
    <form method="get" action="/admin/users" className="mt-5 grid gap-4 rounded-lg border border-border-subtle bg-surface-000 p-5 md:grid-cols-2">
      <div className="md:col-span-2"><label htmlFor="user-search" className="text-label font-semibold">Search name, email or exact account ID</label><input id="user-search" name="q" defaultValue={q.q} maxLength={100} className={field} /></div>
      <div><label htmlFor="user-status" className="text-label font-semibold">Marketplace status</label><select id="user-status" name="status" defaultValue={q.status} className={field}><option value="">All statuses</option>{ACCOUNT_STATUSES.map(s => <option key={s} value={s}>{s === 'ACTIVE' ? 'Active' : 'Suspended'}</option>)}</select></div>
      <div><label htmlFor="user-role" className="text-label font-semibold">Assigned seller role</label><select id="user-role" name="role" defaultValue={q.role} className={field}><option value="">All roles</option><option value="unassigned">Unassigned</option>{SELLER_ROLES.map(r => <option key={r} value={r}>{r === 'OWNER' ? 'Owner' : r === 'AGENT' ? 'Agent' : 'Builder'}</option>)}</select></div>
      <div className="flex flex-wrap items-center gap-4"><button className="min-h-11 rounded-md bg-brand-600 px-5 font-semibold text-on-brand">Search accounts</button><Link href="/admin/users" className="inline-flex min-h-11 items-center font-semibold text-ink-900 underline">Clear filters</Link></div>
    </form>
    <h2 className="mt-8 font-display text-heading-2 text-ink-900">Accounts{result && <span className="text-ink-500"> ({result.total})</span>}</h2>
    <p className="mt-1 text-body-sm text-ink-700">Newest accounts first. Seller roles are administrative classifications, not verification.</p>
    <div className="mt-4">{!result ? <Unreadable what="Accounts" /> : !result.rows.length ? <p className="rounded-lg border border-border-subtle bg-surface-000 p-5 text-ink-700">No accounts match these filters.</p> : <ul className="space-y-3">{result.rows.map(a => <li key={a.id} className="rounded-lg border border-border-subtle bg-surface-000 p-5">
      <Link href={userHref(a.id)} className="inline-flex min-h-11 max-w-full items-center break-all font-semibold text-ink-900 underline">{a.full_name || a.email || a.id}</Link>
      <p className="break-all text-body-sm text-ink-700">{a.email || 'Email unavailable'}</p>
      <p className="mt-2 text-body-sm text-ink-900">{a.status === 'ACTIVE' ? 'Active' : 'Suspended'} · {a.seller_role?.toLowerCase() || 'Unassigned seller role'}{a.staff_role ? ` · ${a.staff_role.toLowerCase()}` : ''}</p>
      <p className="mt-1 break-all text-caption text-ink-700">Account ID: {a.id}</p>
    </li>)}</ul>}</div>
    {result && <Pagination page={result.page} pageCount={Math.max(1, Math.ceil(result.total / USER_PAGE_SIZE))} hrefForPage={page => usersHref({ ...q, page })} />}
  </AdminShell>
}
