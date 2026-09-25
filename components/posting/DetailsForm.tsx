import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { AREA_UNITS, applicableKeys, hasUnitFloor, type DetailErrors, type DetailInput, type DetailKey } from '@/lib/posting/details'
import { postingUrl } from '@/lib/posting/entry'
import type { CompleteEntry } from '@/lib/posting/flow'
import { FURNISHING_LABEL, FURNISHING_ORDER, PROPERTY_TYPE_LABEL, SELLER_LABEL } from '@/lib/property/types'
import { ErrorSummary } from './ErrorSummary'

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
const COUNTS = Array.from({ length: 10 }, (_, index) => String(index + 1))
export const fieldId = (key: DetailKey) => `field-${key}`

const inputClass =
  'mt-2 block min-h-11 w-full min-w-0 rounded-md border bg-surface-000 px-3 text-body text-ink-900 tabular aria-[invalid=true]:border-danger-600 aria-[invalid=true]:border-2 border-border-strong'

function Describe({ name, hint, error }: { name: DetailKey; hint?: string; error?: string }) {
  return <>
    {hint && <span id={`${name}-hint`} className="mt-1 block text-caption font-normal text-ink-500">{hint}</span>}
    {error && <span id={`${name}-error`} className="mt-1.5 block text-body-sm font-semibold text-danger-600"><span className="sr-only">Error: </span>{error}</span>}
  </>
}

