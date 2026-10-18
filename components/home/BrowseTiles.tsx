import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import { PropertyTypeArt } from './PropertyTypeArt'
import { SectionHeading } from './SectionHeading'
import { BuildingIcon, CraneIcon, HouseIcon, UserIcon, WalletIcon } from '@/components/ui/icons'
import type { BandTile, TypeTile } from '@/lib/home/discovery'
import type { Intent } from '@/lib/property/types'

const NOUN: Record<Intent, string> = { buy: 'for sale', rent: 'to rent' }

/**
 * Property types (UI-14): a drawing per type on its own tint, so five
 * cards read as five things, and under it what each holds for sale and to
 * rent, each its own link. A swipeable row on phones, five across from
 * 768px.
 */
export function PropertyTypes({ tiles }: { tiles: TypeTile[] }) {
  if (tiles.length === 0) return null
  return (
    <section aria-labelledby="browse-type" className="home-band home-band-paper">
      <div className="home-container">
        <SectionHeading
          id="browse-type"
          eyebrow="Property type"
          title="Start with the kind of home"
          description="Flats, houses, floors of their own and more, for sale and to rent."
        />
        <ul className="home-type-rail mt-6 lg:mt-8">
          {tiles.map((t, index) => (
            <li key={t.type}>
              <div className="home-card flex h-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-000 shadow-e1">
                <div className={`home-type-art type-tone-${index % 5} grid place-items-center pb-2 pt-5`}>
                  <PropertyTypeArt type={t.type} />
                </div>
                <div className="flex flex-1 flex-col px-3 pb-2 pt-3">
                  <h3 className="px-1 text-body font-semibold text-ink-900">{t.label}</h3>
                  <p className="mt-auto flex flex-wrap pt-1">
                    {(['buy', 'rent'] as const).map((intent) => {
                      const link = intent === 'buy' ? t.forSale : t.toRent
                      return link ? (
                        <Link key={intent} href={link.href} className="inline-flex min-h-11 items-center gap-1 rounded-md px-1.5 text-body-sm text-ink-700 hover:bg-brand-50 hover:text-brand-700">
                          <span className="tabular font-semibold text-ink-900">{link.count}</span> {NOUN[intent]}<span className="sr-only"> — {t.label.toLowerCase()}</span>
                        </Link>
                      ) : null
                    })}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

type Group = { title: string; Icon: ComponentType<{ className?: string }>; children: ReactNode }

function Panel({ title, Icon, children }: Group) {
  return (
    <div className="min-w-0 rounded-lg border border-border-subtle bg-surface-000 p-5 shadow-e1 lg:p-6">
      <h3 className="flex items-center gap-3 text-body-lg font-semibold text-ink-900">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700" aria-hidden><Icon className="size-5" /></span>
        {title}
      </h3>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  )
}

/** One labelled row of count links: the label and the real number of homes. */
function Pills({ caption, tiles, noun }: { caption: string; tiles: BandTile[]; noun: string }) {
  if (tiles.length === 0) return null
  return (
    <div>
      <p className="text-overline uppercase text-ink-500">{caption}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {tiles.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-subtle bg-surface-000 py-1 pl-4 pr-1.5 text-body-sm text-ink-900 transition-colors hover:border-brand-600 hover:bg-brand-50">
              <span className="tabular font-semibold">{t.label}</span>
              <span className="tabular grid h-8 min-w-8 place-items-center rounded-full bg-surface-200 px-2 text-caption text-ink-700">
                {t.count}<span className="sr-only"> {t.count === 1 ? 'home' : 'homes'} {noun}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Browse your way (UI-14): budget, bedrooms, and who is selling and when
 * you can move in, as three panels of real counts on one band. These used
 * to be five separate sections (three of them bands of near-identical
 * tiles, one repeating the bedroom counts), which made the middle of the
 * page feel endless.
 */
export function BrowseYourWay({ budget, size, sellers, possession }: {
  budget: Record<Intent, BandTile[]>
  size: Record<Intent, BandTile[]>
  sellers: BandTile[]
  possession: BandTile[]
}) {
  const hasBudget = budget.buy.length + budget.rent.length > 0
  const hasSize = size.buy.length + size.rent.length > 0
  const hasMarket = sellers.length + possession.length > 0
  if (!hasBudget && !hasSize && !hasMarket) return null
  return (
    <section aria-labelledby="browse-your-way" className="home-band home-band-mint">
      <div className="home-container">
        <SectionHeading
          id="browse-your-way"
          eyebrow="Browse your way"
          title="By budget, size or seller"
          description="Every figure is the number of homes listed right now."
        />
        <div className="mt-6 grid gap-4 lg:mt-8 lg:grid-cols-3 lg:gap-5">
          {hasBudget && (
            <Panel title="Your budget" Icon={WalletIcon}>
              <Pills caption="To buy" tiles={budget.buy} noun="for sale" />
              <Pills caption="To rent, per month" tiles={budget.rent} noun="to rent" />
            </Panel>
          )}
          {hasSize && (
            <Panel title="Bedrooms" Icon={HouseIcon}>
              <Pills caption="To buy" tiles={size.buy} noun="for sale" />
              <Pills caption="To rent" tiles={size.rent} noun="to rent" />
            </Panel>
          )}
          {hasMarket && (
            <Panel title="Seller and possession" Icon={UserIcon}>
              <Pills caption="Posted by" tiles={sellers} noun="for sale" />
              {possession.length > 0 && (
                <div>
                  <p className="text-overline uppercase text-ink-500">When you can move in</p>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {possession.map((t) => {
                      const Icon = /under construction/i.test(t.label) ? CraneIcon : BuildingIcon
                      return (
                        <li key={t.href}>
                          <Link href={t.href} className="flex min-h-14 items-center gap-3 rounded-md border border-border-subtle px-3 py-2 transition-colors hover:border-brand-600 hover:bg-brand-50">
                            <Icon className="size-5 shrink-0 text-brand-700" />
                            <span className="min-w-0">
                              <span className="block text-body-sm font-semibold text-ink-900">{t.label}</span>
                              <span className="block text-caption text-ink-500"><span className="tabular">{t.count}</span> {t.count === 1 ? 'home' : 'homes'}</span>
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>
    </section>
  )
}
