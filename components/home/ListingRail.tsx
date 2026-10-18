import Link from 'next/link'
import { SectionHeading } from './SectionHeading'
import { HomePropertyCard } from './HomePropertyCard'
import { ArrowRightIcon } from '@/components/ui/icons'
import type { Collection } from '@/lib/home/discovery'
import { LAUNCH_CITY } from '@/lib/brand'

/**
 * A collection of live listings, as a swipeable rail.
 *
 * Phones and tablets get a horizontal scroller whose cards are narrower
 * than the screen, so the next card always shows at the edge — the peek is
 * what says "swipe" without an instruction. Scroll snapping lands each card
 * cleanly. From 1024px it becomes a four-column grid of the same list: one
 * DOM, no duplicate rendering, and no mouse user stranded in a scroller.
 *
 * The rail ends in a forest "see all" card carrying the real total, so a
 * swipe finishes at a next step rather than a dead end. On a wide screen
 * the grid shows three listings and that card (UI-14).
 *
 * Presentational (Phase B): what goes in it, and how many there are in
 * all, comes from lib/home/discovery, through the search seam. Each rail is
 * titled for what it is — the newest, the reduced, the under construction
 * — never "recommended": there is no recommendation logic (Phase 39).
 *
 * A rail with nothing in it disappears, unless it is given an invitation
 * to show instead: the two main rails say plainly that nothing is listed
 * yet and invite the first listing; a secondary collection just steps
 * aside.
 */
export function ListingRail({
  collection,
  eyebrow,
  title,
  description,
  noun,
  invite = false,
  priority = false,
}: {
  collection: Collection
  eyebrow: string
  title: string
  description: string
  /** Completes "See all homes …" and the empty invitation: "for sale", "to rent", "with a reduced price". */
  noun: string
  invite?: boolean
  priority?: boolean
}) {
  const { id, listings, total, href } = collection
  const headingId = `rail-${id}`
  const frame = 'home-band'

  if (listings.length === 0) {
    if (!invite) return null
    return (
      <section aria-labelledby={headingId} className={frame}>
        <div className="home-container">
          <SectionHeading id={headingId} eyebrow={eyebrow} title={title} />
          <div className="mt-6 rounded-lg border border-border-subtle bg-surface-000 p-6 text-center">
            <p className="text-body text-ink-700">
              Nothing is listed {noun} in {LAUNCH_CITY.name} yet. If you have a property, yours can be the first.
            </p>
            <Link href="/post" className="mt-4 inline-flex h-11 items-center rounded-full bg-supply-600 px-5 text-label text-on-supply">
              Post your property
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby={headingId} className={frame}>
      <div className="home-container">
        <SectionHeading
          id={headingId}
          eyebrow={eyebrow}
          title={title}
          description={description}
          action={{ href, label: 'View all', context: `homes ${noun}` }}
        />
        <ul className="home-rail mt-6 lg:mt-8" aria-labelledby={headingId}>
          {listings.map((property, index) => (
            <li key={property.id}>
              <HomePropertyCard property={property} priority={priority && index === 0} />
            </li>
          ))}
          <li className="home-rail-end">
            <Link href={href} className="home-card home-arrow-card relative flex h-full min-h-56 flex-col justify-between overflow-hidden rounded-lg bg-forest p-6 text-on-forest shadow-e1">
              <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-brand-500/25" />
              <span aria-hidden className="absolute -bottom-12 -left-8 size-36 rounded-full bg-mint/10" />
              <span className="relative">
                <span className="block font-display text-display-1 tabular text-mint">{total}</span>
                <span className="mt-1 block text-body-sm text-on-forest/80">{total === 1 ? 'listing' : 'listings'} in {LAUNCH_CITY.name}</span>
              </span>
              <span className="relative flex items-center justify-between gap-3">
                <span className="text-body-lg font-semibold">See all homes {noun}</span>
                <span className="home-arrow grid size-11 shrink-0 place-items-center rounded-full bg-mint text-forest" aria-hidden><ArrowRightIcon className="size-5" /></span>
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </section>
  )
}
