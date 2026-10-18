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
// The search page awaits its params, so React streams this skeleton first and
// the finished page after it in the SAME response, as a hidden segment
// (<div hidden id="S:0">) that a script then swaps in. With JavaScript off,
// slow to load or failed, nothing swaps, and the page stayed a skeleton
// forever (UI-04 risk). This style exists only when scripting is off — a
// browser with JavaScript treats <noscript> content as inert text — and
// shows the streamed page while hiding the skeleton. The segment holds the
// complete page, header and results, and is the last thing in <body>, so it
// renders in order. Tailwind's preflight hides [hidden] with !important in
// @layer base, and a layered !important outranks an unlayered one, so the
// reveal sits in @layer theme — declared before base, so its !important
// wins. React's segment markup is an implementation detail: ui-check loads
// search with JavaScript disabled and fails if it changes.
const NO_SCRIPT_REVEAL = '[data-search-fallback]{display:none!important}@layer theme{div[hidden][id^="S:"]{display:block!important}}'

export function SearchLoadingState() {
  return (
    <div data-search-fallback="" className="mx-auto max-w-[1320px] px-4 py-5 lg:px-8 lg:py-6" aria-busy>
      <noscript><style>{NO_SCRIPT_REVEAL}</style></noscript>
      <span className="sr-only" role="status">
        Loading properties
      </span>
      <Skeleton className="h-8 w-3/4 max-w-lg" />
      <Skeleton className="mt-2 h-4 w-40" />

      {/* Sized like the real Filters button (126px) and sort select (195px)
          and wrapping like SearchLayout's toolbar, so on narrow phones the
          results do not jump a row when they arrive. */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-11 w-32 lg:hidden" />
        <Skeleton className="ml-auto h-11 w-48" />
      </div>

      <div className="mt-5 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-7">
        <div className="hidden lg:block">
          <Skeleton className="h-[32rem] w-full rounded-lg" />
        </div>
        <div className="min-w-0">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <PropertyCardSkeleton key={i} layout="responsive" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
