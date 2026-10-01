import { pricingPairs, type PricingInput } from '@/lib/posting/pricing'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import type { Location } from '@/lib/location/types'
import { detailPairs, type DetailInput } from '@/lib/posting/details'
import { postingUrl } from '@/lib/posting/entry'
import type { CompleteEntry } from '@/lib/posting/flow'
import { LOCATION_KEYS, type LocationInput, type LocationErrors, type LocationKey } from '@/lib/posting/location'
import { ErrorSummary } from './ErrorSummary'

export const locationFieldId = (key: LocationKey) => `location-${key}`
const LABELS: Record<LocationKey, string> = {
  city: 'City', locality: 'Locality', sublocality: 'Sub-locality (optional)',
  society: 'Society or building name (optional)', address: 'Building or street address',
  lat: 'Latitude (optional)', lng: 'Longitude (optional)',
}
const HINTS: Record<LocationKey, string> = {
  city: 'Posting is currently available in the Kolkata metropolitan area.',
  locality: 'Choose the neighbourhood where the property is located.',
  sublocality: 'Choose a place under your selected locality, or leave it blank.',
  society: 'Enter the actual name if applicable. This is a seller-stated name, not a verified society.',
  address: 'Include the building and street. Leave out flat numbers, phone numbers and personal details. Your answers are held in the page link.',
  lat: 'Decimal degrees, for example 22.580000. Leave both coordinates blank if unknown.',
  lng: 'Decimal degrees, for example 88.460000. Enter the property position, not a locality centre.',
}
const inputClass = 'mt-2 block min-h-12 w-full min-w-0 rounded-md border border-border-strong bg-surface-000 px-3 py-3 text-base text-ink-900 aria-[invalid=true]:border-danger-600 aria-[invalid=true]:border-2'

export function LocationForm({ entry, carried, values, errors, places, pricing = {} }: {
  entry: CompleteEntry; carried: DetailInput; values: LocationInput; errors: LocationErrors; places: readonly Location[]; pricing?: PricingInput
}) {
  const field = (key: LocationKey) => {
    const error = errors[key]
    const common = {
      id: locationFieldId(key), name: key, defaultValue: values[key] ?? (key === 'city' ? 'kolkata' : ''),
      'aria-invalid': error ? true as const : undefined,
      'aria-describedby': `${key}-location-hint${error ? ` ${key}-location-error` : ''}`,
      className: inputClass,
    }
    const type = key === 'city' ? 'CITY' : key === 'locality' ? 'LOCALITY' : 'SUB_LOCALITY'
    const options = places.filter((p) => p.type === type)
    const isSelect = key === 'city' || key === 'locality' || key === 'sublocality'
    return <div key={key} className="min-w-0">
      <label htmlFor={common.id} className="block text-label text-ink-900">{LABELS[key]}</label>
      <p id={`${key}-location-hint`} className="mt-1 text-body-sm text-ink-500">{HINTS[key]}</p>
      {isSelect ? <select {...common}>
        <option value="">{key === 'sublocality' ? 'Not specified' : `Choose ${LABELS[key].toLowerCase()}`}</option>
        {values[key] && !options.some((p) => p.slug === values[key]) && <option value={values[key]}>Choose again — invalid answer</option>}
        {options.map((p) => <option key={p.id} value={p.slug}>{p.name}{p.type === 'SUB_LOCALITY' ? ` — ${places.find((parent) => parent.slug === p.parentSlug)?.name ?? p.displayPath}` : ''}</option>)}
      </select> : key === 'address' ? <textarea {...common} rows={3} maxLength={240} autoComplete="off" /> :
        <input {...common} type="text" inputMode={key === 'lat' || key === 'lng' ? 'decimal' : 'text'} maxLength={key === 'society' ? 120 : 24} autoComplete="off" />}
      {error && <p id={`${key}-location-error`} className="mt-2 text-body-sm font-semibold text-danger-600"><span className="sr-only">Error: </span>{error}</p>}
    </div>
  }
  return <>
    <h1 id="post-heading" className="font-display text-heading-1 text-ink-900 sm:text-[40px] sm:leading-tight">Where is the property?</h1>
    <p className="mt-3 text-body-lg text-ink-700">Help buyers find the right neighbourhood. You can check and change every answer before moving on.</p>
    <Link href={postingUrl(entry, { details: carried, location: values, pricing })} className="mt-3 inline-flex min-h-11 items-center text-label text-brand-700 underline underline-offset-4">Check property details</Link>
    <form method="get" action="/post" noValidate className="mt-6 grid gap-6">
      {Object.values(errors).some(Boolean) && <ErrorSummary errors={LOCATION_KEYS.flatMap((key) => errors[key] ? [{ id: locationFieldId(key), message: errors[key]! }] : [])} />}
      <input type="hidden" name="role" value={entry.role} />
      <input type="hidden" name="intent" value={entry.intent} />
      <input type="hidden" name="type" value={entry.type} />
      {detailPairs(carried).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      {pricingPairs(pricing).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      {field('city')}{field('locality')}{field('sublocality')}{field('society')}{field('address')}
      <section className="border-t border-border-subtle pt-6">
        <h2 className="font-display text-heading-3 text-ink-900">Property coordinates</h2>
        <p className="mt-2 text-body-sm text-ink-700">Optional. We check that coordinates are plausible for the Kolkata area; we do not verify the address or its position.</p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">{field('lat')}{field('lng')}</div>
      </section>
      <input type="hidden" name="step" value="location-review" />
      <div className="border-t border-border-subtle pt-6">
        <Button type="submit" variant="supply" size="lg" className="w-full sm:w-auto">Review details and location</Button>
        <p className="mt-3 text-body-sm text-ink-500">Nothing is saved or posted yet. Your answers stay in this page link.</p>
      </div>
    </form>
  </>
}
