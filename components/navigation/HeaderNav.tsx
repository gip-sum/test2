'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDownIcon, ArrowRightIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import type { MarketplaceNav, NavLink, NavSection } from '@/lib/navigation/types'
import { sectionState } from './current'

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
      </ul>
    </nav>
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
