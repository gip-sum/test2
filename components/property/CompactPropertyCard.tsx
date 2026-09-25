import Link from 'next/link'
import { PriceDisplay } from './PriceDisplay'
import { PropertyImage } from './PropertyImage'
import { SaveButton } from './SaveButton'
import { Badge } from '@/components/ui/Badge'
import { formatAreaCompact, formatConfiguration } from '@/lib/format/area'
import { formatPostedAt, isNewListing } from '@/lib/format/date'
import { SELLER_LABEL, type PropertySummary } from '@/lib/property/types'
import { propertyPath } from '@/lib/property/public-id'

/**
 * The browsing card: for rails, where people swipe rather than compare.
 *
 * Priority is the one a phone can afford — photo, then price (on the
 * photo, so it is read in the same glance), then configuration with its
 * area basis, the place, and who posted it when. The save heart sits on
 * the photo where a thumb expects it. Everything else (furnishing, floor,
 * construction) waits for the results page or the listing itself;
 * PropertyCard remains the comparison card there.
 *
 * The whole card is one link, drawn by the title's ::after overlay, so the
 * heart stays a separate control above it rather than a nested one. The
 * card draws the link's focus ring, and only the link's: the heart has its
 * own, and a ring around both at once would not say which is focused.
 */
export function CompactPropertyCard({ property, priority }: { property: PropertySummary; priority?: boolean }) {
  const {
    publicId, slug, title, society, localityName, cityName, intent, price, bedrooms,
    carpetArea, areaUnit, areaBasis, propertyType, sellerType, postedAt, photos, isPriceReduced,
  } = property
  const cover = photos[0]
  // Bedrooms and the area with its basis — the two figures a browser
  // compares. Bathrooms wait for the listing: on a 240px card they would
  // push "(carpet)" off the line, and the basis is the part that matters.
  const configuration = propertyType === 'STUDIO' ? 'Studio' : formatConfiguration(bedrooms, null)
  const area = formatAreaCompact(carpetArea, areaUnit, areaBasis)

  // Two badges maximum, in the same priority order as PropertyCard.
  const badges: Array<{ tone: 'brand' | 'supply'; label: string }> = []
  if (isNewListing(postedAt)) badges.push({ tone: 'brand', label: 'New' })
  if (isPriceReduced) badges.push({ tone: 'supply', label: 'Price reduced' })

  return (
    <article className="compact-card group relative flex h-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-000 shadow-e1 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus-ring">
      <div className="relative">
        <PropertyImage
          src={cover?.url}
          alt={cover?.alt ?? title}
          isSample={cover?.isSample}
          sampleTag="right"
          priority={priority}
          sizes="(min-width: 1024px) 290px, 280px"
        />
        {badges.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {badges.slice(0, 2).map((b) => (
              <Badge key={b.label} tone={b.tone}>{b.label}</Badge>
            ))}
          </div>
        )}
        <div className="absolute bottom-2 left-2 rounded-md bg-surface-000 px-2.5 py-1 shadow-e1">
          <PriceDisplay amount={price} intent={intent} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        <p className="truncate text-body-sm text-ink-700">
          {configuration && <><span className="font-semibold text-ink-900">{configuration}</span> · </>}
          <span className="whitespace-nowrap">{area}</span>
        </p>
        <h3 className="truncate text-body font-semibold text-ink-900">
          <Link href={propertyPath(slug, publicId)} className="outline-none after:absolute after:inset-0">
            {society ?? title}
          </Link>
        </h3>
        <p className="truncate text-body-sm text-ink-500">{localityName}, {cityName}</p>
        <p className="mt-auto pt-1 text-caption text-ink-500">
          <span className="font-semibold text-ink-700">{SELLER_LABEL[sellerType]}</span> · {formatPostedAt(postedAt)}
        </p>
      </div>

      {/* Last in the DOM, drawn on the photo: keyboard and screen-reader
          order is the listing, then its save action. */}
      <div className="absolute right-2 top-2 z-10">
        <SaveButton publicId={publicId} title={society ?? title} className="shadow-e1" />
      </div>
    </article>
  )
}
