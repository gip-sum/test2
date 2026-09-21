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
      <ul className="grid gap-3 md:hidden">
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
