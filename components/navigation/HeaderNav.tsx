'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDownIcon, ArrowRightIcon, GridIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import type { DiscoveryHub, MarketplaceNav, NavLink, NavSection } from '@/lib/navigation/types'
import { sectionState } from './current'
import { HUB_TITLE, HubGroup, HubRows, HubSell } from './hub'

/**
 * The header's marketplace navigation (Phase A): tablets and up.
 *
 * Tablets (768–1023px) get the condensed form the design system asks for —
 * Buy, Rent and Localities as plain links, with everything else in the
 * menu. From 1024px each section is the APG "disclosure navigation with
 * top-level links" pattern: the word is still a link to the section's main
 * page (Buy is one click from anywhere, as it was), and a separate button
 * beside it opens a panel of real destinations.
 *
 * Panels open on click, tap or Enter — never on hover, which touch cannot
 * reach and which opens panels nobody asked for as a pointer crosses the
 * header. They close on Escape (focus back to their button), a click
 * outside, focus leaving the navigation, another panel opening, or a
 * navigation: the open panel is remembered together with the path it was
 * opened on, so a new path closes it without an effect.
 *
 * Last in the row, "Explore all" (Phase C) opens the discovery hub — the
 * same groups as the phone menu — as a mega panel the width of the header:
 * three columns and a band for posting and the account, short enough to
 * sit under the header at 1024×768. It is a button only, with no page of
 * its own to link to, and follows the same open and close rules as the
 * section panels, so the header has one behaviour, not two.
 */
export function HeaderNav({ nav }: { nav: MarketplaceNav }) {
  const pathname = usePathname()
  const [opened, setOpened] = useState<{ id: string; path: string } | null>(null)
  const openId = opened && opened.path === pathname ? opened.id : null
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!openId) return
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpened(null)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [openId])

  const close = (focusToggle: boolean) => {
    if (focusToggle && openId) root.current?.querySelector<HTMLButtonElement>(`[aria-controls="nav-panel-${openId}"]`)?.focus()
    setOpened(null)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && openId) {
      event.preventDefault()
      close(true)
    }
  }

  return (
    <nav
      ref={root}
      aria-label="Marketplace"
      className="hidden min-w-0 md:block"
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        if (openId && !root.current?.contains(event.relatedTarget as Node | null)) setOpened(null)
      }}
    >
      <ul className="flex items-center gap-0.5 lg:gap-1">
        {nav.sections.map((section) => {
          const state = sectionState(section, pathname)
          const open = openId === section.id
          return (
            <li key={section.id} className={cn('relative flex items-center', section.id === 'loans' && 'max-lg:hidden')}>
              <Link
                href={section.href}
                aria-current={state === 'page' ? 'page' : state === 'section' ? 'true' : undefined}
                className="nav-top"
                onClick={() => setOpened(null)}
              >
                {section.label}
              </Link>
              <button
                type="button"
                className="nav-toggle"
                aria-expanded={open}
                aria-controls={`nav-panel-${section.id}`}
                aria-label={`More in ${section.label}`}
                onClick={() => setOpened(open ? null : { id: section.id, path: pathname })}
              >
                <ChevronDownIcon className="size-4" />
              </button>
              <div id={`nav-panel-${section.id}`} hidden={!open} className={cn('nav-panel', `nav-panel-${section.id}`)}>
                <Panel section={section} nav={nav} pathname={pathname} onNavigate={() => setOpened(null)} />
              </div>
            </li>
          )
        })}
        {/* Not `relative`, unlike the sections: the panel is positioned
            against the header's content box, so it spans the header. */}
        <li className="flex items-center">
          <button
            type="button"
            className="nav-hub-toggle"
            aria-expanded={openId === 'hub'}
            aria-controls="nav-panel-hub"
            onClick={() => setOpened(openId === 'hub' ? null : { id: 'hub', path: pathname })}
          >
            <GridIcon className="size-4.5" />
            Explore all
            <ChevronDownIcon className="size-4" />
          </button>
          <div id="nav-panel-hub" hidden={openId !== 'hub'} className="nav-panel nav-panel-hub">
            <HubPanel hub={nav.hub} pathname={pathname} onNavigate={() => setOpened(null)} />
          </div>
        </li>
      </ul>
    </nav>
  )
}

