import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { STATE_SURFACE, type StateSurface } from './EmptyState'

/**
 * A part of the page that could not be shown (UI-05): data that failed to
 * load, a section that is temporarily unavailable. The rest of the page
 * keeps working; this says so plainly and, where trying again can help,
 * offers it.
 *
 * Copy only — never an error message, code or stack. What failed and why is
 * for the server log; the person reading this needs to know what they can
 * do next. Route-level error.tsx boundaries stay as they are and may render
 * this inside.
 *
 * `role="alert"` by default so a failure that appears after a user action is
 * announced; pass `role={null}` for a failure that is the page's initial,
 * static content and already sits under its own heading.
 */
export function ErrorState({
  title,
  children,
  action,
  surface = 'glass',
  role = 'alert',
  className,
}: {
  title?: string
  children: ReactNode
  /** A retry button or a link elsewhere. */
  action?: ReactNode
  surface?: StateSurface | 'inline'
  role?: 'alert' | null
  className?: string
}) {
  return (
    <div
      role={role ?? undefined}
      className={cn(
        'flex gap-3',
        surface === 'inline' ? 'rounded-md border border-border-strong bg-surface-000 p-4' : STATE_SURFACE[surface],
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="mt-0.5 size-5 shrink-0 text-warn-600" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16h.01" />
      </svg>
      <div className="min-w-0">
        {title && <h2 className="font-display text-heading-3 text-ink-900">{title}</h2>}
        <div className={cn('text-body-sm text-ink-900', title && 'mt-1 text-ink-700')}>{children}</div>
        {action && <div className="mt-4 flex flex-wrap items-center gap-3">{action}</div>}
      </div>
    </div>
  )
}
