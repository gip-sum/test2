import { ResultCard } from '@/components/search/ResultCard'
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
 * A horizontal scroller on phones and a grid from md up, with the results
 * page's own card (UI-16), so a listing looks the same here as it does in
 * the search it came from.
 */
export function SimilarProperties({ results }: { results: PropertySummary[] }) {
  if (results.length === 0) return null

  return (
    <section aria-labelledby="similar-heading">
      <h2 id="similar-heading" className="font-display text-heading-2 text-ink-900">
        Similar properties
      </h2>
      <p className="mt-1 text-body-sm text-ink-500">
        Same configuration and locality, within a comparable price range.
      </p>

      {/* The scroller is a list, so a screen reader announces how many
          there are before the user commits to arrowing through them. */}
      {/* One list: a swipeable row on phones, a grid from md (it used to be
          two lists with every card twice, UI-06). */}
      {/* Positioned, and snapping to the gutter (CLAUDE.md, UI stack 6). The
          negative margin lets the row run to the screen edge on a phone. */}
      <ul className="similar-row relative -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4">
        {results.map((p) => (
          <li key={p.id} className="w-[82%] max-w-80 shrink-0 snap-start md:w-auto md:max-w-none">
            <ResultCard property={p} />
          </li>
        ))}
      </ul>
    </section>
  )
}
