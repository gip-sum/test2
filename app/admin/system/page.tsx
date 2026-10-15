import type { Metadata } from 'next'
import { AdminShell, CheckBadge } from '@/components/admin/AdminShell'
import { adminSystemStatus, requireStaff } from '@/lib/admin/queries'
import { configurationChecks, providerCheck } from '@/lib/admin/system'
import { databaseChecks, overallState, type Check } from '@/lib/admin/model'

export const metadata: Metadata = { title: 'System status', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** Every check, in words. What cannot be checked says "Unknown", never OK. */
export default async function SystemPage() {
  const { role, now } = await requireStaff('/admin/system')
  const [system, provider] = await Promise.all([adminSystemStatus(), providerCheck()])
  const database: Check[] = system
    ? [{ key: 'database', label: 'Database', state: system.ms > 1500 ? 'warning' : 'ok', detail: `Answered the status query in ${system.ms} ms.` }, ...databaseChecks(system.status, now)]
    : [{ key: 'database', label: 'Database', state: 'problem', detail: 'The status query failed. Database-backed features may be unavailable.' }]
  const groups: { id: string; title: string; checks: Check[] }[] = [
    { id: 'configuration', title: 'Configuration', checks: configurationChecks() },
    { id: 'services', title: 'Services', checks: [provider, database[0]!] },
    { id: 'data-and-jobs', title: 'Data and jobs', checks: database.slice(1) },
  ]
  const allChecks = groups.flatMap(({ checks }) => checks)
  return <AdminShell current="system" title="System status" role={role}>
    <div className="workspace-panel mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-000 px-5 py-4"><div className="flex flex-wrap items-center gap-3"><CheckBadge state={overallState(allChecks)} /><p className="text-body-sm text-ink-900"><span className="tabular font-semibold">{allChecks.filter(c => c.state === 'ok').length} of {allChecks.length}</span> checks passed</p></div>{system && <p className="text-caption text-ink-700">Checked {new Date(system.status.checked_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })} IST</p>}</div>
    <p className="mb-5 text-caption text-ink-700">Settings show only whether they are present, never their values. A check that cannot be completed is marked Unknown.</p>
    <div className="grid gap-5 lg:grid-cols-2">
    {groups.filter(({ checks }) => checks.length).map(({ id, title, checks }) => <section key={id} aria-labelledby={`group-${id}`} className={`workspace-panel min-w-0 rounded-lg border border-border-subtle bg-surface-000 ${id === 'data-and-jobs' ? 'lg:col-span-2' : ''}`}>
      <div className="border-b border-border-subtle px-5 py-4"><h2 id={`group-${id}`} className="font-display text-heading-3 text-ink-900">{title}</h2></div>
      <ul className="divide-y divide-border-subtle">{checks.map((c) => <li key={c.key} className="flex items-start gap-3 px-5 py-4">
        <CheckBadge state={c.state} />
        <div className="min-w-0 flex-1"><p className="text-body-sm font-semibold text-ink-900">{c.label}</p><p className="mt-1 break-words text-caption text-ink-700">{c.detail}</p></div>
      </li>)}</ul>
    </section>)}
    </div>
  </AdminShell>
}
