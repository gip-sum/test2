import Link from 'next/link'

/**
 * Where the property is.
 *
 * Text only. §5 omits a map from this release and `PHASE-0-PLAN` records
 * the reason (D-06): coordinates are captured at posting so a map can be
 * added without a data migration, but nothing on this page pretends to
 * geographic precision it does not have. Phase 34 adds map search; Phase 35
 * adds distance.
 *
 * Shared by both property pages (UI-16): a real listing shows the street
 * address its seller gave, marked unverified; a demo fixture has none.
 *
 * Landmarks are the seller's own words, not a geocode — they are what a
 * local actually uses to describe a place, and they are more useful than a
 * pin for someone who knows the city.
 */
export function LocationBlock({
  society,
  address,
  locality,
  city,
  landmarks = [],
  moreHref,
  addressNote,
}: {
  society?: string
  /** A real listing's street address, as the seller wrote it. */
  address?: string
  locality: string
  city: string
  /** The seller's own words; a real listing has none yet. */
  landmarks?: string[]
  /** More homes in this locality, where the page can link to them. */
  moreHref?: string
  /** What the address shown is, and is not. */
  addressNote: string
}) {
  const rows = [
    society ? { label: 'Society', value: society } : null,
    address ? { label: 'Address', value: address } : null,
    { label: 'Locality', value: locality },
    { label: 'City', value: city },
  ].filter(Boolean) as Array<{ label: string; value: string }>

  // An address card and the seller's landmarks side by side (UI-16). No
  // map, painted or embedded: a drawing of a pin would claim a precision
  // this page does not have, and a paid map is not in this release.
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex min-w-0 flex-col rounded-lg border border-border-subtle bg-surface-000 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </span>
          <dl className="min-w-0 flex-1">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-border-subtle py-2 first:pt-0 last:border-b-0">
                <dt className="text-body-sm text-ink-500">{row.label}</dt>
                <dd className="min-w-0 text-right text-body font-semibold text-ink-900 [overflow-wrap:anywhere]">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-3 text-caption text-ink-500">{addressNote}</p>
        {moreHref && (
          <Link href={moreHref} className="mt-auto inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md pt-2 text-label text-brand-700 hover:underline">
            See more in {locality}
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        )}
      </div>
      {landmarks.length > 0 && (
        <div className="min-w-0 rounded-lg bg-surface-200 p-4 sm:p-5">
          <h3 className="text-overline uppercase text-ink-500">Nearby, in the seller&rsquo;s words</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {landmarks.map((landmark) => (
              <li key={landmark} className="flex items-start gap-2.5 text-body text-ink-900">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-600" />
                <span className="min-w-0">{landmark}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-caption text-ink-500">
            Landmarks are described by the seller. We have not measured distances to them.
          </p>
        </div>
      )}
    </div>
  )
}
