import type { Metadata } from 'next'
import { AdminShell, CheckBadge } from '@/components/admin/AdminShell'
import { adminSystemStatus, requireStaff } from '@/lib/admin/queries'
import { configurationChecks, providerCheck } from '@/lib/admin/system'
import { databaseChecks, type Check } from '@/lib/admin/model'

export const metadata: Metadata = { title: 'System status', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/** Every check, in words. What cannot be checked says "Unknown", never OK. */
export default async function SystemPage() {
  const { role, now } = await requireStaff('/admin/system')
  const [system, provider] = await Promise.all([adminSystemStatus(), providerCheck()])
  const database: Check[] = system
    ? [{ key: 'database', label: 'Database', state: system.ms > 1500 ? 'warning' : 'ok', detail: `Answered the status query in ${system.ms} ms.` }, ...databaseChecks(system.status, now)]
    : [{ key: 'database', label: 'Database', state: 'problem', detail: 'The status query failed. Database-backed features may be unavailable.' }]
  const groups: [string, Check[]][] = [['Configuration', configurationChecks()], ['Services', [provider, database[0]!]], ['Data and jobs', database.slice(1)]]
  return <AdminShell current="system" title="System status" role={role}>
    {system && <p className="text-body-sm text-ink-700">Checked {new Date(system.status.checked_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })} IST. Settings show only whether they are present, never their values.</p>}
    {groups.filter(([, checks]) => checks.length).map(([title, checks]) => <section key={title} aria-labelledby={`group-${title}`} className="mt-6">
      <h2 id={`group-${title}`} className="font-display text-heading-3 text-ink-900">{title}</h2>
      <ul className="mt-3 divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface-000">{checks.map((c) => <li key={c.key} className="flex flex-wrap items-start gap-x-4 gap-y-1 p-4">
        <CheckBadge state={c.state} />
        <div className="min-w-0 flex-1"><p className="font-semibold text-ink-900">{c.label}</p><p className="break-words text-body-sm text-ink-700">{c.detail}</p></div>
      </li>)}</ul>
    </section>)}
  </AdminShell>
}
