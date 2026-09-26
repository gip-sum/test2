'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ComponentType } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import {
  CalculatorIcon, ChevronRightIcon, HeartIcon, HomeIcon, KeyIcon, MailIcon, MapPinIcon, MenuIcon, PlusIcon, UserIcon,
} from '@/components/ui/icons'
import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/cn'
import type { MarketplaceNav, NavSectionId } from '@/lib/navigation/types'
import { sectionState } from './current'

type Row = { href: string; label: string; summary?: string; Icon: ComponentType<{ className?: string }>; current: boolean; supply?: boolean }

const SECTION_ICON: Record<NavSectionId, ComponentType<{ className?: string }>> = {
  buy: HomeIcon, rent: KeyIcon, localities: MapPinIcon, loans: CalculatorIcon,
}

/**
 * Every destination in one place, on phones and tablets (Phase A).
 *
 * Opened from the header's menu button and from "View all" on the quick
 * routes. Each trigger owns its sheet — there is no global menu state to
 * keep in step — and the sheet is the shared Radix-based one, which
 * already traps focus, locks scroll, closes on Escape and hands focus back
 * to whatever opened it.
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

  const find: Row[] = nav.sections.map((s) => ({
    href: s.href, label: s.label, summary: s.summary, Icon: SECTION_ICON[s.id], current: sectionState(s, pathname) !== null,
  }))
  const at = (href: string) => pathname === href
  const owners: Row[] = [
    { href: '/post', label: 'Post a property', summary: 'List a home for sale or rent', Icon: PlusIcon, current: pathname.startsWith('/post'), supply: true },
    { href: '/dashboard/enquiries', label: 'Enquiries on your listings', summary: 'Buyers and tenants who got in touch', Icon: MailIcon, current: at('/dashboard/enquiries') },
  ]
  const yours: Row[] = [
    { href: '/account/saved', label: 'Saved homes', Icon: HeartIcon, current: at('/account/saved') },
    { href: '/account/enquiries', label: 'Your enquiries', Icon: MailIcon, current: at('/account/enquiries') },
    { href: '/account', label: 'Account', Icon: UserIcon, current: at('/account') },
  ]
  const browse = nav.sections.filter((s) => s.id === 'buy' || s.id === 'rent')

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

      <Sheet open={open} onOpenChange={setOpen} title={`Explore ${BRAND.shortName}`} description="Every part of the marketplace, in one list.">
        <nav aria-label="All destinations" className="menu-sheet">
          <Link href="/" onClick={done} aria-current={at('/') ? 'page' : undefined} className="menu-home">
            <HomeIcon className="size-5" /> Home
          </Link>

          <MenuGroup title="Find a home" rows={find} onNavigate={done} />
          <MenuGroup title="Sell or let out" rows={owners} onNavigate={done} />
          <MenuGroup title="Your account" rows={yours} onNavigate={done} />

          <section aria-labelledby="menu-localities" className="menu-group">
            <h3 id="menu-localities" className="menu-group-title">Popular localities</h3>
            <ul className="menu-localities">
              {nav.localities.map((l) => (
                <li key={l.name}>
                  <span className="font-semibold text-ink-900">{l.name}</span>
                  <span className="flex gap-1.5">
                    <Link href={l.buy} onClick={done} className="nav-pill">Buy<span className="sr-only"> in {l.name}</span></Link>
                    <Link href={l.rent} onClick={done} className="nav-pill">Rent<span className="sr-only"> in {l.name}</span></Link>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {browse.map((s) => (
            <section key={s.id} aria-labelledby={`menu-browse-${s.id}`} className="menu-group">
              <h3 id={`menu-browse-${s.id}`} className="menu-group-title">{s.summary}</h3>
              <ul className="menu-chips">
                {s.groups.flatMap((g) => g.links).map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} onClick={done} aria-current={at(link.href) ? 'page' : undefined} className="menu-chip">
                      {link.label}{link.context && <span className="sr-only"> {link.context}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
      </Sheet>
    </>
  )
}

function MenuGroup({ title, rows, onNavigate }: { title: string; rows: Row[]; onNavigate: () => void }) {
  const id = `menu-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`
  return (
    <section aria-labelledby={id} className="menu-group">
      <h3 id={id} className="menu-group-title">{title}</h3>
      <ul className="menu-rows">
        {rows.map(({ href, label, summary, Icon, current, supply }) => (
          <li key={href}>
            <Link href={href} onClick={onNavigate} aria-current={current ? 'page' : undefined} className="menu-row">
              <span className={cn('menu-row-icon', supply && 'menu-row-icon-supply')} aria-hidden="true"><Icon className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="menu-row-label">{label}</span>
                {summary && <span className="menu-row-summary">{summary}</span>}
              </span>
              {current ? <span className="menu-current">You are here</span> : <ChevronRightIcon className="size-4 shrink-0 text-ink-500" />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
