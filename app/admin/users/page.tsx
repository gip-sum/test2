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
import { ArrowRightIcon, ShieldIcon } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Users & sellers', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'
const day = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' }) : null
const roleText = (r: string | null) => r === 'OWNER' ? 'Owner' : r === 'AGENT' ? 'Agent' : r === 'BUILDER' ? 'Builder' : 'Unassigned'

/**
 * Accounts (Phase 23; an identity-led list since UI-20): who each account
 * is, its marketplace status and seller role, staff membership, and when it
 * joined and last signed in — the fields the search returns, nothing
 * scored. The search is a plain GET form (the URL is the state); each row
 * is one link to the account.
 */
export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = parseUserQuery(await searchParams)
  const { role } = await requireStaff(usersHref(q))
  const result = await searchAccounts(q).catch(() => null)
  const filtered = Boolean(q.q || q.status || q.role)
  return <AdminShell current="users" title="Accounts" role={role} description="Find an account to see its listings and enquiries, or to change its marketplace status or seller role.">
    <section aria-labelledby="accounts-heading" className="admin-panel">
      <form method="get" action="/admin/users" role="search" aria-label="Find accounts" className="admin-filter">
        {/* The shared field frame (UI-11): 16px controls, so Safari on iPhone no longer zooms into these 14px fields. A plain GET form: the search is the URL. */}
        <FormField id="user-search" label="Search name, email or exact account ID" className="admin-filter-search">{(c) => <input {...c} name="q" type="search" defaultValue={q.q} maxLength={100} placeholder="Find an account…" className={fieldControlClass} />}</FormField>
        <FormField id="user-status" label="Marketplace status">{(c) => <select {...c} name="status" defaultValue={q.status} className={fieldControlClass}><option value="">All statuses</option>{ACCOUNT_STATUSES.map(s => <option key={s} value={s}>{s === 'ACTIVE' ? 'Active' : 'Suspended'}</option>)}</select>}</FormField>
        <FormField id="user-role" label="Assigned seller role">{(c) => <select {...c} name="role" defaultValue={q.role} className={fieldControlClass}><option value="">All roles</option><option value="unassigned">Unassigned</option>{SELLER_ROLES.map(r => <option key={r} value={r}>{roleText(r)}</option>)}</select>}</FormField>
        <div className="flex flex-wrap items-center gap-x-4"><Button type="submit" className="whitespace-nowrap">Search accounts</Button>
          {filtered && <Link href="/admin/users" className="inline-flex min-h-11 items-center whitespace-nowrap text-body-sm font-semibold text-ink-700 underline underline-offset-4 hover:text-ink-900">Clear filters</Link>}</div>
      </form>
      <div className="admin-panel-head">
        <h2 id="accounts-heading" className="admin-panel-title">{filtered ? 'Matching accounts' : 'Accounts'}{result && <span className="tabular font-normal text-ink-500"> ({result.total})</span>}</h2>
        <p className="text-caption text-ink-700">Newest accounts first</p>
      </div>
      {!result ? <div className="p-4"><Unreadable what="Accounts" /></div>
        : !result.rows.length ? <div className="px-5 pb-5"><EmptyState surface="workspace" heading="h3" title="No accounts found" action={<Link href="/admin/users" className="inline-flex min-h-11 items-center text-body-sm font-semibold text-brand-700 underline underline-offset-4">Clear filters</Link>}>No accounts match these filters. Search by part of a name or email, or paste an exact account ID.</EmptyState></div>
          : <>
            <div aria-hidden className="admin-row-head is-accounts"><span /><span>Account</span><span>Status</span><span>Seller role</span><span>Joined · last sign-in</span><span /></div>
            <ul aria-label="Accounts" className="admin-rows">{result.rows.map(a => {
              const name = a.full_name || a.email || a.id
              return <li key={a.id} className="admin-row is-accounts">
                <span aria-hidden className="admin-avatar">{(a.full_name || a.email || '?').trim().charAt(0).toUpperCase()}</span>
                <div className="min-w-0">
                  <Link href={userHref(a.id)} className="admin-row-link">{name}</Link>
                  <p className="truncate text-caption text-ink-700">{a.full_name ? a.email || 'Email unavailable' : `ID ${a.id.slice(0, 8)}…`}</p>
                </div>
                <div><StatusBadge status={a.status} /></div>
                <div className="flex flex-wrap items-center gap-1.5 text-body-sm text-ink-900"><span className="sr-only">Seller role: </span>{roleText(a.seller_role)}
                  {a.staff_role && <span className="admin-staff"><ShieldIcon className="size-3.5" />{a.staff_role === 'ADMIN' ? 'Admin' : 'Moderator'}<span className="sr-only"> staff</span></span>}</div>
                <div className="text-caption text-ink-700">Joined {day(a.created_at) ?? 'date unavailable'}<span className="block">{day(a.last_sign_in_at) ? `Last sign-in ${day(a.last_sign_in_at)}` : 'Never signed in'}</span></div>
                <span aria-hidden className="admin-row-go">Open<ArrowRightIcon className="size-4" /></span>
              </li>
            })}</ul>
          </>}
    </section>
    <p className="mt-3 text-caption text-ink-500">Seller roles are administrative classifications, not verification.</p>
    {result && <Pagination page={result.page} pageCount={Math.max(1, Math.ceil(result.total / USER_PAGE_SIZE))} hrefForPage={page => usersHref({ ...q, page })} />}
  </AdminShell>
}
