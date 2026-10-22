import type { ReactNode } from 'react'
import { WorkspaceShell, type WorkspaceSection } from '@/components/workspace/WorkspaceShell'
import { cn } from '@/lib/cn'
import { CHECK_WORD, type CheckState } from '@/lib/admin/model'
import { ErrorState } from '@/components/ui/ErrorState'

// The work comes first (UI-20): the queue is a reviewer's main job, so it
// sits second, named for what it is; "Moderation" read as a policy page.
const SECTIONS = [
  { key: 'overview', label: 'Overview', href: '/admin' },
  { key: 'moderation', label: 'Review queue', href: '/admin/moderation' },
  { key: 'listings', label: 'Listings', href: '/admin/listings' },
  { key: 'users', label: 'Accounts', href: '/admin/users' },
  { key: 'system', label: 'System', href: '/admin/system' },
] as const satisfies readonly WorkspaceSection[]

/**
 * The admin console's frame: who is signed in as what, and where they are.
 * A navigation frame only — every page calls requireStaff itself, and a
 * moderator sees only the queue in it because that is all they may open.
 */
export function AdminShell({ current, title, role, description, actions, children }: { current: typeof SECTIONS[number]['key']; title: string; role: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return <WorkspaceShell area="admin" current={current} title={title} role={role} description={description} actions={actions}
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
  return <ErrorState surface="inline">{what} could not be loaded. Please reload this page.</ErrorState>
}
