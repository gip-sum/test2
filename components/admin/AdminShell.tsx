import type { ReactNode } from 'react'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { cn } from '@/lib/cn'
import { CHECK_WORD, type CheckState } from '@/lib/admin/model'

const SECTIONS = [
  { key: 'overview', label: 'Overview', href: '/admin' },
  { key: 'listings', label: 'Listings', href: '/admin/listings' },
  { key: 'moderation', label: 'Moderation', href: '/admin/moderation' },
  { key: 'system', label: 'System', href: '/admin/system' },
] as const

/** The admin console's frame: who is signed in as what, and where they are. */
export function AdminShell({ current, title, role, children }: { current: typeof SECTIONS[number]['key']; title: string; role: string; children: ReactNode }) {
  return <PageShell><div className="mx-auto max-w-6xl px-4 pb-16 pt-9 sm:pt-12">
    <p className="text-overline uppercase tracking-widest text-ink-700">Staff only · signed in as {role === 'ADMIN' ? 'admin' : role.toLowerCase()}</p>
    <h1 className="mt-2 break-words font-display text-heading-1 text-ink-900">{title}</h1>
    <nav aria-label="Admin sections" className="mt-5">
      <ul className="flex flex-wrap gap-2">{SECTIONS.filter(s => role === 'ADMIN' || s.key === 'moderation').map((s) => <li key={s.key}>
        <Link href={s.href} aria-current={s.key === current ? 'page' : undefined}
          className={cn('inline-flex min-h-11 items-center rounded-md border px-4 text-label font-semibold', s.key === current ? 'border-ink-900 bg-ink-900 text-ink-inverse' : 'border-border-subtle bg-surface-000 text-ink-900 hover:border-border-strong')}>{s.label}</Link>
      </li>)}</ul>
    </nav>
    <div className="mt-8">{children}</div>
  </div></PageShell>
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
