import Link from 'next/link'
import { SectionHeading } from './SectionHeading'
import { MapPinIcon } from '@/components/ui/icons'
import { localityExploreHref, type LocalityTile } from '@/lib/home/discovery'
import { LAUNCH_CITY } from '@/lib/brand'

/**
 * One-tap entry into the most-searched parts of the city, and the index of
 * all the rest.
 *
 * Each place says what it holds for both intents — "5 for sale", "2 to
 * rent" — and each figure is its own link into those results, so the tile
 * answers "is there anything here for me?" before the tap (Phase B). The
 * counts come from the search seam, so each equals the results page it
 * opens; an intent with nothing in a place is simply not offered. A place
 * with nothing at all keeps one "Explore" link, never a "0": zero reads as
 * broken where "explore" reads as new, and its results page suggests the
 * places nearby.
 *
 * Tinted tiles in two scrolling rows on phones, a grid from 1024px. This
 * section is also what the Localities route opens (`/#localities`) until
 * the city hub and locality pages arrive (Phases 29 and 30).
 */
export function PopularLocalities({ popular, all }: { popular: LocalityTile[]; all: Array<{ name: string; href: string }> }) {
  return (
    <section id="localities" aria-labelledby="popular-localities" className="home-section home-anchor">
      <SectionHeading
        id="popular-localities"
        eyebrow="Explore the city"
        title={`Where in ${LAUNCH_CITY.name} feels like home?`}
        description="A different rhythm in every neighbourhood. See what each one holds, for sale and to rent."
      />

      <ul className="locality-tiles" aria-label={`Popular localities in ${LAUNCH_CITY.name}`}>
        {popular.map((l, index) => (
          <li key={l.slug} className={`locality-tile locality-tone-${index % 4}`}>
            <p className="locality-tile-name">
              <MapPinIcon className="size-4 shrink-0" />
              <span className="truncate">{l.name}</span>
            </p>
            <p className="locality-tile-links">
              {l.forSale && (
                <Link href={l.forSale.href} className="locality-count">
                  <span className="tabular font-semibold">{l.forSale.count}</span> for sale<span className="sr-only"> in {l.name}</span>
                </Link>
              )}
              {l.toRent && (
                <Link href={l.toRent.href} className="locality-count">
                  <span className="tabular font-semibold">{l.toRent.count}</span> to rent<span className="sr-only"> in {l.name}</span>
                </Link>
              )}
              {!l.forSale && !l.toRent && (
                <Link href={localityExploreHref(l.slug)} className="locality-count">
                  Explore<span className="sr-only"> {l.name}</span>
                </Link>
              )}
            </p>
          </li>
        ))}
      </ul>

      <details className="all-localities">
        <summary>
          <span>See all {all.length} localities in {LAUNCH_CITY.name}</span>
          <svg viewBox="0 0 24 24" className="all-localities-chevron size-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <ul>
          {all.map((l) => (
            <li key={l.href}>
              <Link href={l.href}>{l.name}</Link>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
