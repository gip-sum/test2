import type { ComponentType } from 'react'
import { MailIcon, MapPinIcon, SearchIcon, SlidersIcon } from '@/components/ui/icons'
import { BRAND, LAUNCH_CITY } from '@/lib/brand'

type Point = { title: string; body: string; Icon: ComponentType<{ className?: string }>; tone: string }

/**
 * Why this marketplace (Phase B): four plain statements of what the
 * product does, each one true of the product as built.
 *
 * Deliberately no numbers, ratings or "verified" marks — the platform has
 * no users to count yet and verifies nothing, and a trust section that
 * invents either is the least trustworthy thing a page can carry. Each
 * point describes a feature that exists: carpet area kept apart from other
 * areas and the advertiser named on every listing; searches with their own
 * links; one city, by its own neighbourhoods; and an enquiry history kept
 * for both sides.
 */
const POINTS: Point[] = [
  {
    title: 'Clear property information',
    body: 'Carpet area is shown on its own, never blended with built-up or super built-up, and every listing says whether an owner, agent or builder posted it.',
    Icon: SlidersIcon,
    tone: 'why-tone-mint',
  },
  {
    title: 'Discovery that fits how you search',
    body: 'Locality, budget, size and type in one search — and every search has its own link, to come back to or share.',
    Icon: SearchIcon,
    tone: 'why-tone-sky',
  },
  {
    title: `Made for ${LAUNCH_CITY.name}`,
    body: `One city, organised by its own neighbourhoods, from New Town's action areas to the lanes of Ballygunge.`,
    Icon: MapPinIcon,
    tone: 'why-tone-sand',
  },
  {
    title: 'Enquiries kept in one place',
    body: 'Enquire from any listing and keep a record of each one in your account. Owners, agents and builders have an enquiry list of their own.',
    Icon: MailIcon,
    tone: 'why-tone-rose',
  },
]

export function WhyGharBazaar() {
  return (
    <section aria-labelledby="why-us" className="home-section home-why">
      <p className="text-overline uppercase tracking-[0.14em] text-brand-600">Why {BRAND.shortName}</p>
      <h2 id="why-us" className="mt-1 font-display text-ink-900">A clearer way to find home.</h2>
      <ul className="why-points">
        {POINTS.map(({ title, body, Icon, tone }) => (
          <li key={title} className="why-point">
            <span className={`why-icon ${tone}`} aria-hidden="true"><Icon className="size-5" /></span>
            <div className="min-w-0">
              <h3 className="text-body font-semibold text-ink-900">{title}</h3>
              <p className="mt-1 text-body-sm text-ink-700">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
