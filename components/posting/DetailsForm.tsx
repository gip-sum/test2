import { pricingPairs, type PricingInput } from '@/lib/posting/pricing'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { FormField, FormFieldset, fieldControlClass } from '@/components/ui/FormField'
import { AREA_UNITS, applicableKeys, hasUnitFloor, type DetailErrors, type DetailInput, type DetailKey } from '@/lib/posting/details'
import { locationPairs, type LocationInput } from '@/lib/posting/location'
import { postingUrl } from '@/lib/posting/entry'
import type { CompleteEntry } from '@/lib/posting/flow'
import { FURNISHING_LABEL, FURNISHING_ORDER, PROPERTY_TYPE_LABEL, SELLER_LABEL } from '@/lib/property/types'
import { ErrorSummary } from './ErrorSummary'
import { FormSection, StepActions, StepHeading } from './PostingWorkspace'

/**
 * The Phase 12 property facts form.
 *
 * A native GET form to `/post`, not a server action and not client state:
 * the answers land in the URL like every earlier choice, so the stage works
 * without JavaScript and back, refresh and a shared link all reproduce it.
 * Validation is `lib/posting/details.ts` on the server — nothing here
 * decides whether an answer is acceptable, and there are no `required` or
 * `pattern` attributes to disagree with it. `noValidate` keeps the browser's
 * own bubbles from pre-empting the error summary.
 */

const UNIT_LABEL: Record<(typeof AREA_UNITS)[number], string> = { sqft: 'Sq. ft', sqm: 'Sq. m', sqyd: 'Sq. yd' }
const FURNISHING_NOTE: Record<(typeof FURNISHING_ORDER)[number], string> = { UNFURNISHED: 'No furniture or fittings beyond the basics.', SEMI_FURNISHED: 'Some fittings, such as wardrobes or lights.', FURNISHED: 'Comes with furniture.' }
const COUNTS = Array.from({ length: 10 }, (_, index) => String(index + 1))
export const fieldId = (key: DetailKey) => `field-${key}`

// Labels, hints, errors and their ARIA come from the shared FormField
// (UI-09). Inputs were 15px here — Safari on iPhone zooms the page into a
// field under 16px — and are now the shared 16px, 48px control the location
// and pricing steps already used. Hint and error names (`carpet-error`) are
// unchanged: the error summary and the checks point at them.

/**
 * A small finite answer as real radios (Phase 12), drawn either as compact
 * chips (counts, units) or as option cards with a line of meaning (UI-17:
 * furnishing, construction, availability) — never a select for two to
 * four answers a seller should see at once. Exported for the pricing step.
 */
export function ChipGroup({ name, legend, hint, options, values, errors, variant = 'chip', firstId }: {
  name: string
  legend: string
  hint?: string
  options: { value: string; label: string; description?: string }[]
  values: Record<string, string | undefined>
  errors: Record<string, string | undefined>
  variant?: 'chip' | 'card'
  /** The id the error summary links to; the first option carries it. */
  firstId?: string
}) {
  const error = errors[name]
  return (
    <FormFieldset messageId={name} legend={legend} hint={hint} error={error}>
      <div className={variant === 'card' ? 'mt-3 grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))]' : 'mt-3 flex flex-wrap gap-2'}>
        {options.map((option, index) => (
          // aria-invalid is not valid on a radio; the group's error is read
          // through the fieldset's aria-describedby, and this only styles it.
          <label key={option.value} className={variant === 'card' ? 'post-option' : 'post-chip'} data-invalid={error ? true : undefined}>
            <input
              type="radio"
              name={name}
              value={option.value}
              id={index === 0 ? (firstId ?? fieldId(name as DetailKey)) : undefined}
              defaultChecked={values[name] === option.value}
              className="sr-only"
            />
            <span aria-hidden="true" className="post-chip-tick">✓</span>
            {variant === 'card' ? (
              <span className="min-w-0">
                <span className="block font-semibold">{option.label}</span>
                {option.description && <span className="mt-0.5 block text-body-sm font-normal text-ink-500">{option.description}</span>}
              </span>
            ) : option.label}
          </label>
        ))}
      </div>
    </FormFieldset>
  )
}

function TextField({ name, label, hint, values, errors, optional, type = 'text', min }: {
  name: DetailKey
  label: string
  hint?: string
  values: DetailInput
  errors: DetailErrors
  optional?: boolean
  type?: 'text' | 'date' | 'month'
  min?: string
}) {
  return (
    <FormField id={fieldId(name)} messageId={name} label={label} optional={optional} hint={hint} error={errors[name]}>
      {(control) => <input
        {...control}
        name={name}
        type={type}
        min={min}
        defaultValue={values[name] ?? ''}
        inputMode={type === 'text' ? 'numeric' : undefined}
        autoComplete="off"
        maxLength={type === 'text' ? 12 : undefined}
        className={`${fieldControlClass} tabular`}
      />}
    </FormField>
  )
}

