import { PriceDisplay } from '@/components/property/PriceDisplay'
import { PropertyImage } from '@/components/property/PropertyImage'
import { SaveButton } from '@/components/property/SaveButton'
import { AreaDisplay } from '@/components/property/AreaDisplay'
import { CARD_FOCUS, CardBadges, CardTitleLink } from '@/components/property/CardParts'
import { AreaIcon, BedIcon, MapPinIcon } from '@/components/ui/icons'
import { formatConfiguration } from '@/lib/format/area'
import { formatPostedAt } from '@/lib/format/date'
import { listingBadges } from '@/lib/property/badges'
import { cn } from '@/lib/cn'
import { PROPERTY_TYPE_LABEL, SELLER_LABEL, type PropertySummary } from '@/lib/property/types'
import { propertyPath } from '@/lib/property/public-id'

/**
 * The homepage's listing card (UI-14).
 *
 * A framed photo, then the facts in the order a buyer reads them: the
 * price, large; the name; the place; then the two figures a browser
 * compares — bedrooms and carpet area with its basis — as a specification
 * row; and who posted it, when. As dense as the card it replaces (nothing
 * was dropped), but each fact now has its own line and weight instead of
 * sharing one grey run of text.
 *
 * The whole card is one link (the title's ::after), so the save heart
 * stays its own control; the card draws the link's focus ring only.
 * It lifts under a pointer (.home-card), never after a tap.
 */
export function HomePropertyCard({ property, priority }: { property: PropertySummary; priority?: boolean }) {
  const {
    publicId, slug, title, society, localityName, cityName, intent, price, bedrooms,
    carpetArea, areaUnit, areaBasis, propertyType, sellerType, postedAt, photos,
  } = property
  const cover = photos[0]
  const name = society ?? title
  const configuration = propertyType === 'STUDIO' ? 'Studio' : formatConfiguration(bedrooms, null)

  return (
    <article className={cn('home-card group relative flex h-full flex-col rounded-lg border border-border-subtle bg-surface-000 shadow-e1', CARD_FOCUS)}>
      <div className="home-card-photo relative m-2 mb-0 overflow-hidden rounded-md">
        <PropertyImage
          src={cover?.url}
          alt={cover?.alt ?? title}
          isSample={cover?.isSample}
          sampleTag="right"
          priority={priority}
          sizes="(min-width: 1024px) 340px, 300px"
        />
        <CardBadges badges={listingBadges(property, { construction: true })} />
      </div>

      {/* One reading order, five steps, each its own weight: the price,
          largest; the name; the place; the figures; then who and when,
          quietest (UI-14 polish). */}
      <div className="flex min-w-0 flex-1 flex-col px-4 pb-4 pt-3 lg:px-5 lg:pb-5">
        <PriceDisplay amount={price} intent={intent} size="detail" />
        <h3 className="mt-1 truncate text-body-lg font-semibold text-ink-900">
          <CardTitleLink href={propertyPath(slug, publicId)}>{name}</CardTitleLink>
        </h3>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-body-sm text-ink-500 lg:text-body">
          <MapPinIcon className="size-4 shrink-0 text-ink-500" />
          <span className="truncate">{localityName}, {cityName}</span>
        </p>

        <ul className="mt-3 flex flex-wrap gap-2 text-body-sm text-ink-900" aria-label="Key facts">
          <li className="inline-flex items-center gap-1.5 rounded-sm bg-surface-200 px-2.5 py-1">
            <BedIcon className="size-4 text-brand-700" />
            <span className="font-semibold">{configuration ?? PROPERTY_TYPE_LABEL[propertyType]}</span>
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-sm bg-surface-200 px-2.5 py-1">
            <AreaIcon className="size-4 text-brand-700" />
            <AreaDisplay value={carpetArea} unit={areaUnit} basis={areaBasis} className="whitespace-nowrap" />
          </li>
        </ul>

        {/* Grows, so the footer lines up across a row of cards. */}
        <div className="min-h-3 flex-1" />
        <p className="flex items-center justify-between gap-2 border-t border-border-subtle pt-3 text-caption text-ink-500">
          <span>{SELLER_LABEL[sellerType]}</span>
          <span>{formatPostedAt(postedAt)}</span>
        </p>
      </div>

      {/* Last in the DOM, drawn on the photo: keyboard and screen-reader
          order is the listing, then its save action. */}
      <div className="absolute right-4 top-4 z-10">
        <SaveButton id={publicId} title={name} visualClassName="shadow-e2" />
      </div>
    </article>
  )
}
