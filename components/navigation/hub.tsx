import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import {
  ArrowRightIcon, BuildingIcon, CalculatorIcon, ChevronRightIcon, CraneIcon, DoorIcon, HeartIcon, HomeIcon, HouseIcon, KeyIcon,
  LayersIcon, MailIcon, MapPinIcon, PlusIcon, SignpostIcon, StudioIcon, UserIcon, VillaIcon, WalletIcon,
} from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import type { DiscoveryHub, HubEntry } from '@/lib/navigation/types'

/**
 * The discovery hub's building blocks (Phase C), shared by the phone menu
 * (MarketplaceMenu) and the desktop "Explore all" panel (HeaderNav): one
 * row, one pill, one sell card, laid out twice. Keeping them here is what
 * stops the two drifting into different words or different rules for
 * "you are here".
 *
 * Two kinds of row. A place with one address (a calculator, your saved
 * homes) is a whole-row link. A name that could mean either intent
 * ("Flats", "Salt Lake") is plain text followed by Buy and Rent pills —
 * never a link that silently picks one.
 */

type Icon = ComponentType<{ className?: string }>
type Nav = { pathname: string; onNavigate: () => void }

export const HUB_TITLE = {
  explore: 'Explore property',
  sell: 'Sell or let out',
  types: 'Property types',
  discover: 'Discover',
  localities: 'Popular localities',
  tools: 'Home loan tools',
  account: 'Your account',
} as const

const ICON: Record<string, Icon> = {
  buy: HomeIcon,
  rent: KeyIcon,
  flats: BuildingIcon,
  'independent-houses': HouseIcon,
  'builder-floors': LayersIcon,
  villas: VillaIcon,
  'studio-apartments': StudioIcon,
  localities: MapPinIcon,
  'ready-to-move': DoorIcon,
  'under-construction': CraneIcon,
  'owner-properties': SignpostIcon,
  budget: WalletIcon,
  emi: CalculatorIcon,
  saved: HeartIcon,
  enquiries: MailIcon,
  account: UserIcon,
  post: PlusIcon,
  'seller-enquiries': MailIcon,
}

/**
 * aria-current for an entry: 'page' on its own page; 'true' anywhere
 * inside it, for the entries that are sections (Buy is the section for
 * /buy/kolkata/2-bhk). Only Buy and Rent are sections — /account is not
 * "where you are" on /account/saved, where Saved homes already is.
 */
export function entryCurrent(entry: HubEntry, pathname: string, section = false): 'page' | 'true' | undefined {
  if (!entry.href) return undefined
  if (pathname === entry.href) return 'page'
  return section && pathname.startsWith(`${entry.href}/`) ? 'true' : undefined
}

export function HubHeading({ id, level, children }: { id: string; level: 2 | 3 | 4; children: ReactNode }) {
  const Tag = `h${level}` as const
  return <Tag id={id} className={level === 4 ? 'hub-subtitle' : 'hub-title'}>{children}</Tag>
}

/** A group: a heading and its content, labelled by the heading. */
export function HubGroup({ id, title, level, className, children }: { id: string; title: string; level: 2 | 3 | 4; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn('hub-group', className)}>
      <HubHeading id={id} level={level}>{title}</HubHeading>
      {children}
    </section>
  )
}

export function HubRows({ entries, section = false, icons = true, ...nav }: Nav & { entries: HubEntry[]; section?: boolean; icons?: boolean }) {
  return (
    <ul className="hub-rows">
      {entries.map((entry) => (
        <li key={entry.id}>
          {entry.pills ? <PillRow entry={entry} icons={icons} {...nav} /> : <LinkRow entry={entry} section={section} icons={icons} {...nav} />}
        </li>
      ))}
    </ul>
  )
}

function RowIcon({ id }: { id: string }) {
  const Glyph = ICON[id]
  return Glyph ? <span className="hub-icon" aria-hidden="true"><Glyph className="size-5" /></span> : null
}

function RowText({ entry }: { entry: HubEntry }) {
  return (
    <span className="hub-text">
      <span className="hub-label">{entry.label}</span>
      {entry.hint && <span className="hub-hint">{entry.hint}</span>}
    </span>
  )
}

function LinkRow({ entry, section, icons, pathname, onNavigate }: Nav & { entry: HubEntry; section: boolean; icons: boolean }) {
  const current = entryCurrent(entry, pathname, section)
  return (
    <Link href={entry.href!} onClick={onNavigate} aria-current={current} className="hub-row hub-link">
      {icons && <RowIcon id={entry.id} />}
      <RowText entry={entry} />
      {current ? <span className="hub-here">You are here</span> : <ChevronRightIcon className="hub-chevron size-4" />}
    </Link>
  )
}

function PillRow({ entry, icons, pathname, onNavigate }: Nav & { entry: HubEntry; icons: boolean }) {
  return (
    <div className="hub-row">
      {icons && <RowIcon id={entry.id} />}
      <RowText entry={entry} />
      <span className="hub-pills">
        {entry.pills!.map((pill) => (
          <Link key={pill.href} href={pill.href} onClick={onNavigate} aria-current={pathname === pill.href ? 'page' : undefined} className="hub-pill">
            <span className="hub-pill-face">
              {pill.label}
              {pill.context && <span className="sr-only"> {pill.context}</span>}
            </span>
          </Link>
        ))}
      </span>
    </div>
  )
}

/** Buy and Rent as the two large first choices (phones and tablets). */
export function HubTiles({ entries, pathname, onNavigate }: Nav & { entries: HubEntry[] }) {
  return (
    <ul className="hub-tiles">
      {entries.map((entry) => {
        const current = entryCurrent(entry, pathname, true)
        return (
          <li key={entry.id}>
            <Link href={entry.href!} onClick={onNavigate} aria-current={current} className="hub-tile">
              <RowIcon id={entry.id} />
              <span className="hub-tile-label">{entry.label}</span>
              {entry.hint && <span className="hub-hint">{entry.hint}</span>}
              {current && <span className="hub-here">You are here</span>}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Posting, set apart in the supply accent: the seller's way in must never
 * be mistaken for a buyer's row. A tinted card with a filled icon rather
 * than a second filled button — on phones the bottom bar's centre action
 * is already the one orange button on screen.
 */
export function HubSell({ sell, id, level, className, pathname, onNavigate }: Nav & { sell: DiscoveryHub['sell']; id: string; level: 2 | 3; className?: string }) {
  const post = sell.post
  return (
    <section aria-labelledby={id} className={cn('hub-sell', className)}>
      <HubHeading id={id} level={level}>{HUB_TITLE.sell}</HubHeading>
      <Link href={post.href!} onClick={onNavigate} aria-current={entryCurrent(post, pathname)} className="hub-post">
        <span className="hub-post-icon" aria-hidden="true"><PlusIcon className="size-5" /></span>
        <RowText entry={post} />
        <ArrowRightIcon className="size-5 shrink-0 text-supply-700" />
      </Link>
      <ul className="hub-sell-more">
        {sell.more.map((entry) => (
          <li key={entry.id}>
            <Link href={entry.href!} onClick={onNavigate} aria-current={entryCurrent(entry, pathname)} className="hub-sell-link">
              <MailIcon className="size-4 shrink-0" />
              {entry.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
