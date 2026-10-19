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
export type StateSurface = 'glass' | 'workspace' | 'card'

export const STATE_SURFACE: Record<StateSurface, string> = {
  glass: 'glass-panel rounded-lg border border-border-subtle p-6 sm:p-8',
  workspace: 'workspace-panel workspace-empty',
  // The results page's white card (UI-15), beside the result cards.
  card: 'rounded-lg border border-border-subtle bg-surface-000 p-6 shadow-e1 sm:p-8',
}

export function EmptyState({
  title,
  children,
  action,
  icon,
  surface = 'glass',
  heading: Heading = 'h2',
  headingId,
  className,
}: {
  title: string
  /** For a surrounding section labelled by this heading. */
  headingId?: string
  /** h3 when the state sits inside a section that already has its h2. */
  heading?: 'h2' | 'h3'
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
      {icon && (
        surface === 'card'
          ? <span aria-hidden="true" className="mb-4 grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700 [&>svg]:size-6">{icon}</span>
          : <span aria-hidden="true" className="mb-3 block size-8 text-brand-700 [&>svg]:size-8">{icon}</span>
      )}
      <Heading id={headingId} className="font-display text-heading-3 text-ink-900">{title}</Heading>
      {children && <div className="mt-2 text-body-sm text-ink-700">{children}</div>}
      {action && <div className="mt-5 flex flex-wrap items-center gap-3">{action}</div>}
    </div>
  )
}
