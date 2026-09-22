import Link from 'next/link'
import { buildLandingUrl } from '@/lib/search/query'
import type { PropertyDetail } from '@/lib/property/types'

/**
 * Where the property is.
 *
 * Text only. §5 omits a map from this release and `PHASE-0-PLAN` records
 * the reason (D-06): coordinates are captured at posting so a map can be
 * added without a data migration, but nothing on this page pretends to
 * geographic precision it does not have. Phase 34 adds map search; Phase 35
 * adds distance.
 *
 * Landmarks are the seller's own words, not a geocode — they are what a
 * local actually uses to describe a place, and they are more useful than a
 * pin for someone who knows the city.
 */
export function LocationBlock({
  property,
  societyName,
}: {
  property: PropertyDetail
  societyName?: string
}) {
  const rows = [
    societyName ? { label: 'Society', value: societyName } : null,
    { label: 'Locality', value: property.localityName },
    { label: 'City', value: property.cityName },
  ].filter(Boolean) as Array<{ label: string; value: string }>

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-2 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0 rounded-md border border-border-subtle bg-surface-000 px-3 py-2.5">
            <dt className="text-caption text-ink-500">{row.label}</dt>
            <dd className="mt-0.5 truncate text-body-sm font-semibold text-ink-900">{row.value}</dd>
          </div>
        ))}
      </dl>

      {property.nearbyLandmarks.length > 0 && (
        <div>
          <h3 className="text-overline uppercase text-ink-500">Nearby</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {property.nearbyLandmarks.map((landmark) => (
              <li
                key={landmark}
                className="rounded-full border border-border-subtle bg-surface-000 px-3 py-1.5 text-body-sm text-ink-700"
              >
                {landmark}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-ink-500">
            Landmarks are described by the seller. We have not measured distances to them.
          </p>
        </div>
      )}

      <Link
        href={buildLandingUrl({
          intent: property.intent,
          city: 'kolkata',
          locality: property.localitySlug,
        })}
        className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md text-label text-brand-600 hover:underline"
      >
        See more in {property.localityName}
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </div>
  )
}
