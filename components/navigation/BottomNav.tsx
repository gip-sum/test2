'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { BOTTOM_NAV_ITEMS } from './bottom-items'
import { bottomBarShown } from '@/lib/navigation/bottom-bar'
import type { MarketplaceNav } from '@/lib/navigation/types'
import { MarketplaceMenu } from './MarketplaceMenu'

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
        {BOTTOM_NAV_ITEMS.map(({ href, label, Icon, current }) => {
          const active = current(pathname)
          const post = href === '/post'
          return (
            <li key={label}>
              <Link href={href} aria-current={active ? 'page' : undefined} className={cn('bar-item', post && 'bar-item-post')}>
                {post ? (
                  <span className="bar-post" aria-hidden="true"><Icon className="size-5.5" /></span>
                ) : (
                  // Where you are is a shape and a weight as well as a colour
                  // (a filled icon, a bold label). The icon's box
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
