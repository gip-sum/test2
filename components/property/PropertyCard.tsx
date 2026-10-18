import { PriceDisplay } from './PriceDisplay'
import { PropertyImage } from './PropertyImage'
import { SaveButton } from './SaveButton'
import { AreaDisplay } from './AreaDisplay'
import { CARD_FOCUS, CardBadges, CardTitleLink } from './CardParts'
import { MapPinIcon } from '@/components/ui/icons'
import { formatConfiguration } from '@/lib/format/area'
import { formatPostedAt } from '@/lib/format/date'
import { listingBadges } from '@/lib/property/badges'
import {
  CONSTRUCTION_LABEL,
  FURNISHING_LABEL,
  SELLER_LABEL,
  type PropertySummary,
} from '@/lib/property/types'
import { propertyPath } from '@/lib/property/public-id'
import { cn } from '@/lib/cn'

// The two layouts, as class sets rather than branches through the markup.
// The photo's 1.55:1 ratio used to be a global `.property-card .aspect-[4/3]`
// override in globals.css; it is the card's own decision, so it lives here.
const LAYOUT = {
  vertical: {
    article: 'flex flex-col',
    media: 'relative w-full shrink-0',
    image: { mode: 'ratio', className: 'aspect-[1.55]', sizes: '(min-width: 1280px) 400px, (min-width: 768px) 45vw, 100vw' },
    body: 'p-5',
    price: '',
    save: 'right-3 top-3',
    saveLook: 'shadow-e1',
  },
  // Horizontal below 768px — three or four results per phone screen with the
  // photo still large enough to judge — and the vertical card from 768px.
  // The heart sits in the card's top-right corner in both: beside the price
  // on a phone, on the photo in the grid.
  responsive: {
    article: 'flex md:flex-col',
    media: 'relative w-[38%] max-w-[190px] shrink-0 self-stretch md:w-full md:max-w-none md:self-auto',
    image: { mode: 'responsive', className: 'md:aspect-[1.55]', sizes: '(min-width: 1280px) 400px, (min-width: 768px) 45vw, 190px' },
    body: 'p-3 md:p-5',
    price: 'pr-10 md:pr-0',
    save: 'right-2 top-2 md:right-3 md:top-3',
    saveLook: 'border-0 bg-transparent md:border md:bg-surface-000/95 md:shadow-e1',
  },
} as const

/**
 * The unit of comparison.
 *
 * Answers one question — "is this worth opening?" — with the fewest
 * elements that can answer it. Content priority is fixed: price, then
 * configuration with its area basis, then title, then location, then a
 * short attribute line, then who is selling and how fresh it is.
 *
 * `layout="responsive"` is the results card: horizontal on a phone, where a
 * vertical card shows about 1.5 results per screen and a horizontal one
 * three or four, and vertical in the grid from 768px. One card, so the
 * results list renders each listing once (UI-06).
 *
 * Badges, the stretched title link and the focus ring are shared with
 * CompactPropertyCard (CardParts, lib/property/badges).
 */
export function PropertyCard({
  property,
  layout = 'vertical',
  priority,
}: {
  property: PropertySummary
  layout?: keyof typeof LAYOUT
  priority?: boolean
}) {
  const {
    publicId, slug, title, society, localityName, cityName, intent, price, bedrooms, bathrooms,
    carpetArea, areaUnit, areaBasis, furnishing, constructionStatus, floor, totalFloors,
    sellerType, sellerName, postedAt, photos,
  } = property
  const l = LAYOUT[layout]
  const cover = photos[0]

  const attributes = [
    CONSTRUCTION_LABEL[constructionStatus],
    FURNISHING_LABEL[furnishing],
    floor && totalFloors ? `Floor ${floor} of ${totalFloors}` : null,
  ].filter(Boolean) as string[]

  return (
    <article className={cn('property-card glass-card group relative h-full overflow-hidden rounded-lg border border-border-subtle shadow-e1', CARD_FOCUS, l.article)}>
      <div className={l.media}>
        <PropertyImage
          src={cover?.url}
          alt={cover?.alt ?? title}
          isSample={cover?.isSample}
          priority={priority}
          mode={l.image.mode}
          className={l.image.className}
          sizes={l.image.sizes}
        />
        <CardBadges badges={listingBadges(property)} />
      </div>

      <div className={cn('flex min-w-0 flex-1 flex-col gap-1.5', l.body)}>
        <div className={l.price}>
          <PriceDisplay amount={price} intent={intent} areaForRate={intent === 'buy' ? carpetArea : undefined} />
        </div>

        <p className="text-body-sm text-ink-700">
          {formatConfiguration(bedrooms, bathrooms)} ·{' '}
          <AreaDisplay value={carpetArea} unit={areaUnit} basis={areaBasis} className="whitespace-nowrap" />
        </p>

        {/* Title clamps at two lines — long titles are the norm, not the
            exception. Underlined on hover where hovering exists. */}
        <h3 className="line-clamp-2 text-body font-semibold text-ink-900 underline-offset-2 group-hover:underline">
          <CardTitleLink href={propertyPath(slug, publicId)}>{society ?? title}</CardTitleLink>
        </h3>

        <p className="flex min-w-0 items-center gap-1 text-body-sm text-ink-500">
          <MapPinIcon className="size-3.5 shrink-0" />
          <span className="truncate">{localityName}, {cityName}</span>
        </p>

        {attributes.length > 0 && (
          <p className="truncate text-body-sm text-ink-500">{attributes.join(' · ')}</p>
        )}

        <p className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border-subtle pt-3 text-caption text-ink-500">
          <span className="font-semibold text-ink-700">
            {SELLER_LABEL[sellerType]}
            {sellerName ? ` · ${sellerName}` : ''}
          </span>
          <span aria-hidden>·</span>
          <span>{formatPostedAt(postedAt)}</span>
        </p>
      </div>

      {/* Last in the DOM, drawn in the corner: keyboard and screen-reader
          order is the listing, then its save action. SaveButton's own
          size-11 is the 44px target; nothing here may shrink it. */}
      <SaveButton id={publicId} title={society ?? title} className={cn('absolute', l.save)} visualClassName={l.saveLook} />
    </article>
  )
}