/**
 * The hub on desktop. Groups are h2 here: the panel sits in the page's own
 * outline, under its h1, rather than in a titled dialog.
 */
function HubPanel({ hub, pathname, onNavigate }: { hub: DiscoveryHub; pathname: string; onNavigate: () => void }) {
  const at = { pathname, onNavigate }
  return (
    <>
      <div className="hub-panel-grid">
        <div className="hub-col">
          <HubGroup id="hub-d-explore" title={HUB_TITLE.explore} level={2}>
            <HubRows entries={hub.explore} section {...at} />
          </HubGroup>
          <HubGroup id="hub-d-discover" title={HUB_TITLE.discover} level={2}>
            <HubRows entries={hub.discover} {...at} />
          </HubGroup>
        </div>
        <div className="hub-col">
          {hub.types.length > 0 && (
            <HubGroup id="hub-d-types" title={HUB_TITLE.types} level={2}>
              <HubRows entries={hub.types} {...at} />
            </HubGroup>
          )}
          <HubGroup id="hub-d-tools" title={HUB_TITLE.tools} level={2}>
            <HubRows entries={hub.tools} {...at} />
          </HubGroup>
        </div>
        <div className="hub-col">
          <HubGroup id="hub-d-localities" title={HUB_TITLE.localities} level={2}>
            <HubRows entries={hub.localities} icons={false} {...at} />
          </HubGroup>
        </div>
      </div>
      <div className="hub-band">
        <HubSell id="hub-d-sell" level={2} sell={hub.sell} className="hub-sell-inline" {...at} />
        <HubGroup id="hub-d-account" title={HUB_TITLE.account} level={2} className="hub-account-inline">
          <HubRows entries={hub.account} {...at} />
        </HubGroup>
      </div>
    </>
  )
}

function Panel({ section, nav, pathname, onNavigate }: { section: NavSection; nav: MarketplaceNav; pathname: string; onNavigate: () => void }) {
  return (
    <>
      <Link href={section.lead.href} className="nav-panel-lead" onClick={onNavigate} aria-current={pathname === section.lead.href ? 'page' : undefined}>
        {section.lead.label}
        <ArrowRightIcon className="size-4" />
      </Link>
      {section.id === 'localities' ? (
        <ul className="nav-localities">
          {nav.localities.map((l) => (
            <li key={l.name}>
              <span className="nav-locality-name">{l.name}</span>
              <span className="nav-locality-links">
                <Link href={l.buy} onClick={onNavigate} className="nav-pill">Buy<span className="sr-only"> in {l.name}</span></Link>
                <Link href={l.rent} onClick={onNavigate} className="nav-pill">Rent<span className="sr-only"> in {l.name}</span></Link>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="nav-groups">
          {section.groups.map((g) => (
            <div key={g.title}>
              <p className="nav-group-title">{g.title}</p>
              <ul>
                {g.links.map((link) => (
                  <li key={link.href}><PanelLink link={link} pathname={pathname} onNavigate={onNavigate} /></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function PanelLink({ link, pathname, onNavigate }: { link: NavLink; pathname: string; onNavigate: () => void }) {
  return (
    <Link href={link.href} className="nav-panel-link" onClick={onNavigate} aria-current={pathname === link.href ? 'page' : undefined}>
      <span>
        {link.label}
        {link.context && <span className="sr-only"> {link.context}</span>}
      </span>
      {link.hint && <span className="nav-panel-hint">{link.hint}</span>}
    </Link>
  )
}
