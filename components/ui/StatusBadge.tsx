import { cn } from '@/lib/cn'
import { type BadgeStatus, STATUS_BADGE_LABEL, statusToneClass } from '@/lib/listings/status-tone'

/**
 * A listing's status, everywhere it is shown (UI-05).
 *
 * Label and tone both come from lib/listings/status-tone.ts, so a status
 * reads and looks the same on the seller dashboard, the performance page and
 * every admin screen. The label carries the meaning; the tone only
 * reinforces it, and the hidden "Status:" makes a badge in a table row or
 * card read as what it is.
 *
 * Replaces components/dashboard/StatusBadge and the never-imported
 * components/ui/StatusPill (UI-01 P9), whose own colour map and status set
 * (SOLD_OR_RENTED, DELETED as "Deleted") had drifted from the product.
 */
export function StatusBadge({ status, className, role }: {
  status: BadgeStatus
  className?: string
  /** `status` where the badge is the page's live statement of state. */
  role?: 'status'
}) {
  return (
    <span role={role} className={cn('inline-flex max-w-full items-center rounded-md px-2 py-1 text-caption font-semibold', statusToneClass(status), className)}>
      {/* A role="status" region is already announced as a status. */}
      {role !== 'status' && <span className="sr-only">Status: </span>}{STATUS_BADGE_LABEL[status]}
    </span>
  )
}
