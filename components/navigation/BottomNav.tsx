'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'
import { cn } from '@/lib/cn'
import { HeartIcon, HomeIcon, PlusIcon, SearchIcon, VideoIcon } from '@/components/ui/icons'
import { LAUNCH_CITY } from '@/lib/brand'
import { bottomBarShown } from '@/lib/navigation/bottom-bar'
import type { MarketplaceNav } from '@/lib/navigation/types'
import { MarketplaceMenu } from './MarketplaceMenu'

type Item = { href: string; label: string; Icon: ComponentType<{ className?: string }>; current: (path: string) => boolean }

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`)

/**
 * Primary navigation on phones and tablets, where most of this product's
 * traffic will be (Phase D: the client's six-item model, after the 99acres
 * app, in GharBazaar's own terms and colours).
 *
 * Home · Search · Post · Videos · Activity · Menu.
 *
 *  • Post is the one filled circle, in the supply accent: supply is the
 *    scarce side of the marketplace, and the seller's action must never be
 *    mistaken for a buyer's. It sits inside the bar — Phase A lifted it
 *    over the page, where it covered the content scrolling beneath.
 *  • Activity replaces Saved and Enquiries: one place for what a visitor
 *    has done, current on every page it leads to.
 *  • Menu opens the marketplace menu (Phase C) — a button, not a page, and
 *    the only menu control on screen wherever this bar shows.
 *  • Account left the bar for Menu; it stays in the header on every screen.
 *
 * Where it is hidden lives in lib/navigation/bottom-bar, shared with the
 * header's menu button.
 */
const ITEMS: Item[] = [
  { href: '/', label: 'Home', Icon: HomeIcon, current: (p) => p === '/' },
  { href: `/buy/${LAUNCH_CITY.slug}`, label: 'Search', Icon: SearchIcon, current: (p) => under(p, '/buy') || under(p, '/rent') },
  { href: '/post', label: 'Post', Icon: PlusIcon, current: (p) => under(p, '/post') },
  { href: '/videos', label: 'Videos', Icon: VideoIcon, current: (p) => under(p, '/videos') },
  {
    href: '/account/activity',
    label: 'Activity',
    Icon: HeartIcon,
    // Everything the hub leads to is "in" Activity.
    current: (p) => ['/account/activity', '/account/saved', '/account/enquiries', '/dashboard/enquiries'].some((prefix) => under(p, prefix)),
  },
]

export function BottomNav({ nav, alwaysShow = false }: { nav: MarketplaceNav; alwaysShow?: boolean }) {
  const pathname = usePathname()
  if (!bottomBarShown(pathname, alwaysShow)) return null

  return (
    <nav
      aria-label="Primary"
      className="app-bar app-bar-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="bar-items">
        {ITEMS.map(({ href, label, Icon, current }) => {
          const active = current(pathname)
          const post = href === '/post'
          return (
            <li key={label}>
              <Link href={href} aria-current={active ? 'page' : undefined} className={cn('bar-item', post && 'bar-item-post')}>
                {post ? (
                  <span className="bar-post" aria-hidden="true"><Icon className="size-5.5" /></span>
                ) : (
                  // Where you are is a shape and a weight as well as a colour
                  // (the pill behind the icon, a bold label). The pill's box
                  // is always there, so nothing shifts when it fills.
                  <span className="bar-pill" aria-hidden="true"><Icon className="size-5.5" /></span>
                )}
                <span className="bar-label">{label}</span>
              </Link>
            </li>
          )
        })}
        <li>
          <MarketplaceMenu nav={nav} trigger="bar" />
        </li>
      </ul>
    </nav>
  )
}
