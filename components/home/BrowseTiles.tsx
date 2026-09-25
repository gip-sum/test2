import Link from 'next/link'
import { PropertyTypeArt } from './PropertyTypeArt'
import { SectionHeading } from './SectionHeading'
import { getListingCountsByType } from '@/lib/property/queries'
import { BUY_BUDGET_BANDS, RENT_BUDGET_BANDS, buildLandingUrl, buildSearchUrl } from '@/lib/search/query'
import { PROPERTY_TYPE_ORDER, PROPERTY_TYPE_PLURAL, type Intent, type PropertyTypeCode } from '@/lib/property/types'
import { LAUNCH_CITY } from '@/lib/brand'

/**
 * Converts vague intent into a specific filtered URL.
 *
 * Two jobs: it removes a decision for someone who knows only their budget,
 * their configuration or the kind of home they want, and it is the main
 * internal-linking surface into the landing matrix — which is what makes
 * the site navigable in depth rather than flat.
 *
 * Property types are illustrated tiles with real inventory counts; budget
 * and configuration are chips a thumb can scan in one pass, for buying and
 * renting both, instead of three tall lists of rows.
 */
const TYPE_SLUG: Record<PropertyTypeCode, string> = {
  APARTMENT: 'flats',
  INDEPENDENT_HOUSE: 'independent-houses',
  BUILDER_FLOOR: 'builder-floors',
  VILLA: 'villas',
  STUDIO: 'studio-apartments',
}
const BHK = [1, 2, 3, 4] as const

export function BrowseTiles() {
  const city = LAUNCH_CITY.slug
  const typeCounts = getListingCountsByType('buy')
  const budget = (intent: Intent, min?: number, max?: number) => buildSearchUrl({ intent, city, priceMin: min, priceMax: max })

  return (
    <section aria-labelledby="browse-by" className="home-section">
      <SectionHeading
        id="browse-by"
        eyebrow="Make it yours"
        title="Find a home your way"
        description="Jump into a search by the detail that matters most to you."
      />

      <h3 className="browse-subhead">Browse by property type</h3>
      <ul className="type-tiles">
        {PROPERTY_TYPE_ORDER.map((type, index) => {
          const count = typeCounts.get(type)
          return (
            <li key={type}>
              <Link href={buildLandingUrl({ intent: 'buy', city, slug: TYPE_SLUG[type] })} className={`type-tile type-tone-${index % 5}`}>
                <PropertyTypeArt type={type} />
                <span className="block text-body-sm font-semibold text-ink-900">{PROPERTY_TYPE_PLURAL[type]}</span>
                <span className="block text-caption text-ink-700">{count ? `${count} for sale` : 'Explore'}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="browse-grid">
        <div className="browse-card">
          <h3 className="browse-card-title">Browse by budget</h3>
          <p className="browse-caption">To buy</p>
          <ul className="link-chips">
            {BUY_BUDGET_BANDS.map((b) => (
              <li key={b.label}><Link href={budget('buy', b.min, b.max)} className="link-chip tabular">{b.label}</Link></li>
            ))}
          </ul>
          <p className="browse-caption">To rent, per month</p>
          <ul className="link-chips">
            {RENT_BUDGET_BANDS.map((b) => (
              <li key={b.label}><Link href={budget('rent', b.min, b.max)} className="link-chip tabular">{b.label}</Link></li>
            ))}
          </ul>
        </div>

        <div className="browse-card">
          <h3 className="browse-card-title">Browse by configuration</h3>
          <p className="browse-caption">To buy</p>
          <ul className="link-chips">
            {BHK.map((n) => (
              <li key={n}><Link href={buildLandingUrl({ intent: 'buy', city, slug: `${n}-bhk` })} className="link-chip">{n} BHK</Link></li>
            ))}
          </ul>
          <p className="browse-caption">To rent</p>
          <ul className="link-chips">
            {BHK.map((n) => (
              <li key={n}><Link href={buildLandingUrl({ intent: 'rent', city, slug: `${n}-bhk` })} className="link-chip">{n} BHK</Link></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
