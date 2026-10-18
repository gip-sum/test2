import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminShell, Unreadable } from '@/components/admin/AdminShell'
import { Pagination } from '@/components/ui/Pagination'
import { requireStaff } from '@/lib/admin/queries'
import { searchAccounts } from '@/lib/users/queries'
import { ACCOUNT_STATUSES, SELLER_ROLES, USER_PAGE_SIZE, parseUserQuery, usersHref, userHref } from '@/lib/users/model'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { fieldControlClass, FormField } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/StatusBadge'

export const metadata: Metadata = { title: 'Users & sellers', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'
const accountLink = 'inline-flex min-h-11 max-w-full items-center break-all font-semibold text-ink-900 hover:text-brand-700 hover:underline underline-offset-4'
const joined = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' }) : 'Unavailable'
export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = parseUserQuery(await searchParams)
  const { role } = await requireStaff(usersHref(q))
  const result = await searchAccounts(q).catch(() => null)
  return <AdminShell current="users" title="Users & sellers" role={role}>
    <p className="text-body-sm text-ink-700">Find an account to review its activity or manage marketplace access.</p>
    <form method="get" action="/admin/users" className="mt-5 grid items-end gap-3 rounded-lg border border-border-subtle bg-surface-000 p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_9rem_10rem_auto_auto]">
      {/* The shared field frame (UI-11): 16px controls, so Safari on iPhone no longer zooms into these 14px fields. A plain GET form: the search is the URL. */}
      <FormField id="user-search" label="Search name, email or exact account ID" className="md:col-span-2 xl:col-span-1">{(c) => <input {...c} name="q" defaultValue={q.q} maxLength={100} placeholder="Find an account…" className={fieldControlClass} />}</FormField>
      <FormField id="user-status" label="Marketplace status">{(c) => <select {...c} name="status" defaultValue={q.status} className={fieldControlClass}><option value="">All statuses</option>{ACCOUNT_STATUSES.map(s => <option key={s} value={s}>{s === 'ACTIVE' ? 'Active' : 'Suspended'}</option>)}</select>}</FormField>
      <FormField id="user-role" label="Assigned seller role">{(c) => <select {...c} name="role" defaultValue={q.role} className={fieldControlClass}><option value="">All roles</option><option value="unassigned">Unassigned</option>{SELLER_ROLES.map(r => <option key={r} value={r}>{r === 'OWNER' ? 'Owner' : r === 'AGENT' ? 'Agent' : 'Builder'}</option>)}</select>}</FormField>
      <div className="flex flex-wrap items-center gap-4 md:col-span-2 xl:contents"><Button type="submit" className="justify-self-start whitespace-nowrap">Search accounts</Button>
      <Link href="/admin/users" className="inline-flex min-h-11 items-center justify-self-start whitespace-nowrap text-body-sm font-semibold text-ink-700 hover:text-ink-900 underline underline-offset-4">Clear filters</Link></div>
    </form>
    <div className="flex flex-wrap items-center justify-between gap-2 py-4"><h2 className="font-display text-heading-3 text-ink-900">Accounts{result && <span className="tabular font-normal text-ink-500"> ({result.total})</span>}</h2><p className="text-caption text-ink-700">Newest accounts first</p></div>
    {result && !result.rows.length ? <EmptyState surface="workspace" heading="h3" title="No accounts found" action={<Link href="/admin/users" className="inline-flex min-h-11 items-center text-body-sm font-semibold text-brand-700 underline underline-offset-4">Clear filters</Link>}>No accounts match these filters.</EmptyState>
    : <div className="workspace-panel overflow-hidden rounded-lg border border-border-subtle bg-surface-000">{!result ? <div className="p-4"><Unreadable what="Accounts" /></div> : <>
      <table className="workspace-table hidden w-full table-fixed border-collapse text-left text-body-sm md:table">
        <thead className="border-b border-border-subtle bg-surface-200 text-caption text-ink-700"><tr><th scope="col" className="w-[44%] px-4 py-3 font-semibold">Account</th><th scope="col" className="w-[18%] px-3 py-3 font-semibold">Status</th><th scope="col" className="w-[20%] px-3 py-3 font-semibold">Seller role</th><th scope="col" className="w-[18%] px-4 py-3 font-semibold">Joined</th></tr></thead>
        <tbody>{result.rows.map(a => <tr key={a.id} className="border-b border-border-subtle align-top last:border-0 hover:bg-surface-200">
          <th scope="row" className="px-4 py-2 font-normal"><Link href={userHref(a.id)} className={accountLink}>{a.full_name || a.email || a.id}</Link><p className="break-all text-caption text-ink-700">{a.email || 'Email unavailable'}</p><p className="mt-1 break-all text-caption text-ink-500">ID: {a.id}</p></th>
          <td className="px-3 py-5"><StatusBadge status={a.status} /></td>
          <td className="break-words px-3 py-5 text-ink-900"><span className="capitalize">{a.seller_role?.toLowerCase() || 'Unassigned'}</span>{a.staff_role && <p className="mt-1 text-caption capitalize text-ink-500">{a.staff_role.toLowerCase()}</p>}</td>
          <td className="px-4 py-5 text-caption text-ink-700">{joined(a.created_at)}</td>
        </tr>)}</tbody>
      </table>
      <ul className="divide-y divide-border-subtle md:hidden">{result.rows.map(a => <li key={a.id} className="min-w-0 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge status={a.status} /><span className="text-caption capitalize text-ink-700">{a.seller_role?.toLowerCase() || 'Unassigned seller role'}{a.staff_role ? ` · ${a.staff_role.toLowerCase()}` : ''}</span></div>
        <Link href={userHref(a.id)} className={accountLink}>{a.full_name || a.email || a.id}</Link><p className="break-all text-body-sm text-ink-700">{a.email || 'Email unavailable'}</p>
        <p className="mt-3 break-all border-t border-border-subtle pt-2 text-caption text-ink-500">Account ID: {a.id}</p>
      </li>)}</ul>
    </>}</div>}
    <p className="mt-3 text-caption text-ink-500">Seller roles are administrative classifications, not verification.</p>
    {result && <Pagination page={result.page} pageCount={Math.max(1, Math.ceil(result.total / USER_PAGE_SIZE))} hrefForPage={page => usersHref({ ...q, page })} />}
  </AdminShell>
}
