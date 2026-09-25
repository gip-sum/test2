import Link from 'next/link'
import { SectionHeading } from './SectionHeading'
import { MapPinIcon } from '@/components/ui/icons'
import { getCityLocalities, getPopularLocalities } from '@/lib/location/queries'
import { getListingCountsByLocality } from '@/lib/property/queries'
import { LAUNCH_CITY } from '@/lib/brand'

/**
 * One-tap entry into the most-searched parts of the city, and the index of
 * all the rest.
 *
 * Compact tinted tiles in two scrolling rows on phones (a grid from 1024px)
 * replace the old column of identical line drawings, which cost a screen
 * per four places. Every place is a link into its real results page.
 *
 * Counts come from real inventory — never invented. With seeded data they
 * are small, which is honest: that is what a marketplace looks like before
 * sellers arrive. A place with nothing in it says "Explore" rather than a
 * zero, because "0" reads as broken where blank reads as new.
 *
 * This section is also what the Localities route opens (`/#localities`)
 * until the city hub and locality pages arrive (Phases 29 and 30).
 */
export function PopularLocalities() {
  const popular = getPopularLocalities()
  const all = getCityLocalities()
  const counts = getListingCountsByLocality('buy')
  const city = LAUNCH_CITY.slug

  return (
    <section id="localities" aria-labelledby="popular-localities" className="home-section home-anchor">
      <SectionHeading
        id="popular-localities"
        eyebrow="Explore the city"
        title={`Where in ${LAUNCH_CITY.name} feels like home?`}
        description="A different rhythm in every neighbourhood. Find the one that feels like you."
      />

      <ul className="locality-tiles" aria-label={`Popular localities in ${LAUNCH_CITY.name}`}>
        {popular.map((l, index) => {
          const count = counts.get(l.slug)
          return (
            <li key={l.slug}>
              <Link href={`/buy/${city}/${l.slug}`} className={`locality-tile locality-tone-${index % 4}`}>
                <MapPinIcon className="size-4.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate text-body-sm font-semibold text-ink-900">{l.name}</span>
                  <span className="block text-caption text-ink-700">
                    {count ? `${count} for sale` : 'Explore'}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      <details className="all-localities">
        <summary>
          <span>All {all.length} localities in {LAUNCH_CITY.name}</span>
          <svg viewBox="0 0 24 24" className="all-localities-chevron size-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <ul>
          {all.map((l) => (
            <li key={l.slug}>
              <Link href={`/buy/${city}/${l.slug}`}>{l.name}</Link>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
