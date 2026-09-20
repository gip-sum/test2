import { cn } from '@/lib/cn'

/**
 * The listing lifecycle, in words a first-time seller understands.
 *
 * The database says UNDER_REVIEW; the seller reads "Being reviewed".
 * This component is the entire translation layer.
 */
export type ListingStatus =
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'ACTIVE'
  | 'REJECTED'
  | 'EXPIRED'
  | 'SOLD_OR_RENTED'
  | 'DELETED'

const LABEL: Record<ListingStatus, string> = {
  DRAFT: 'Draft',
  UNDER_REVIEW: 'Being reviewed',
  ACTIVE: 'Live',
  REJECTED: 'Needs changes',
  EXPIRED: 'Expired',
  SOLD_OR_RENTED: 'Closed',
  DELETED: 'Deleted',
}

const TONE: Record<ListingStatus, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-600',
  UNDER_REVIEW: 'bg-warn-100 text-warn-600',
  ACTIVE: 'bg-trust-100 text-trust-600',
  REJECTED: 'bg-danger-100 text-danger-600',
  EXPIRED: 'bg-neutral-100 text-neutral-600',
  SOLD_OR_RENTED: 'bg-neutral-100 text-neutral-600',
  DELETED: 'bg-neutral-100 text-neutral-600',
}

export function StatusPill({ status }: { status: ListingStatus }) {
  // The label carries the meaning on its own — colour is reinforcement,
  // never the only signal.
  return (
    <span
      className={cn(
        'inline-flex h-6.5 items-center rounded-full px-3 text-caption font-semibold',
        TONE[status],
      )}
    >
      {LABEL[status]}
    </span>
  )
}
