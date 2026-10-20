import type { PricingInput } from '@/lib/posting/pricing'
import type { Location } from '@/lib/location/types'
import type { CompleteEntry } from '@/lib/posting/flow'
import type { DetailInput } from '@/lib/posting/details'
import { postingUrl } from '@/lib/posting/entry'
import type { LocationInput, LocationKey, PropertyLocation } from '@/lib/posting/location'
import { locationFieldId } from './LocationForm'
import { NextStep, ReviewList } from './ReviewParts'

export function LocationReview({ entry, carried, values, location, places, pricing = {}, finalReview = false }: {
  entry: CompleteEntry; carried: DetailInput; values: LocationInput; location: PropertyLocation; places: readonly Location[]; pricing?: PricingInput; finalReview?: boolean
}) {
  const name = (id: string | undefined) => places.find((p) => p.id === id)?.name ?? 'Not stated'
  const edit = (key: LocationKey) => `${postingUrl(entry, { details: carried, location: values, pricing, step: 'location' })}#${locationFieldId(key)}`
  const rows: { key: LocationKey; label: string; value: string }[] = [
    { key: 'city', label: 'City', value: name(location.cityId) },
    { key: 'locality', label: 'Locality', value: name(location.localityId) },
    { key: 'sublocality', label: 'Sub-locality', value: name(location.subLocalityId) },
    { key: 'society', label: 'Society / building (seller-stated)', value: location.societyName ?? 'Not stated' },
    { key: 'address', label: 'Address', value: location.address },
    { key: 'lat', label: 'Coordinates (seller-provided, unverified)', value: location.coordinates ? `${location.coordinates.lat}, ${location.coordinates.lng}` : 'Not stated' },
  ]
  return <>
    <ReviewList className="mt-7" title="Property location" rows={rows.map((row) => ({ key: row.key, label: row.label, value: row.value, edit: edit(row.key), changeLabel: `Change ${row.label}` }))} />
    {!finalReview && <NextStep
      body="Add the sale or rental price next. Nothing is published until you submit it for review."
      primary={{ href: postingUrl(entry, { details: carried, location: values, pricing, step: 'pricing' }), label: 'Continue to pricing' }}
      secondary={{ href: postingUrl(entry, { details: carried, location: values, pricing, step: 'location' }), label: 'Edit property location' }}
    />}
  </>
}
