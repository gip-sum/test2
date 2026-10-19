import { Skeleton } from '@/components/ui/Skeleton'

/**
 * A ResultCard while the results load (UI-15): the same frame, photo and
 * reading order, so nothing moves when the real cards arrive.
 */
export function ResultCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col rounded-lg border border-border-subtle bg-surface-000 shadow-e1">
      <Skeleton className="m-2 mb-0 aspect-[16/10] rounded-md md:aspect-[3/2]" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-4 pb-4 pt-3">
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
