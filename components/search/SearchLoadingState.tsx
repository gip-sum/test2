import { PageShell } from '@/components/layout/PageShell'
import { ResultCardSkeleton } from './ResultCardSkeleton'
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
  // Inside the page shell (UI-15), so the header and bottom bar are there
  // while the results stream and stay put when they arrive; it used to be a
  // bare skeleton with no way back to the rest of the site. The fallback
  // marker wraps the shell, so without JavaScript the whole of it gives way
  // to the streamed page, which has its own.
  return (
    <div data-search-fallback="" aria-busy>
      <noscript><style>{NO_SCRIPT_REVEAL}</style></noscript>
      <PageShell>
      <span className="sr-only" role="status">
        Loading properties
      </span>
      {/* The search band, sized like the real one (UI-15). */}
      <div className="search-band">
        <div className="home-container pb-5 pt-3 lg:pb-8 lg:pt-5">
          <Skeleton className="h-9 w-full rounded-md" />
          <div className="mt-4 flex items-center justify-between gap-3 lg:mt-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-8 w-3/4 max-w-xl lg:h-11" />
          <Skeleton className="mt-2.5 h-5 w-36" />
        </div>
      </div>

      <div className="home-container pb-12 pt-4 lg:pt-8">
        <div className="lg:grid lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className="hidden lg:block">
            <Skeleton className="h-[34rem] w-full rounded-lg" />
          </div>
          <div className="min-w-0">
            {/* Filters and Sort on one row, as in SearchLayout's toolbar. */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-32 rounded-full lg:hidden" />
              <Skeleton className="max-lg:hidden h-5 w-40" />
              <Skeleton className="ml-auto h-11 min-w-0 flex-1 rounded-full lg:w-60 lg:flex-none" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:mt-5 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <ResultCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
      </PageShell>
    </div>
  )
}