export function DetailsForm({ entry, values, errors, today, location = {}, pricing = {} }: {
  entry: CompleteEntry
  values: DetailInput
  errors: DetailErrors
  today: string
  pricing?: PricingInput
  location?: LocationInput
}) {
  const keys = applicableKeys(entry)
  const unitFloor = hasUnitFloor(entry.type)
  const list = (Object.keys(errors) as DetailKey[]).map((key) => ({ id: fieldId(key), message: errors[key]! }))
  // A fresh form suggests sqft — overwhelmingly what Kolkata quotes in —
  // but an explicit answer, including a wrong one being corrected, wins.
  const shown: DetailInput = Object.keys(values).length === 0 ? { unit: 'sqft' } : values
  const plan = entry.intent === 'buy' ? 'For sale' : 'For rent'

  return <>
    <StepHeading title="Tell us about the property." lede="Answer for the property as it is today. You can change anything on the next screen.">
      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-ink-700">
        <span className="inline-flex min-h-8 items-center rounded-full bg-surface-200 px-3 font-semibold text-ink-900">{SELLER_LABEL[entry.role]} · {plan} · {PROPERTY_TYPE_LABEL[entry.type]}</span>
        <Link href={postingUrl({ role: entry.role, intent: entry.intent }, { details: values, location, pricing })} className="inline-flex min-h-11 items-center text-label text-brand-700 underline underline-offset-4">Change property type</Link>
      </p>
    </StepHeading>

    <form method="get" action="/post" noValidate className="post-form mt-8 grid gap-7">
      {list.length > 0 && <ErrorSummary errors={list} />}
      <input type="hidden" name="role" value={entry.role} />
      <input type="hidden" name="intent" value={entry.intent} />
      <input type="hidden" name="type" value={entry.type} />
      {pricingPairs(pricing).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      {locationPairs(location).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}

      <FormSection first title="Configuration" description={keys.has('bhk') ? 'Bedrooms and bathrooms, as buyers search for them.' : 'A studio has no separate bedroom; give its bathrooms.'}>
        {keys.has('bhk') && <ChipGroup name="bhk" legend="Bedrooms (BHK)" options={COUNTS.map((n) => ({ value: n, label: n }))} values={shown} errors={errors} />}
        <ChipGroup name="baths" legend="Bathrooms" options={COUNTS.map((n) => ({ value: n, label: n }))} values={shown} errors={errors} />
      </FormSection>

      <FormSection title="Area" description="Carpet area is the floor you can use inside the walls. Built-up adds walls and balconies; super built-up adds a share of lifts, stairs and lobbies.">
        <ChipGroup name="unit" legend="Measured in" options={AREA_UNITS.map((unit) => ({ value: unit, label: UNIT_LABEL[unit] }))} values={shown} errors={errors} />
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField name="carpet" label="Carpet area" hint="For example 1,240" values={shown} errors={errors} />
          <TextField name="builtup" label="Built-up area" values={shown} errors={errors} optional />
          <TextField name="super" label="Super built-up area" values={shown} errors={errors} optional />
        </div>
      </FormSection>

      <FormSection title="Furnishing" description="What stays with the property.">
        <ChipGroup name="furnishing" legend="How is it furnished?" variant="card" options={FURNISHING_ORDER.map((f) => ({ value: f, label: FURNISHING_LABEL[f], description: FURNISHING_NOTE[f] }))} values={shown} errors={errors} />
      </FormSection>

      <FormSection title={unitFloor ? 'Building and floor' : 'Floors'} description={unitFloor ? 'Where the home sits in its building.' : 'The house is the whole building.'}>
        <div className="grid gap-5 sm:grid-cols-2">
          {unitFloor && <TextField name="floor" label="Which floor is it on?" hint="Enter 0 for the ground floor." values={shown} errors={errors} />}
          <TextField
            name="floors"
            label={unitFloor ? 'Total floors in the building' : 'Floors in the house'}
            hint={unitFloor ? 'Count every floor, including the ground floor. A ground-plus-four building has 5.' : 'Count the ground floor. A single-storey house has 1.'}
            values={shown}
            errors={errors}
          />
        </div>
      </FormSection>

      <FormSection title={entry.intent === 'buy' ? 'Construction' : 'Availability'} description={entry.intent === 'buy' ? 'Ready homes give their age; homes under construction give the expected possession.' : 'Its age, and when a tenant can move in.'}>
        {entry.intent === 'buy' ? <>
          <ChipGroup name="status" legend="Is it ready to move in?" variant="card" options={[{ value: 'READY', label: 'Ready to move', description: 'Construction is complete.' }, { value: 'UNDER_CONSTRUCTION', label: 'Under construction', description: 'Possession is still to come.' }]} values={shown} errors={errors} />
          <div className="post-if-ready">
            <TextField name="age" label="Age of the property, in years" hint="Years since construction was completed. Approximate is fine; enter 0 if it is under a year old." values={shown} errors={errors} />
          </div>
          <div className="post-if-uc">
            <TextField name="possession" label="Expected possession" type="month" min={today.slice(0, 7)} hint="Year and month, for example 2028-03." values={shown} errors={errors} />
          </div>
        </> : <>
          <TextField name="age" label="Age of the property, in years" hint="Years since construction was completed. Approximate is fine; enter 0 if it is under a year old." values={shown} errors={errors} />
          <ChipGroup name="available" legend="When can a tenant move in?" variant="card" options={[{ value: 'now', label: 'Available now', description: 'Ready for a tenant today.' }, { value: 'date', label: 'From a date', description: 'Give the first day below.' }]} values={shown} errors={errors} />
          <div className="post-if-date">
            <TextField name="from" label="Available from" type="date" min={today} hint="Day, month and year." values={shown} errors={errors} />
          </div>
        </>}
      </FormSection>

      <StepActions>
        <Button type="submit" variant="supply" size="lg" className="w-full sm:w-auto">Continue to review</Button>
      </StepActions>
    </form>
  </>
}
