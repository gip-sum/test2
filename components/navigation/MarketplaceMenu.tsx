'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { ChevronRightIcon, HomeIcon, MenuIcon, KeyIcon, CalculatorIcon, UserIcon, MapPinIcon, PlusIcon, VideoIcon, HeartIcon, BuildingIcon, LayersIcon, VillaIcon, StudioIcon } from '@/components/ui/icons'
import { BRAND, LAUNCH_CITY } from '@/lib/brand'
import { cn } from '@/lib/cn'
import { bottomBarShown } from '@/lib/navigation/bottom-bar'
import type { MarketplaceNav } from '@/lib/navigation/types'
import type { HubEntry } from '@/lib/navigation/types'
import { BOTTOM_NAV_ITEMS } from './bottom-items'

/** The reference category rail uses the existing hub's destinations.
 * The modal retains Radix focus/scroll handling and closes before navigation.
 */
export function MarketplaceMenu({ nav, trigger, barForced = false, className }: {
  nav: MarketplaceNav
  trigger: 'icon' | 'text' | 'bar'
  /** For the header icon: the page forces the bottom bar on, so the bar's Menu is there. */
  barForced?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const done = () => setOpen(false)
  const [category, setCategory] = useState(pathname.startsWith('/rent') ? 'rent' : pathname.startsWith('/account') ? 'account' : 'buy')
  const { hub } = nav

  if (trigger === 'icon' && bottomBarShown(pathname, barForced)) return null

  return (
    <>
      {trigger === 'bar' ? (
        <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} className="bar-item">
          <span className="bar-pill" aria-hidden="true"><MenuIcon className="size-5.5" /></span>
          <span className="bar-label">Menu</span>
        </button>
      ) : trigger === 'icon' ? (
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

      <Sheet open={open} onOpenChange={setOpen} size="marketplace" title="All Categories" description="Choose a category, then a destination." footer={
        <nav aria-label="Menu primary" className="reference-menu-bottom">
          {BOTTOM_NAV_ITEMS.map(({ href, label, Icon }) => <Link key={href} href={href} onClick={done}><Icon className="size-6" /><span>{label}</span></Link>)}
          <button onClick={done} type="button" aria-label="Close menu"><MenuIcon className="size-6" /><strong>Menu</strong></button>
        </nav>
      }>
        <nav aria-label="All destinations" className="reference-menu">
          <div className="reference-menu-categories" aria-label="Categories">
            <Link href="/post" onClick={done}><PlusIcon className="size-6" />Sell/Rent</Link>
            {[{ id: 'buy', label: 'Buy Residential', Icon: HomeIcon }, { id: 'rent', label: 'Rent a home', Icon: KeyIcon }, { id: 'places', label: 'Localities', Icon: MapPinIcon }, { id: 'tools', label: 'Budget & EMI', Icon: CalculatorIcon }, { id: 'account', label: 'Activity & Account', Icon: UserIcon }].map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={category === id} aria-controls="menu-category-content" onClick={() => setCategory(id)}><Icon className="size-6" /><span>{label}</span></button>)}
          </div>
          <div id="menu-category-content" className="reference-menu-content" key={category}>
            <div className="menu-welcome"><UserIcon className="size-8" /><div><strong>Hello</strong><p>Your space on {BRAND.shortName}</p></div><Link href="/account" onClick={done} className="reference-login">Your account / Sign in</Link></div>
            {(category === 'buy' || category === 'rent') && <>
              <h3>Browse Videos</h3><Link className="menu-video" href="/videos" onClick={done}><VideoIcon className="size-6" />Videos</Link>
              <h3>Property Options</h3>
              <div className="menu-property-grid">
                {hub.types.map((entry, i) => {
                  const link = entry.pills?.find(p => p.label === (category === 'buy' ? 'Buy' : 'Rent'))
                  const Icon = [BuildingIcon, HomeIcon, LayersIcon, VillaIcon, StudioIcon][i % 5]!
                  return link ? <Link key={entry.id} href={link.href} aria-current={pathname === link.href ? 'page' : undefined} onClick={done}><Icon className="size-6" /><span>{entry.label}</span></Link> : null
                })}
              </div>
              <Link className="menu-all-homes" href={`/${category}/${LAUNCH_CITY.slug}`} onClick={done}>View all homes {category === 'buy' ? 'for sale' : 'to rent'} <ChevronRightIcon className="size-4" /></Link>
              <h3>Explore more</h3><MenuTiles entries={hub.discover} done={done} intent={category} />
            </>}
            {category === 'places' && <><h3>Popular localities</h3><MenuTiles entries={hub.localities} done={done} /></>}
            {category === 'tools' && <><h3>Plan your purchase</h3><MenuTiles entries={hub.tools} done={done} /></>}
            {category === 'account' && <><h3>Your activity</h3><Link href="/account/activity" className="menu-video" onClick={done}><HeartIcon className="size-6" />Activity</Link><MenuTiles entries={[...hub.account, ...hub.sell.more]} done={done} /></>}
          </div>
        </nav>
      </Sheet>
    </>
  )
}

function MenuTiles({ entries, done, intent }: { entries: HubEntry[]; done: () => void; intent?: string }) {
  const available = entries.filter(entry => entry.href || entry.pills?.some(p => !intent || p.label === (intent === 'buy' ? 'Buy' : 'Rent')))
  return <ul className="menu-extra-tiles">{available.map(entry => <li key={entry.id}>
    {entry.href ? <Link href={entry.href} onClick={done}>{entry.label}</Link> : <><strong>{entry.label}</strong><div>{entry.pills?.filter(p => !intent || p.label === (intent === 'buy' ? 'Buy' : 'Rent')).map(p => <Link href={p.href} key={p.href} onClick={done}>{p.label}<span className="sr-only"> {p.context}</span></Link>)}</div></>}
  </li>)}</ul>
}
