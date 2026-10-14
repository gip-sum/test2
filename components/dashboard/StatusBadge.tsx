import { cn } from '@/lib/cn'
import { DASHBOARD_LABEL, type DashboardStatus } from '@/lib/dashboard/model'

// The label carries the meaning; colour only reinforces it.
const TONE: Record<DashboardStatus, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-600',
  UNDER_REVIEW: 'bg-warn-100 text-warn-600',
  ACTIVE: 'bg-trust-100 text-trust-600',
  EXPIRED: 'bg-neutral-100 text-neutral-600',
  REJECTED: 'bg-danger-100 text-danger-600',
  CHANGES_REQUESTED: 'bg-warn-100 text-warn-600',
  WITHDRAWN: 'bg-neutral-100 text-neutral-600',
  REMOVED: 'bg-neutral-100 text-neutral-600',
}

export function StatusBadge({ status }: { status: DashboardStatus }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-caption font-semibold', TONE[status])}>
    <span className="sr-only">Status: </span>{DASHBOARD_LABEL[status]}
  </span>
}