function describedBy(name: DetailKey, hint?: string, error?: string) {
  return [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(' ') || undefined
}

function ChipGroup({ name, legend, hint, options, values, errors }: {
  name: DetailKey
  legend: string
  hint?: string
  options: { value: string; label: string }[]
  values: DetailInput
  errors: DetailErrors
}) {
  const error = errors[name]
  return (
    <fieldset aria-describedby={describedBy(name, hint, error)} className="min-w-0">
      <legend className="text-label text-ink-900">{legend}</legend>
      <Describe name={name} hint={hint} error={error} />
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option, index) => (
          // aria-invalid is not valid on a radio; the group's error is read
          // through the fieldset's aria-describedby, and this only styles it.
          <label key={option.value} className="post-chip" data-invalid={error ? true : undefined}>
            <input
              type="radio"
              name={name}
              value={option.value}
              id={index === 0 ? fieldId(name) : undefined}
              defaultChecked={values[name] === option.value}
              className="sr-only"
            />
            <span aria-hidden="true" className="post-chip-tick">✓</span>
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
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
  const error = errors[name]
  return (
    <div className="min-w-0">
      <label htmlFor={fieldId(name)} className="block text-label text-ink-900">
        {label}{optional && <span className="font-normal text-ink-500"> (optional)</span>}
      </label>
      <Describe name={name} hint={hint} error={error} />
      <input
        id={fieldId(name)}
        name={name}
        type={type}
        min={min}
        defaultValue={values[name] ?? ''}
        inputMode={type === 'text' ? 'numeric' : undefined}
        autoComplete="off"
        maxLength={type === 'text' ? 12 : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        className={inputClass}
      />
    </div>
  )
}

function Group({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`border-t border-border-subtle pt-6 ${className}`}>
      <h2 className="font-display text-heading-3 text-ink-900">{title}</h2>
      <div className="mt-4 grid gap-6">{children}</div>
    </section>
  )
}

export function DetailsForm({ entry, values, errors, today }: {
  entry: CompleteEntry
  values: DetailInput
  errors: DetailErrors
  today: string
}) {
  const keys = applicableKeys(entry)
  const unitFloor = hasUnitFloor(entry.type)
  const list = (Object.keys(errors) as DetailKey[]).map((key) => ({ id: fieldId(key), message: errors[key]! }))
  // A fresh form suggests sqft — overwhelmingly what Kolkata quotes in —
  // but an explicit answer, including a wrong one being corrected, wins.
  const shown: DetailInput = Object.keys(values).length === 0 ? { unit: 'sqft' } : values
  const plan = entry.intent === 'buy' ? 'For sale' : 'For rent'

  return <>
    <h1 id="post-heading" className="font-display text-heading-1 text-ink-900 sm:text-[40px] sm:leading-tight">Tell us about the property.</h1>
    <p className="mt-3 max-w-xl text-body-lg text-ink-700">Answer for the property as it is today. You can change anything on the next screen.</p>
    <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-ink-700">
      <span className="font-semibold text-ink-900">{SELLER_LABEL[entry.role]} · {plan} · {PROPERTY_TYPE_LABEL[entry.type]}</span>
      <Link href={postingUrl({ role: entry.role, intent: entry.intent }, { details: values })} className="inline-flex min-h-11 items-center text-label text-brand-700 underline underline-offset-4">Change property type</Link>
    </p>

    <form method="get" action="/post" noValidate className="post-form mt-7 grid gap-8">
      {list.length > 0 && <ErrorSummary errors={list} />}
      <input type="hidden" name="role" value={entry.role} />
      <input type="hidden" name="intent" value={entry.intent} />
      <input type="hidden" name="type" value={entry.type} />

      <Group title="Rooms" className="border-t-0 pt-0">
        {keys.has('bhk') && <ChipGroup name="bhk" legend="Bedrooms (BHK)" options={COUNTS.map((n) => ({ value: n, label: n }))} values={shown} errors={errors} />}
        <ChipGroup name="baths" legend="Bathrooms" options={COUNTS.map((n) => ({ value: n, label: n }))} values={shown} errors={errors} />
      </Group>

      <Group title="Area">
        <p className="-mt-2 text-body-sm text-ink-700">
          Carpet area is the floor you can actually use, inside the walls. Built-up adds the walls and balconies; super built-up adds a share of lifts, stairs and lobbies. Give carpet area, and the others if you know them.
        </p>
        <ChipGroup name="unit" legend="Measured in" options={AREA_UNITS.map((unit) => ({ value: unit, label: UNIT_LABEL[unit] }))} values={shown} errors={errors} />
        <div className="grid gap-5 md:grid-cols-3">
          <TextField name="carpet" label="Carpet area" hint="For example 1,240" values={shown} errors={errors} />
          <TextField name="builtup" label="Built-up area" values={shown} errors={errors} optional />
          <TextField name="super" label="Super built-up area" values={shown} errors={errors} optional />
        </div>
      </Group>

      <Group title="Furnishing">
        <ChipGroup name="furnishing" legend="How is it furnished?" options={FURNISHING_ORDER.map((f) => ({ value: f, label: FURNISHING_LABEL[f] }))} values={shown} errors={errors} />
      </Group>

      <Group title="Floors">
        <div className="grid gap-5 md:grid-cols-2">
          {unitFloor && <TextField name="floor" label="Which floor is it on?" hint="Enter 0 for the ground floor." values={shown} errors={errors} />}
          <TextField
            name="floors"
            label={unitFloor ? 'Total floors in the building' : 'Floors in the house'}
            hint={unitFloor ? 'Count every floor, including the ground floor. A ground-plus-four building has 5.' : 'Count the ground floor. A single-storey house has 1.'}
            values={shown}
            errors={errors}
          />
        </div>
      </Group>

      <Group title="Availability">
        {entry.intent === 'buy' ? <>
          <ChipGroup name="status" legend="Is it ready to move in?" options={[{ value: 'READY', label: 'Ready to move' }, { value: 'UNDER_CONSTRUCTION', label: 'Under construction' }]} values={shown} errors={errors} />
          <div className="post-if-ready">
            <TextField name="age" label="Age of the property, in years" hint="Years since construction was completed. Approximate is fine; enter 0 if it is under a year old." values={shown} errors={errors} />
          </div>
          <div className="post-if-uc">
            <TextField name="possession" label="Expected possession" type="month" min={today.slice(0, 7)} hint="Year and month, for example 2028-03." values={shown} errors={errors} />
          </div>
        </> : <>
          <TextField name="age" label="Age of the property, in years" hint="Years since construction was completed. Approximate is fine; enter 0 if it is under a year old." values={shown} errors={errors} />
          <ChipGroup name="available" legend="When can a tenant move in?" options={[{ value: 'now', label: 'Available now' }, { value: 'date', label: 'From a date' }]} values={shown} errors={errors} />
          <div className="post-if-date">
            <TextField name="from" label="Available from" type="date" min={today} hint="Day, month and year." values={shown} errors={errors} />
          </div>
        </>}
      </Group>

      <div className="flex flex-col gap-3 border-t border-border-subtle pt-6 sm:flex-row sm:items-center">
        <Button type="submit" variant="supply" size="lg" className="w-full sm:w-auto">Continue to review</Button>
        <p className="text-body-sm text-ink-500">Nothing is saved or posted yet. Your answers stay in this page link.</p>
      </div>
    </form>
  </>
}
