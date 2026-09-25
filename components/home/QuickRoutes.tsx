import Link from 'next/link'
import type { ComponentType } from 'react'
import { HomeIcon, KeyIcon, MapPinIcon, PlusIcon } from '@/components/ui/icons'
import { LAUNCH_CITY } from '@/lib/brand'

type Route = { href: string; label: string; hint: string; Icon: ComponentType<{ className?: string }>; tone: string }

/**
 * One-tap routes to the four places most visits are headed.
 *
 * Every tile is a real destination: the two result pages, the localities
 * index on this page, and the posting flow. Phones and tablets only — from
 * 1024px the header carries the same four routes, and repeating them would
 * be noise.
 */
const ROUTES: Route[] = [
  { href: `/buy/${LAUNCH_CITY.slug}`, label: 'Buy', hint: 'Homes for sale', Icon: HomeIcon, tone: 'quick-tone-buy' },
  { href: `/rent/${LAUNCH_CITY.slug}`, label: 'Rent', hint: 'Homes to rent', Icon: KeyIcon, tone: 'quick-tone-rent' },
  { href: '/#localities', label: 'Localities', hint: 'Explore areas', Icon: MapPinIcon, tone: 'quick-tone-places' },
  { href: '/post', label: 'Post property', hint: 'List yours', Icon: PlusIcon, tone: 'quick-tone-post' },
]

export function QuickRoutes() {
  return (
    <nav aria-label="Quick routes" className="quick-routes lg:hidden">
      <ul>
        {ROUTES.map(({ href, label, hint, Icon, tone }) => (
          <li key={label}>
            <Link href={href} className="quick-route">
              <span className={`quick-icon ${tone}`} aria-hidden="true"><Icon className="size-5.5" /></span>
              <span className="quick-label">{label}</span>
              <span className="quick-hint">{hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
