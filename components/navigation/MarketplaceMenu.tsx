'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { ChevronRightIcon, HomeIcon, MenuIcon } from '@/components/ui/icons'
import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/cn'
import type { MarketplaceNav } from '@/lib/navigation/types'
import { HUB_TITLE, HubGroup, HubRows, HubSell, HubTiles } from './hub'

/**
 * Every destination in one place, on phones and tablets: the discovery hub
 * (Phase C, over Phase A's menu).
 *
 * Opened from the header's menu button and from "View all" on the quick
 * routes. Each trigger owns its sheet — there is no global menu state to
 * keep in step — and the sheet is the shared Radix-based one, which
 * already traps focus, locks scroll, closes on Escape, makes the page
 * behind inert and hands focus back to whatever opened it.
 *
 * Full screen on phones, grouped the way people look: Buy and Rent first
 * as the two big choices, posting straight after in the supply accent,
 * then kinds of home, ways to discover, tools and the account. From 768px
 * the same groups sit in two columns of a wide dialog. The bottom bar
 * stays as it is; this supplements it.
 *
 * A link closes the sheet as it navigates: an in-page link (/#localities
 * on the homepage) would otherwise scroll the page behind a dialog that is
 * still open.
 */
export function MarketplaceMenu({ nav, trigger, className }: {
  nav: MarketplaceNav
  trigger: 'icon' | 'text'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const done = () => setOpen(false)
  const at = { pathname, onNavigate: done }
  const { hub } = nav

  return (
    <>
      {trigger === 'icon' ? (
        <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-label="Menu" onClick={() => setOpen(true)}
          className={cn('grid size-11 shrink-0 place-items-center rounded-md border border-border-strong text-ink-900 hover:border-ink-500', className)}>
          <MenuIcon className="size-5" />
        </button>
      ) : (
        <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}
          className={cn('inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md pl-2 text-label text-brand-600 hover:underline', className)}>
          View all<span className="sr-only"> destinations</span>
          <ChevronRightIcon className="size-4" />
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen} size="wide" title={`Explore ${BRAND.shortName}`} description="Every part of the marketplace, grouped: finding a home, posting one, tools and your account.">
        {/* Headings: the sheet's title is the h2, each group an h3, the
            popular localities an h4 inside Discover. */}
        <nav aria-label="All destinations" className="hub-sheet">
          <Link href="/" onClick={done} aria-current={pathname === '/' ? 'page' : undefined} className="menu-home">
            <HomeIcon className="size-5" /> Home
          </Link>
          <div className="hub-cols">
            <div className="hub-col">
              <HubGroup id="hub-m-explore" title={HUB_TITLE.explore} level={3}>
                <HubTiles entries={hub.explore} {...at} />
              </HubGroup>
              <HubSell id="hub-m-sell" level={3} sell={hub.sell} {...at} />
              {hub.types.length > 0 && (
                <HubGroup id="hub-m-types" title={HUB_TITLE.types} level={3}>
                  <HubRows entries={hub.types} {...at} />
                </HubGroup>
              )}
            </div>
            <div className="hub-col">
              <HubGroup id="hub-m-discover" title={HUB_TITLE.discover} level={3}>
                <HubRows entries={hub.discover} {...at} />
                <HubGroup id="hub-m-localities" title={HUB_TITLE.localities} level={4} className="hub-subgroup">
                  <HubRows entries={hub.localities} icons={false} {...at} />
                </HubGroup>
              </HubGroup>
              <HubGroup id="hub-m-tools" title={HUB_TITLE.tools} level={3}>
                <HubRows entries={hub.tools} {...at} />
              </HubGroup>
              <HubGroup id="hub-m-account" title={HUB_TITLE.account} level={3}>
                <HubRows entries={hub.account} {...at} />
              </HubGroup>
            </div>
          </div>
        </nav>
      </Sheet>
    </>
  )
}
