import type { ReactNode } from 'react'
import { WorkspaceShell, type WorkspaceSection } from '@/components/workspace/WorkspaceShell'
import { cn } from '@/lib/cn'
import { CHECK_WORD, type CheckState } from '@/lib/admin/model'

const SECTIONS = [
  { key: 'overview', label: 'Overview', href: '/admin' },
  { key: 'listings', label: 'Listings', href: '/admin/listings' },
  { key: 'moderation', label: 'Moderation', href: '/admin/moderation' },
  { key: 'users', label: 'Users & sellers', href: '/admin/users' },
  { key: 'system', label: 'System', href: '/admin/system' },
] as const satisfies readonly WorkspaceSection[]

/** The admin console's frame: who is signed in as what, and where they are. */
export function AdminShell({ current, title, role, children }: { current: typeof SECTIONS[number]['key']; title: string; role: string; children: ReactNode }) {
  return <WorkspaceShell area="admin" current={current} title={title} role={role}
    sections={SECTIONS.filter(section => role === 'ADMIN' || section.key === 'moderation')}>{children}</WorkspaceShell>
}

const TONE: Record<CheckState, string> = {
  ok: 'bg-trust-100 text-trust-600', warning: 'bg-warn-100 text-warn-600', problem: 'bg-danger-100 text-danger-600', unknown: 'bg-neutral-100 text-neutral-600',
}
/** A check result in words; colour only reinforces. */
export function CheckBadge({ state }: { state: CheckState }) {
  return <span className={cn('inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-caption font-semibold', TONE[state])}>{CHECK_WORD[state]}</span>
}

export function Unreadable({ what }: { what: string }) {
  return <p role="alert" className="rounded-md border border-border-strong bg-surface-000 p-4 text-body-sm text-ink-900">{what} could not be loaded. Please reload this page.</p>
}
