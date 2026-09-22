import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Cold-load skeleton for a property page.
 *
 * Mirrors the real two-column layout including the sticky contact card, so
 * the page does not jump when content arrives. The gallery placeholder
 * holds the same 4:3 box the real gallery reserves, which is most of how
 * cumulative layout shift stays under 0.05 here.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-8 pt-4 lg:px-8 lg:pt-5" aria-busy>
      <span className="sr-only" role="status">
        Loading property
      </span>
      <Skeleton className="h-4 w-64" />
      <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
        <div className="min-w-0">
          <Skeleton className="aspect-[4/3] w-full rounded-lg lg:aspect-[16/10]" />
          <Skeleton className="mt-5 h-9 w-48" />
          <Skeleton className="mt-3 h-7 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-md" />
            ))}
          </div>
          <Skeleton className="mt-8 h-32 w-full rounded-md" />
        </div>
        <div className="hidden lg:block">
          <Skeleton className="h-[26rem] w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
