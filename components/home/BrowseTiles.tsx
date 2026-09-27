import Link from 'next/link'
import { PropertyTypeArt } from './PropertyTypeArt'
import { SectionHeading } from './SectionHeading'
import type { BandTile, TypeTile } from '@/lib/home/discovery'
import type { Intent } from '@/lib/property/types'

/**
 * Browse by what matters most: the kind of home, the budget, the size.
 *
 * Each turns a vague intent into a specific search, and together they are
 * the homepage's main internal links into the landing pages. Every tile is
 * a real count and a real link (lib/home/discovery): the figure is what the
 * results page it opens will show, and a type, band or size with nothing
 * listed is left out rather than offered as a dead end (Phase B).
 *
 * Types are illustrated tiles, tinted from the palette so the page is not
 * uniformly green; budget and size are compact white tiles with the count
 * under the label, laid out as grids a thumb can scan. On desktop budget
 * and size sit side by side, so neither leaves a half-empty row.
 */

const NOUN: Record<Intent, string> = { buy: 'for sale', rent: 'to rent' }

export function PropertyTypes({ tiles }: { tiles: TypeTile[] }) {
  if (tiles.length === 0) return null
  return (
    <section aria-labelledby="browse-type" className="home-section">
      <SectionHeading
        id="browse-type"
        eyebrow="Property type"
        title="Start with the kind of home"
        description="Flats, houses, floors of their own and more, for sale and to rent."
      />
      <ul className="type-tiles">
        {tiles.map((t, index) => (
          <li key={t.type} className={`type-tile type-tone-${index % 5}`}>
            <PropertyTypeArt type={t.type} />
            <p className="type-tile-name">{t.label}</p>
            <p className="type-tile-links">
              {(['buy', 'rent'] as const).map((intent) => {
                const link = intent === 'buy' ? t.forSale : t.toRent
                return link ? (
                  <Link key={intent} href={link.href} className="type-count">
                    <span className="tabular font-semibold">{link.count}</span> {NOUN[intent]}<span className="sr-only"> — {t.label.toLowerCase()}</span>
                  </Link>
                ) : null
              })}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CountTiles({ tiles, intent, caption, columns }: { tiles: BandTile[]; intent: Intent; caption: string; columns: 'budget' | 'size' }) {
  if (tiles.length === 0) return null
  return (
    <>
      <p className="browse-caption">{caption}</p>
      <ul className={`count-tiles count-tiles-${columns}`}>
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className="count-tile">
              <span className="count-tile-label tabular">{t.label}</span>
              <span className="count-tile-count">
                <span className="tabular font-semibold text-ink-900">{t.count}</span> {t.count === 1 ? 'home' : 'homes'}
                <span className="sr-only"> {NOUN[intent]}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

export function BudgetAndSize({ budget, size }: { budget: Record<Intent, BandTile[]>; size: Record<Intent, BandTile[]> }) {
  const hasBudget = budget.buy.length + budget.rent.length > 0
  const hasSize = size.buy.length + size.rent.length > 0
  if (!hasBudget && !hasSize) return null
  return (
    <div className="browse-pair">
      {hasBudget && (
        <section aria-labelledby="browse-budget" className="home-section">
          <SectionHeading id="browse-budget" eyebrow="Budget" title="Homes in your price range" />
          <CountTiles tiles={budget.buy} intent="buy" caption="To buy" columns="budget" />
          <CountTiles tiles={budget.rent} intent="rent" caption="To rent, per month" columns="budget" />
        </section>
      )}
      {hasSize && (
        <section aria-labelledby="browse-size" className="home-section">
          <SectionHeading id="browse-size" eyebrow="Size" title="Homes by bedrooms" />
          <CountTiles tiles={size.buy} intent="buy" caption="To buy" columns="size" />
          <CountTiles tiles={size.rent} intent="rent" caption="To rent" columns="size" />
        </section>
      )}
    </div>
  )
}
