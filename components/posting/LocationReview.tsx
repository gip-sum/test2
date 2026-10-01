import Link from 'next/link'
import type { Location } from '@/lib/location/types'
import type { CompleteEntry } from '@/lib/posting/flow'
import type { DetailInput } from '@/lib/posting/details'
import { postingUrl } from '@/lib/posting/entry'
import type { LocationInput, LocationKey, PropertyLocation } from '@/lib/posting/location'
import { locationFieldId } from './LocationForm'

export function LocationReview({ entry, carried, values, location, places }: {
  entry: CompleteEntry; carried: DetailInput; values: LocationInput; location: PropertyLocation; places: readonly Location[]
}) {
  const name = (id: string | undefined) => places.find((p) => p.id === id)?.name ?? 'Not stated'
  const edit = (key: LocationKey) => `${postingUrl(entry, { details: carried, location: values, step: 'location' })}#${locationFieldId(key)}`
  const rows: { key: LocationKey; label: string; value: string }[] = [
    { key: 'city', label: 'City', value: name(location.cityId) },
    { key: 'locality', label: 'Locality', value: name(location.localityId) },
    { key: 'sublocality', label: 'Sub-locality', value: name(location.subLocalityId) },
    { key: 'society', label: 'Society / building (seller-stated)', value: location.societyName ?? 'Not stated' },
    { key: 'address', label: 'Address', value: location.address },
    { key: 'lat', label: 'Coordinates (seller-provided, unverified)', value: location.coordinates ? `${location.coordinates.lat}, ${location.coordinates.lng}` : 'Not stated' },
  ]
  return <>
    <h2 className="mt-8 font-display text-heading-3 text-ink-900">Property location</h2>
    <dl aria-label="Property location" className="mt-3 divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface-000 px-5 sm:px-7">
      {rows.map((row) => <div key={row.key} className="flex min-h-20 items-center justify-between gap-3 py-4">
        <div className="min-w-0"><dt className="text-caption text-ink-500">{row.label}</dt><dd className="mt-1 break-words text-body-lg font-semibold text-ink-900 [overflow-wrap:anywhere]">{row.value}</dd></div>
        <Link href={edit(row.key)} aria-label={`Change ${row.label}`} className="inline-flex min-h-11 shrink-0 items-center px-3 text-label text-brand-700 underline underline-offset-4">Change</Link>
      </div>)}
    </dl>
    <div className="mt-6 rounded-lg border border-brand-600/20 bg-brand-100/65 p-5 sm:p-6">
      <h2 className="font-display text-heading-3 text-ink-900">What happens next?</h2>
      <p className="mt-2 text-body text-ink-700">Pricing is the next stage to be built. Your answers are in this page link only: they have not been saved to an account and no property has been posted.</p>
      <Link href={postingUrl(entry, { details: carried, location: values, step: 'location' })} className="mt-4 inline-flex min-h-11 items-center text-label text-brand-700 underline underline-offset-4">Edit property location</Link>
    </div>
  </>
}
