import { PropertyCard } from './PropertyCard'
import type { PropertySummary } from '@/lib/property/types'

/**
 * Other properties worth comparing this one against.
 *
 * The list is produced by `lib/property/similar.ts`, whose rule is fixed
 * and explainable. This component only renders it — and renders nothing at
 * all when the rule found fewer than four, because a section headed
 * "Similar properties" showing two loosely-related flats is worse than the
 * space it occupies.
 *
 * A horizontal scroller on phones and a grid from md up, matching how
 * results are shown, so a card means the same thing everywhere.
 */
export function SimilarProperties({ results }: { results: PropertySummary[] }) {
  if (results.length === 0) return null

  return (
    <section aria-labelledby="similar-heading">
      <h2 id="similar-heading" className="font-display text-heading-3 text-ink-900">
        Similar properties
      </h2>
      <p className="mt-1 text-body-sm text-ink-500">
        Same configuration and locality, within a comparable price range.
      </p>

      {/* The scroller is a list, so a screen reader announces how many
          there are before the user commits to arrowing through them. */}
      <ul className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:hidden">
        {results.map((p) => (
          <li key={p.id} className="w-[78%] shrink-0 snap-start">
            <PropertyCard property={p} />
          </li>
        ))}
      </ul>
      <ul className="mt-4 hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
        {results.map((p) => (
          <li key={p.id}>
            <PropertyCard property={p} />
          </li>
        ))}
      </ul>
    </section>
  )
}
