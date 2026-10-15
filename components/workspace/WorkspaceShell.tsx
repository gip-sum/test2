import type { ReactNode } from 'react'
import Link from 'next/link'
import { Wordmark } from '@/components/navigation/Wordmark'
import { SavedProvider } from '@/components/property/SavedProvider'
import { ArrowRightIcon, BuildingIcon, GridIcon, HomeIcon, LayersIcon, MailIcon, PlusIcon, SlidersIcon, UserIcon } from '@/components/ui/icons'
import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/cn'
import { WorkspaceNavigation } from './WorkspaceNavigation'

const ICONS = { overview: GridIcon, listings: BuildingIcon, moderation: LayersIcon, users: UserIcon, system: SlidersIcon, properties: HomeIcon, enquiries: MailIcon, performance: GridIcon, account: UserIcon, post: PlusIcon }
export type WorkspaceSection = { key: keyof typeof ICONS; label: string; href: string; count?: number | null }

type Props = {
  area: 'admin' | 'owner'
  current: string
  title: string
  sections: readonly WorkspaceSection[]
  role?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

/** A navigation frame, never an authority boundary: each page still verifies its caller. */
export function WorkspaceShell({ area, current, title, sections, role, description, actions, children }: Props) {
  const admin = area === 'admin'
  const currentLabel = sections.find(section => section.key === current)?.label ?? title
  return <SavedProvider><div data-app-root data-workspace={area} className="workspace-shell">
    <a href="#workspace-main" className="workspace-skip">Skip to workspace content</a>
    <aside className="workspace-sidebar" aria-label={admin ? 'Admin workspace' : 'Seller workspace'}>
      <div className="workspace-brand"><Wordmark /><span className="workspace-mobile-role">{admin ? 'Admin' : 'Workspace'}</span></div>
      <div className="workspace-nav-caption">{admin ? 'Manage marketplace' : 'Your workspace'}</div>
      <WorkspaceNavigation label={admin ? 'Admin sections' : 'Seller sections'}>
        <ul>{sections.map(section => {
          const Icon = ICONS[section.key]
          const selected = section.key === current
          return <li key={section.key}><Link href={section.href} aria-current={selected ? 'page' : undefined} className={cn('workspace-nav-link', selected && 'is-current')}>
            <Icon className="size-5 shrink-0" /><span>{section.label}</span>
            {section.count != null && section.count > 0 && <span className="workspace-nav-count" aria-label={`${section.count} unread notifications`}>{section.count > 99 ? '99+' : section.count}</span>}
          </Link></li>
        })}</ul>
      </WorkspaceNavigation>
      <div className="workspace-sidebar-footer"><p className="font-display text-body-sm font-semibold text-ink-900">{BRAND.name}</p><p className="text-caption text-ink-500">{BRAND.tagline}</p><Link href="/" className="workspace-marketplace-link">Browse marketplace<ArrowRightIcon className="size-4" /></Link></div>
    </aside>
    <div className="workspace-body">
      <header className="workspace-topbar">
        <p className="workspace-breadcrumb"><span>{admin ? 'Admin' : 'Workspace'}</span><span aria-hidden="true">/</span><strong>{currentLabel}</strong></p>
        <div className="workspace-topbar-actions"><span className="workspace-role">{admin ? `Staff only · signed in as ${role?.toLowerCase() ?? 'admin'}` : 'Seller workspace'}</span><Link href="/account" className="workspace-account-link" aria-label="My account"><UserIcon className="size-4" /><span>My account</span></Link><Link href="/" className="workspace-browse-link" aria-label="Browse marketplace"><ArrowRightIcon className="size-5" /></Link></div>
      </header>
      <main id="workspace-main" tabIndex={-1} className="workspace-main">
        <div className="workspace-page-heading"><div className="min-w-0"><h1 className="workspace-title">{title}</h1>{description && <p className="workspace-description">{description}</p>}</div>{actions && <div className="workspace-page-actions">{actions}</div>}</div>
        <div className="workspace-content">{children}</div>
      </main>
    </div>
  </div></SavedProvider>
}
