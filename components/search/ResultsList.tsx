import { ResultCard } from './ResultCard'
import type { PropertySummary } from '@/lib/property/types'

/**
 * The result set.
 *
 * A server component with no interactivity, so the listings never enter the
 * client bundle — SearchLayout takes this as `children`.
 *
 * One list of ResultCards (UI-15): one column on phones, a grid from md up. It
 * used to be two lists, one hidden by CSS at each width, which put every
 * listing in the page twice — double the DOM a sheet opening restyles, and
 * the grid's priority photos preloaded on phones that never showed them
 * (UI-06).
 */
export function ResultsList({ results, areaOf }: { results: PropertySummary[]; areaOf?: (localitySlug: string) => string | undefined }) {
  return (
    <>
      <h2 className="sr-only">Results</h2>
      {/* grid-cols-1 is repeat(1, minmax(0, 1fr)). The implicit column it
          replaces was `auto`, which never shrinks below a card's min-content:
          at 320px a price row that cannot break further widened the column,
          the page and the fixed bottom bar by 8px. */}
      <ul className="results-list grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
        {results.map((p, i) => (
          // data-area (map view, UI-21): the map area this card is drawn in,
          // so the map can outline the chosen area's cards and a focused
          // card can mark its marker.
          <li key={p.id} data-area={areaOf?.(p.localitySlug)}>
            <ResultCard property={p} priority={i < 3} />
          </li>
        ))}
      </ul>
    </>
  )
}
