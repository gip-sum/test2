import { cn } from '@/lib/cn'
import { DASHBOARD_LABEL, type DashboardStatus } from '@/lib/dashboard/model'
import { statusToneClass } from '@/lib/listings/status-tone'

// The label carries the meaning; the tone (lib/listings/status-tone.ts) only reinforces it.
export function StatusBadge({ status }: { status: DashboardStatus }) {
  return <span className={cn('inline-flex max-w-full items-center rounded-md px-2 py-1 text-caption font-semibold', statusToneClass(status))}>
    <span className="sr-only">Status: </span>{DASHBOARD_LABEL[status]}
  </span>
}
