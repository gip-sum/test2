import Link from 'next/link'
import type { ComponentType } from 'react'
import { HomeIcon, KeyIcon, MapPinIcon, PlusIcon } from '@/components/ui/icons'
import { MarketplaceMenu } from '@/components/navigation/MarketplaceMenu'
import { BRAND, LAUNCH_CITY } from '@/lib/brand'
import { getMarketplaceNav } from '@/lib/navigation/marketplace'

type Route = { href: string; label: string; hint: string; Icon: ComponentType<{ className?: string }>; supply?: boolean }

/**
 * One-tap routes to the four places most visits are headed.
 *
 * Every tile is a real destination: the two result pages, the localities
 * index on this page, and the posting flow. The three ways to find a home
 * share one look and Post keeps the supply accent, so the row reads as
 * "find" and "list" at a glance. Anything further is behind "View all",
 * which opens the same marketplace menu as the header's menu button —
 * more destinations as a list, not as more tiny icons in this row.
 *
 * Phones and tablets only: from 1024px the header carries these routes,
 * and repeating them would be noise.
 */
const ROUTES: Route[] = [
  { href: `/buy/${LAUNCH_CITY.slug}`, label: 'Buy', hint: 'Homes for sale', Icon: HomeIcon },
  { href: `/rent/${LAUNCH_CITY.slug}`, label: 'Rent', hint: 'Homes to rent', Icon: KeyIcon },
  { href: '/#localities', label: 'Localities', hint: 'Explore areas', Icon: MapPinIcon },
  { href: '/post', label: 'Post property', hint: 'List yours', Icon: PlusIcon, supply: true },
]

export function QuickRoutes() {
  return (
    <nav aria-label="Quick routes" className="quick-routes lg:hidden">
      <div className="quick-head">
        <p className="text-overline uppercase tracking-[0.14em] text-brand-600">Explore {BRAND.shortName}</p>
        <MarketplaceMenu nav={getMarketplaceNav()} trigger="text" />
      </div>
      <ul>
        {ROUTES.map(({ href, label, hint, Icon, supply }) => (
          <li key={label}>
            <Link href={href} className="quick-route">
              <span className={supply ? 'quick-icon quick-icon-supply' : 'quick-icon'} aria-hidden="true"><Icon className="size-5.5" /></span>
              <span className="quick-label">{label}</span>
              <span className="quick-hint">{hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
