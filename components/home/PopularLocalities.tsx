import Link from 'next/link'
import { SectionHeading } from './SectionHeading'
import { localityExploreHref, type LocalityTile } from '@/lib/home/discovery'
import { LAUNCH_CITY } from '@/lib/brand'

/** Reference-style locality panels show actual inventory counts, not demand statistics. */
export function PopularLocalities({ popular, all }: { popular: LocalityTile[]; all: Array<{ name: string; href: string }> }) {
  return (
    <section id="localities" aria-labelledby="popular-localities" className="home-section home-anchor">
      <SectionHeading
        id="popular-localities"
        eyebrow="Explore the city"
        title={`Explore localities in ${LAUNCH_CITY.name}`}
        description="See the homes available in each neighbourhood"
      />

      <div className="locality-panels">
        {[popular.slice(0, 6), popular.slice(6)].filter(group => group.length).map((group, index) => <div key={index} className="locality-panel">
          <h3>{index === 0 ? 'Find your neighbourhood' : 'More places to explore'}</h3>
          <ul className="locality-tiles" aria-label={`Localities in ${LAUNCH_CITY.name}, group ${index + 1}`}>
        {group.map((l) => (
          <li key={l.slug} className="locality-tile">
            <p className="locality-tile-name">
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
        </div>)}
      </div>

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
