import Link from 'next/link'
import { PriceDisplay } from './PriceDisplay'
import { PropertyImage } from './PropertyImage'
import { SaveButton } from './SaveButton'
import { Badge } from '@/components/ui/Badge'
import { formatAreaCompact } from '@/lib/format/area'
import { formatConfiguration } from '@/lib/format/area'
import { formatPostedAt, isNewListing } from '@/lib/format/date'
import {
  CONSTRUCTION_LABEL,
  FURNISHING_LABEL,
  SELLER_LABEL,
  type PropertySummary,
} from '@/lib/property/types'
import { propertyPath } from '@/lib/property/public-id'
import { cn } from '@/lib/cn'

/**
 * The unit of comparison.
 *
 * Answers one question — "is this worth opening?" — with the fewest
 * elements that can answer it. Content priority is fixed: price, then
 * configuration with its area basis, then title, then location, then a
 * short attribute line, then who is selling and how fresh it is.
 *
 * `layout="horizontal"` is the phone form: a vertical card shows about
 * 1.5 results per screen, a horizontal one shows three or four while
 * keeping the photo meaningful.
 *
 * At most two badges. Overflow is dropped, not stacked. There is no
 * "Verified" badge because the platform verifies nothing in V0.
 */
export function PropertyCard({
  property,
  layout = 'vertical',
  priority,
}: {
  property: PropertySummary
  layout?: 'vertical' | 'horizontal'
  priority?: boolean
}) {
  const {
    publicId,
    slug,
    title,
    society,
    localityName,
    cityName,
    intent,
    price,
    bedrooms,
    bathrooms,
    carpetArea,
    areaUnit,
    areaBasis,
    furnishing,
    constructionStatus,
    floor,
    totalFloors,
    sellerType,
    sellerName,
    postedAt,
    photos,
    isPriceReduced,
  } = property

  // Canonical grammar lives in one place, so a card can never emit a
  // link the route would have to redirect.
  const href = propertyPath(slug, publicId)
  const cover = photos[0]
  const horizontal = layout === 'horizontal'

  const attributes = [
    CONSTRUCTION_LABEL[constructionStatus],
    FURNISHING_LABEL[furnishing],
    floor && totalFloors ? `Floor ${floor} of ${totalFloors}` : null,
  ].filter(Boolean) as string[]

  // Two badges maximum, in priority order.
  const badges: Array<{ tone: 'brand' | 'supply'; label: string }> = []
  if (isNewListing(postedAt)) badges.push({ tone: 'brand', label: 'New' })
  if (isPriceReduced && badges.length < 2) badges.push({ tone: 'supply', label: 'Price reduced' })

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-lg border border-border-subtle bg-surface-000 shadow-e1',
        'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring',
        horizontal ? 'flex' : 'flex flex-col',
      )}
    >
      <div
        className={cn(
          'relative shrink-0',
          // Horizontal: a fixed-width column whose height comes from the
          // text beside it, so the photo can never squeeze the content.
          horizontal ? 'w-[38%] max-w-[190px] self-stretch' : 'w-full',
        )}
      >
        <PropertyImage
          src={cover?.url}
          alt={cover?.alt ?? title}
          isSample={cover?.isSample}
          priority={priority}
          mode={horizontal ? 'fill' : 'ratio'}
          sizes={horizontal ? '190px' : '(min-width: 1280px) 400px, (min-width: 768px) 45vw, 100vw'}
        />
        {badges.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {badges.map((b) => (
              <Badge key={b.label} tone={b.tone}>
                {b.label}
              </Badge>
            ))}
          </div>
        )}
        {!horizontal && <SaveButton title={title} className="absolute right-2 top-2 shadow-e1" />}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <PriceDisplay amount={price} intent={intent} areaForRate={intent === 'buy' ? carpetArea : undefined} />
          {horizontal && <SaveButton title={title} className="-mr-1 -mt-1 size-9 shrink-0 border-0 bg-transparent" />}
        </div>

        <p className="text-body-sm text-ink-700">
          {formatConfiguration(bedrooms, bathrooms)} ·{' '}
          <span className="whitespace-nowrap">
            {formatAreaCompact(carpetArea, areaUnit, areaBasis)}
          </span>
        </p>

        {/* Title clamps at two lines — long titles are the norm, not the exception. */}
        <h3 className="line-clamp-2 text-body font-semibold text-ink-900">
          <Link href={href} className="outline-none after:absolute after:inset-0">
            {society ?? title}
          </Link>
        </h3>

        <p className="truncate text-body-sm text-ink-500">
          {localityName}, {cityName}
        </p>

        {attributes.length > 0 && (
          <p className="truncate text-body-sm text-ink-500">{attributes.join(' · ')}</p>
        )}

        <p className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 text-caption text-ink-500">
          <span className="font-semibold text-ink-700">
            {SELLER_LABEL[sellerType]}
            {sellerName ? ` · ${sellerName}` : ''}
          </span>
          <span aria-hidden>·</span>
          <span>{formatPostedAt(postedAt)}</span>
        </p>
      </div>
    </article>
  )
}
