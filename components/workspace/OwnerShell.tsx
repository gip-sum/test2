import type { ReactNode } from 'react'
import { WorkspaceShell, type WorkspaceSection } from './WorkspaceShell'

export function OwnerShell({ current, title, description, actions, unread, children }: {
  current: 'properties' | 'enquiries' | 'performance'
  title: string
  description?: string
  actions?: ReactNode
  unread?: number | null
  children: ReactNode
}) {
  const sections: WorkspaceSection[] = [
    { key: 'properties', label: 'My properties', href: '/dashboard' },
    { key: 'enquiries', label: 'Enquiries', href: '/dashboard/enquiries', count: unread },
    { key: 'performance', label: 'Performance', href: '/dashboard/performance' },
    { key: 'account', label: 'Account', href: '/account' },
  ]
  return <WorkspaceShell area="owner" current={current} title={title} description={description} actions={actions} sections={sections}>{children}</WorkspaceShell>
}
