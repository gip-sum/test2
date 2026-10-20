import { pricingPairs, type PricingInput } from '@/lib/posting/pricing'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { FormField, fieldControlClass } from '@/components/ui/FormField'
import type { Location } from '@/lib/location/types'
import { detailPairs, type DetailInput } from '@/lib/posting/details'
import { postingUrl } from '@/lib/posting/entry'
import type { CompleteEntry } from '@/lib/posting/flow'
import { LOCATION_KEYS, type LocationInput, type LocationErrors, type LocationKey } from '@/lib/posting/location'
import { ErrorSummary } from './ErrorSummary'
import { FormSection, StepActions, StepHeading } from './PostingWorkspace'

export const locationFieldId = (key: LocationKey) => `location-${key}`
const LABELS: Record<LocationKey, string> = {
  city: 'City', locality: 'Locality', sublocality: 'Sub-locality',
  society: 'Society or building name', address: 'Building or street address',
  lat: 'Latitude', lng: 'Longitude',
}
const OPTIONAL = new Set<LocationKey>(['sublocality', 'society', 'lat', 'lng'])
const HINTS: Record<LocationKey, string> = {
  city: 'Posting is currently available in the Kolkata metropolitan area.',
  locality: 'Choose the neighbourhood where the property is located.',
  sublocality: 'Choose a place under your selected locality, or leave it blank.',
  society: 'Enter the actual name if applicable. This is a seller-stated name, not a verified society.',
  address: 'The building and street.',
  lat: 'Decimal degrees, for example 22.580000. Leave both coordinates blank if unknown.',
  lng: 'Decimal degrees, for example 88.460000. Enter the property position, not a locality centre.',
}

export function LocationForm({ entry, carried, values, errors, places, pricing = {} }: {
  entry: CompleteEntry; carried: DetailInput; values: LocationInput; errors: LocationErrors; places: readonly Location[]; pricing?: PricingInput
}) {
  // Label, hint, error and their ARIA come from the shared FormField (UI-09).
  const field = (key: LocationKey) => {
    const type = key === 'city' ? 'CITY' : key === 'locality' ? 'LOCALITY' : 'SUB_LOCALITY'
    const options = places.filter((p) => p.type === type)
    const isSelect = key === 'city' || key === 'locality' || key === 'sublocality'
    const value = { name: key, defaultValue: values[key] ?? (key === 'city' ? 'kolkata' : ''), className: fieldControlClass }
    return <FormField key={key} id={locationFieldId(key)} messageId={`${key}-location`} label={LABELS[key]} optional={OPTIONAL.has(key)} hint={HINTS[key]} error={errors[key]}>
      {(control) => isSelect ? <select {...control} {...value}>
        <option value="">{key === 'sublocality' ? 'Not specified' : `Choose ${LABELS[key].toLowerCase()}`}</option>
        {values[key] && !options.some((p) => p.slug === values[key]) && <option value={values[key]}>Choose again — invalid answer</option>}
        {options.map((p) => <option key={p.id} value={p.slug}>{p.name}{p.type === 'SUB_LOCALITY' ? ` — ${places.find((parent) => parent.slug === p.parentSlug)?.name ?? p.displayPath}` : ''}</option>)}
      </select> : key === 'address' ? <textarea {...control} {...value} rows={3} maxLength={240} autoComplete="off" /> :
        <input {...control} {...value} type="text" inputMode={key === 'lat' || key === 'lng' ? 'decimal' : 'text'} maxLength={key === 'society' ? 120 : 24} autoComplete="off" />}
    </FormField>
  }
  const coordinateError = Boolean(errors.lat || errors.lng)
  return <>
    <StepHeading title="Where is the property?" lede="Help buyers find the right neighbourhood. You can check and change every answer before moving on.">
      <Link href={postingUrl(entry, { details: carried, location: values, pricing })} className="mt-3 inline-flex min-h-11 items-center text-label text-brand-700 underline underline-offset-4">Check property details</Link>
    </StepHeading>
    <form method="get" action="/post" noValidate className="mt-8 grid gap-7">
      {Object.values(errors).some(Boolean) && <ErrorSummary errors={LOCATION_KEYS.flatMap((key) => errors[key] ? [{ id: locationFieldId(key), message: errors[key]! }] : [])} />}
      <input type="hidden" name="role" value={entry.role} />
      <input type="hidden" name="intent" value={entry.intent} />
      <input type="hidden" name="type" value={entry.type} />
      {detailPairs(carried).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      {pricingPairs(pricing).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      <FormSection first title="Neighbourhood" description="Where buyers will search for it. Shown on the listing.">
        {field('city')}
        <div className="grid gap-5 sm:grid-cols-2">{field('locality')}{field('sublocality')}</div>
      </FormSection>
      <FormSection title="Building" description="The society name is shown as you write it. The street address is seller-provided and is not verified.">
        {field('society')}
        {field('address')}
        <p className="flex gap-2.5 rounded-md bg-surface-200 px-3 py-2.5 text-body-sm text-ink-700">
          <svg viewBox="0 0 24 24" className="mt-0.5 size-4.5 shrink-0 text-brand-700" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" /></svg>
          Leave out the flat number, phone numbers and anyone&rsquo;s name. Buyers contact you through the enquiry form.
        </p>
      </FormSection>
      {/* Optional and rarely known: folded away until wanted, and open when
          an answer in it needs attention, so the error summary's link lands
          on a visible field. A native <details> opens without JavaScript. */}
      <details className="post-coords group border-t border-border-subtle pt-7" open={coordinateError || Boolean(values.lat || values.lng)}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block font-display text-body-lg font-semibold text-ink-900">Map position <span className="font-sans text-body-sm font-normal text-ink-500">(optional)</span></span>
            <span className="block text-body-sm text-ink-500">Latitude and longitude, if you know them. We check they fall in the Kolkata area; we do not verify the position.</span>
          </span>
          <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-brand-700 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
        </summary>
        <div className="mt-5 grid max-w-[40rem] gap-5 sm:grid-cols-2 md:ml-[calc(13rem+2rem)] xl:ml-[calc(15rem+2rem)]">{field('lat')}{field('lng')}</div>
      </details>
      <input type="hidden" name="step" value="location-review" />
      <StepActions>
        <Button type="submit" variant="supply" size="lg" className="w-full sm:w-auto">Review details and location</Button>
      </StepActions>
    </form>
  </>
}
