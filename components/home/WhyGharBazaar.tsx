import type { ComponentType } from 'react'
import { MailIcon, MapPinIcon, SearchIcon, SlidersIcon } from '@/components/ui/icons'
import { BRAND, LAUNCH_CITY } from '@/lib/brand'

type Point = { title: string; body: string; Icon: ComponentType<{ className?: string }> }

/**
 * Why this marketplace (Phase B; UI-14 layout): four plain statements of
 * what the product does, each one true of the product as built.
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
  },
  {
    title: 'Discovery that fits how you search',
    body: 'Locality, budget, size and type in one search — and every search has its own link, to come back to or share.',
    Icon: SearchIcon,
  },
  {
    title: `Made for ${LAUNCH_CITY.name}`,
    body: `One city, organised by its own neighbourhoods, from New Town's action areas to the lanes of Ballygunge.`,
    Icon: MapPinIcon,
  },
  {
    title: 'Enquiries kept in one place',
    body: 'Enquire from any listing and keep a record of each one in your account. Owners, agents and builders have an enquiry list of their own.',
    Icon: MailIcon,
  },
]

export function WhyGharBazaar() {
  return (
    <section aria-labelledby="why-us" className="home-band home-band-paper">
      <div className="home-container grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <p className="flex items-center gap-2 text-overline uppercase text-brand-600">
            <span aria-hidden className="h-0.5 w-6 rounded-full bg-brand-500" />Why {BRAND.shortName}
          </p>
          <h2 id="why-us" className="mt-2 font-display text-heading-2 text-ink-900 lg:text-display-1">A clearer way to find a home.</h2>
          <p className="mt-4 max-w-md text-body text-ink-700 lg:text-body-lg">
            Built around how people in {LAUNCH_CITY.name} actually look for a place: by neighbourhood, by budget, and with the facts that matter stated plainly.
          </p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:gap-5">
          {POINTS.map(({ title, body, Icon }, index) => (
            <li key={title} className="rounded-lg border border-border-subtle bg-surface-000 p-5 shadow-e1 lg:p-6">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-md bg-forest text-mint" aria-hidden><Icon className="size-5" /></span>
                <span className="font-display text-heading-3 tabular text-border-strong" aria-hidden>{String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="mt-4 text-body-lg font-semibold text-ink-900">{title}</h3>
              <p className="mt-1.5 text-body-sm text-ink-700">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
