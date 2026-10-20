import { PriceDisplay } from '@/components/property/PriceDisplay'
import { PropertyImage } from '@/components/property/PropertyImage'
import { SaveButton } from '@/components/property/SaveButton'
import { AreaDisplay } from '@/components/property/AreaDisplay'
import { CARD_FOCUS, CardBadges, CardTitleLink } from '@/components/property/CardParts'
import { AreaIcon, BathIcon, BedIcon, CameraIcon, MapPinIcon } from '@/components/ui/icons'
import { formatPostedAt } from '@/lib/format/date'
import { listingBadges } from '@/lib/property/badges'
import {
  CONSTRUCTION_LABEL,
  FURNISHING_LABEL,
  PROPERTY_TYPE_LABEL,
  SELLER_LABEL,
  type PropertySummary,
  type ResultCardData,
} from '@/lib/property/types'
import { propertyPath } from '@/lib/property/public-id'
import { cn } from '@/lib/cn'

/**
 * The results card (UI-15): the homepage card's family — a framed photo,
 * the price first and largest, the facts as a specification row — carrying
 * what a comparison needs on top: bathrooms, the rate per carpet sqft, the
 * construction, furnishing and floor line, the seller's name and the
 * photo count.
 *
 * One card at every width, rendered once (UI-06): vertical everywhere,
 * one column on a phone and a grid from 768px.
 *
 * The title's ::after makes the whole card one link, so the save heart
 * stays its own control; the card draws that link's focus ring only.
 * It lifts under a pointer (.home-card) and gives under a finger
 * (.result-card), never both.
 *
 * Search and Similar pass a demo summary; Saved (UI-19) passes a real
 * published listing's card data as well, so a shortlisted home is the same
 * card it was in the results. `heading` follows the page's outline: h3
 * under a results heading, h2 directly under Saved's h1.
 */
export function ResultCard({ property, priority, heading = 'h3' }: { property: PropertySummary | ResultCardData; priority?: boolean; heading?: 'h2' | 'h3' }) {
  const { href, saveId } = 'href' in property ? property : { href: propertyPath(property.slug, property.publicId), saveId: property.publicId }
  const Heading = heading
  const {
    title, society, localityName, cityName, intent, price, bedrooms, bathrooms,
    carpetArea, areaUnit, areaBasis, propertyType, furnishing, constructionStatus, floor, totalFloors,
    sellerType, sellerName, postedAt, photos,
  } = property
  const cover = photos[0]
  const name = society ?? title

  const attributes = [
    CONSTRUCTION_LABEL[constructionStatus],
    FURNISHING_LABEL[furnishing],
    floor && totalFloors ? `Floor ${floor} of ${totalFloors}` : null,
  ].filter(Boolean) as string[]

  // A two-column fact grid: bedrooms and bathrooms in fixed columns, so they
  // line up across a row of cards for comparison, and the carpet area (with
  // its basis, which never shortens) across the full second line. Three
  // chips in one row wrapped unevenly from card to card.
  const spec = 'flex min-w-0 items-center gap-1.5'

  return (
    <article className={cn('result-card home-card group relative flex h-full flex-col rounded-lg border border-border-subtle bg-surface-000 shadow-e1', CARD_FOCUS)}>
      {/* A framed photo across the card: 16:10 on a phone, where a taller
          one would push the facts off the screen, 3:2 in the grid. Phones
          had a side-by-side card until the owner's UI-15 review: its text
          column was 180px wide and cut seller names and attributes short. */}
      <div className="home-card-photo relative m-2 mb-0 overflow-hidden rounded-md">
        <PropertyImage
          src={cover?.url}
          alt={cover?.alt ?? title}
          isSample={cover?.isSample}
          priority={priority}
          className="aspect-[16/10] md:aspect-[3/2]"
          sizes="(min-width: 1280px) 330px, (min-width: 768px) 45vw, 100vw"
        />
        <CardBadges badges={listingBadges(property)} />
        {photos.length > 1 && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-sm bg-ink-900/75 px-1.5 py-0.5 text-caption font-semibold text-ink-inverse tabular">
            <CameraIcon className="size-3.5" />{photos.length}<span className="sr-only"> photos</span>
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-4 pb-4 pt-3">
        <PriceDisplay amount={price} intent={intent} size="detail" areaForRate={intent === 'buy' ? carpetArea : undefined} />
        <Heading className="mt-1 line-clamp-2 text-body-lg font-semibold text-ink-900">
          <CardTitleLink href={href}>{name}</CardTitleLink>
        </Heading>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-body-sm text-ink-500">
          <MapPinIcon className="size-4 shrink-0" />
          <span className="truncate">{localityName}, {cityName}</span>
        </p>

        <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-md bg-surface-200 px-3 py-2.5 text-body-sm text-ink-900" aria-label="Key facts">
          {bedrooms ? (
            <li className={spec}><BedIcon className="size-4 text-brand-700" /><span className="font-semibold">{bedrooms} BHK</span></li>
          ) : (
            <li className={spec}><span className="font-semibold">{PROPERTY_TYPE_LABEL[propertyType]}</span></li>
          )}
          {bathrooms ? (
            <li className={spec}><BathIcon className="size-4 text-brand-700" /><span className="font-semibold">{bathrooms}</span> {bathrooms === 1 ? 'Bath' : 'Baths'}</li>
          ) : null}
          <li className={cn(spec, 'col-span-2')}>
            <AreaIcon className="size-4 text-brand-700" />
            <AreaDisplay value={carpetArea} unit={areaUnit} basis={areaBasis} className="whitespace-nowrap" />
          </li>
        </ul>

        {attributes.length > 0 && (
          <p className="mt-2 line-clamp-2 text-body-sm text-ink-700 md:line-clamp-1">{attributes.join(' · ')}</p>
        )}

        {/* Grows, so the footers line up across a row of the grid. */}
        <div className="min-h-2.5 flex-1" />
        <p className="flex min-w-0 items-center gap-2 border-t border-border-subtle pt-2.5 text-caption text-ink-500">
          <span className="min-w-0 truncate">
            <span className="font-semibold text-ink-700">{SELLER_LABEL[sellerType]}</span>
            {sellerName ? <span> · {sellerName}</span> : null}
          </span>
          <span className="ml-auto shrink-0">{formatPostedAt(postedAt)}</span>
        </p>
      </div>

      {/* Last in the DOM: keyboard and screen-reader order is the listing,
          then its save action. SaveButton's size-11 is the 44px target. */}
      <div className="absolute right-4 top-4 z-10">
        <SaveButton id={saveId} title={name} visualClassName="bg-surface-000 shadow-e2" />
      </div>
    </article>
  )
}
