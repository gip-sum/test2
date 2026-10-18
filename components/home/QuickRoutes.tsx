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

/**
 * Phones and tablets: shortcut tiles under the hero (UI-14), as an app's
 * home screen would show them — a tinted square per destination, the
 * seller's in its own orange. Desktop has the header for these.
 */
export function QuickRoutes() {
  return (
    <nav aria-label="Quick routes" className="home-container pt-6 lg:hidden">
      <ul className="home-shortcuts -mx-4 flex gap-1 overflow-x-auto px-3 [scrollbar-width:none] sm:-mx-6 sm:px-5">
        {ROUTES.map(({ href, label, hint, Icon, supply }) => (
          <li key={label} className="w-20 shrink-0">
            <Link href={href} className="flex min-h-11 flex-col items-center gap-2 rounded-md px-1 py-1.5 text-center">
              <span className={supply ? 'grid size-13 place-items-center rounded-md bg-supply-100 text-supply-700' : 'grid size-13 place-items-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-brand-100'} aria-hidden="true">
                <Icon className="size-6" />
              </span>
              <span className="text-caption font-semibold leading-tight text-ink-900">{label}</span>
              <span className="sr-only">{hint}</span>
            </Link>
          </li>
        ))}
        <li className="flex w-20 shrink-0 items-start justify-center pt-3"><MarketplaceMenu nav={getMarketplaceNav()} trigger="text" /></li>
      </ul>
    </nav>
  )
}
