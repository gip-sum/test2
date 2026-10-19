import { Skeleton } from '@/components/ui/Skeleton'

/**
 * A ResultCard while the results load (UI-15): the same frame, photo and
 * reading order, so nothing moves when the real cards arrive. Horizontal
 * on a phone, vertical from 768px, like the card.
 */
export function ResultCardSkeleton() {
  return (
    <div aria-hidden className="flex rounded-lg border border-border-subtle bg-surface-000 shadow-e1 md:flex-col">
      <Skeleton className="m-2 min-h-44 w-[38%] max-w-[180px] shrink-0 rounded-md md:mb-0 md:aspect-[3/2] md:min-h-0 md:w-auto md:max-w-none" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 py-3 pl-1 pr-3 md:px-4 md:pb-4 md:pt-3">
        <Skeleton className="h-7 w-2/5" />
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-1 h-16 w-full rounded-md" />
        <Skeleton className="mt-auto h-3.5 w-2/5" />
      </div>
    </div>
  )
}
