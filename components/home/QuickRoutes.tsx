import Link from 'next/link'
import type { ComponentType } from 'react'
import { HomeIcon, KeyIcon, MapPinIcon, PlusIcon, VideoIcon, CalculatorIcon } from '@/components/ui/icons'
import { MarketplaceMenu } from '@/components/navigation/MarketplaceMenu'
import { LAUNCH_CITY } from '@/lib/brand'
import { getMarketplaceNav } from '@/lib/navigation/marketplace'

type Route = { href: string; label: string; hint: string; Icon: ComponentType<{ className?: string }>; supply?: boolean }

/** Swipeable shortcuts to supported destinations; the menu holds the full catalogue. */
const ROUTES: Route[] = [
  { href: `/buy/${LAUNCH_CITY.slug}`, label: 'Buy', hint: 'Homes for sale', Icon: HomeIcon },
  { href: `/rent/${LAUNCH_CITY.slug}`, label: 'Rent', hint: 'Homes to rent', Icon: KeyIcon },
  { href: '/videos', label: 'Videos', hint: 'Property videos', Icon: VideoIcon },
  { href: '/calculators', label: 'Tools', hint: 'Plan your purchase', Icon: CalculatorIcon },
  { href: '/#localities', label: 'Localities', hint: 'Explore areas', Icon: MapPinIcon },
  { href: '/post', label: 'Post property', hint: 'List yours', Icon: PlusIcon, supply: true },
]

export function QuickRoutes() {
  return (
    <nav aria-label="Quick routes" className="quick-routes lg:hidden">
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
        <li className="quick-view-all"><MarketplaceMenu nav={getMarketplaceNav()} trigger="text" /></li>
      </ul>
    </nav>
  )
}
