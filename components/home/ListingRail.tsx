import Link from 'next/link'
import { SectionHeading } from './SectionHeading'
import { CompactPropertyCard } from '@/components/property/CompactPropertyCard'
import { ArrowRightIcon } from '@/components/ui/icons'
import { getListingCount, getRecentListings } from '@/lib/property/queries'
import type { Intent } from '@/lib/property/types'
import { LAUNCH_CITY } from '@/lib/brand'

/**
 * Live inventory, as a swipeable rail.
 *
 * Phones and tablets get a horizontal scroller whose cards are narrower
 * than the screen, so the next card always shows at the edge — the peek is
 * what says "swipe" without an instruction. Scroll snapping lands each card
 * cleanly. From 1024px it becomes a four-column grid of the same list: one
 * DOM, no duplicate rendering, and no mouse user stranded in a scroller.
 *
 * The rail ends in a "see all" card carrying the real inventory count, so
 * a swipe finishes at a next step rather than a dead end. On a wide screen
 * the grid shows the first four items: with four or more listings that is
 * four cards, and with fewer the card fills the row instead of a hole.
 *
 * Titled for what it is — the newest listings — not "recommended": there
 * is no recommendation logic behind it (that is Phase 39). No two cards
 * share a cover photo: the same photo twice in one row reads as a repost.
 */
export function ListingRail({
  intent,
  eyebrow,
  title,
  description,
}: {
  intent: Intent
  eyebrow: string
  title: string
  description: string
}) {
  const listings = getRecentListings({ intent, limit: 8, withPhotos: true, distinctPhotos: true })
  const total = getListingCount(intent)
  const headingId = `rail-${intent}`
  const seeAll = `/${intent}/${LAUNCH_CITY.slug}?sort=newest`
  const noun = intent === 'buy' ? 'for sale' : 'to rent'

  if (listings.length === 0) {
    return (
      <section aria-labelledby={headingId} className="home-section">
        <SectionHeading id={headingId} eyebrow={eyebrow} title={title} />
        <div className="mt-4 rounded-lg border border-border-subtle bg-surface-000 p-5 text-center">
          <p className="text-body-sm text-ink-700">
            Nothing is listed {noun} in {LAUNCH_CITY.name} yet. If you have a property, yours can be the first.
          </p>
          <Link href="/post" className="mt-3 inline-flex h-11 items-center rounded-md bg-supply-600 px-5 text-label text-on-supply">
            Post your property
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby={headingId} className="home-section">
      <SectionHeading
        id={headingId}
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={{ href: seeAll, label: 'See all', context: `homes ${noun}` }}
      />
      <ul className="listing-rail" aria-labelledby={headingId}>
        {listings.map((property, index) => (
          <li key={property.id} className="listing-rail-item">
            <CompactPropertyCard property={property} priority={intent === 'buy' && index === 0} />
          </li>
        ))}
        <li className="listing-rail-item listing-rail-end">
          <Link href={seeAll} className="rail-end-card">
            <span className="rail-end-icon" aria-hidden="true"><ArrowRightIcon className="size-5" /></span>
            <span className="text-body font-semibold text-ink-900">See all homes {noun}</span>
            <span className="tabular text-body-sm text-ink-700">
              {total} {total === 1 ? 'listing' : 'listings'} in {LAUNCH_CITY.name}
            </span>
          </Link>
        </li>
      </ul>
    </section>
  )
}
