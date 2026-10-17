import { PropertyCard } from '@/components/property/PropertyCard'
import type { PropertySummary } from '@/lib/property/types'

/**
 * The result set.
 *
 * A server component with no interactivity, so the listings never enter the
 * client bundle — SearchLayout takes this as `children`.
 *
 * Horizontal cards on phones, a grid from md up: a vertical card shows
 * about 1.5 results per phone screen, a horizontal one shows three or four
 * while keeping the photo large enough to judge.
 */
export function ResultsList({ results }: { results: PropertySummary[] }) {
  return (
    <>
      <h2 className="sr-only">Results</h2>
      {/* grid-cols-1 is repeat(1, minmax(0, 1fr)). The implicit column it
          replaces was `auto`, which never shrinks below a card's min-content:
          at 320px a price row that cannot break further widened the column,
          the page and the fixed bottom bar by 8px. */}
      <ul className="grid grid-cols-1 gap-3 md:hidden">
        {results.map((p) => (
          <li key={p.id}>
            <PropertyCard property={p} layout="horizontal" />
          </li>
        ))}
      </ul>
      <ul className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
        {results.map((p, i) => (
          <li key={p.id}>
            <PropertyCard property={p} priority={i < 3} />
          </li>
        ))}
      </ul>
    </>
  )
}
