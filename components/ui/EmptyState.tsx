import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * "There is nothing here yet" (UI-05): no enquiries, an empty shortlist, no
 * listings to measure. One structure — optional icon, a heading, one or two
 * sentences, an optional next step — on the surface of the page it sits in:
 * `glass` for the buyer's account pages, `workspace` for the seller and
 * staff workspace. It says what is missing and what to do; it never fills
 * the space with invented content.
 *
 * A server component. The action is whatever the page passes — usually a
 * link styled with buttonClassName, because "browse properties" is
 * navigation, not a button.
 */
export type StateSurface = 'glass' | 'workspace'

export const STATE_SURFACE: Record<StateSurface, string> = {
  glass: 'glass-panel rounded-lg border border-border-subtle p-6 sm:p-8',
  workspace: 'workspace-panel workspace-empty',
}

export function EmptyState({
  title,
  children,
  action,
  icon,
  surface = 'glass',
  className,
}: {
  title: string
  /** One or two short sentences: why it is empty, what will fill it. */
  children?: ReactNode
  action?: ReactNode
  /** Decorative; rendered aria-hidden at 32px in the brand colour. */
  icon?: ReactNode
  surface?: StateSurface
  className?: string
}) {
  return (
    <div className={cn(STATE_SURFACE[surface], className)}>
      {icon && <span aria-hidden="true" className="mb-3 block size-8 text-brand-700 [&>svg]:size-8">{icon}</span>}
      <h2 className="font-display text-heading-3 text-ink-900">{title}</h2>
      {children && <div className="mt-2 text-body-sm text-ink-700">{children}</div>}
      {action && <div className="mt-5 flex flex-wrap items-center gap-3">{action}</div>}
    </div>
  )
}
