import { PropertyCardSkeleton } from '@/components/property/PropertyCardSkeleton'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * First-load skeleton for a results URL.
 *
 * Covers arriving cold — a shared link, a refresh, a crawl. It deliberately
 * does NOT cover changing a filter on a page that is already open:
 * SearchLayout dims the existing results instead, because replacing a full
 * grid with skeletons on every tick makes a multi-filter session strobe.
 *
 * The skeleton mirrors the real layout, rail included, so nothing jumps
 * when the results arrive.
 */
export function SearchLoadingState() {
  return (
    <div className="mx-auto max-w-[1320px] px-4 py-5 lg:px-8 lg:py-6" aria-busy>
      <span className="sr-only" role="status">
        Loading properties
      </span>
      <Skeleton className="h-8 w-3/4 max-w-lg" />
      <Skeleton className="mt-2 h-4 w-40" />

      <div className="mt-4 flex items-center justify-between gap-3">
        <Skeleton className="h-11 w-28 lg:hidden" />
        <Skeleton className="ml-auto h-11 w-44" />
      </div>

      <div className="mt-5 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-7">
        <div className="hidden lg:block">
          <Skeleton className="h-[32rem] w-full rounded-lg" />
        </div>
        <div className="min-w-0">
          <div className="grid gap-3 md:hidden">
            {Array.from({ length: 4 }, (_, i) => (
              <PropertyCardSkeleton key={i} layout="horizontal" />
            ))}
          </div>
          <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <PropertyCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
