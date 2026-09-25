import Link from 'next/link'
import { AreaDisplay } from '@/components/property/AreaDisplay'
import { formatConfiguration } from '@/lib/format/area'
import { postingUrl } from '@/lib/posting/entry'
import type { DetailInput, DetailKey, PropertyFacts } from '@/lib/posting/details'
import type { CompleteEntry } from '@/lib/posting/flow'
import { CONSTRUCTION_LABEL, FURNISHING_LABEL, PROPERTY_TYPE_LABEL, SELLER_LABEL } from '@/lib/property/types'
import { fieldId } from './DetailsForm'

function formatMonth(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function floorText(facts: PropertyFacts): string {
  const storeys = `${facts.totalFloors} ${facts.totalFloors === 1 ? 'floor' : 'floors'}`
  if (facts.floor === undefined) return `${storeys} in the house`
  return `${facts.floor === 0 ? 'Ground floor' : `Floor ${facts.floor}`} of ${storeys}`
}

function ageText(years: number): string {
  if (years === 0) return 'Under a year old'
  return `${years} ${years === 1 ? 'year' : 'years'} old`
}

type Row = { label: string; value: React.ReactNode; edit: string; changeLabel: string }

/**
 * Everything answered so far, each with its own way back.
 *
 * Every figure goes through the shared formatters (`AreaDisplay`,
 * `formatConfiguration`) so the review reads exactly as the published
 * listing will — a seller should not approve one rendering and get another.
 * An optional basis that was not given says so rather than disappearing:
 * on this screen the seller is checking what they did and did not state.
 */
export function DetailsReview({ entry, facts, carried }: { entry: CompleteEntry; facts: PropertyFacts; carried: DetailInput }) {
  const edit = (key: DetailKey) => `${postingUrl(entry, { details: carried, edit: true })}#${fieldId(key)}`
  const unit = facts.areaUnit
  const notStated = <span className="font-normal text-ink-500">Not stated</span>

  const choices: Row[] = [
    { label: 'You are posting as', value: SELLER_LABEL[entry.role], edit: postingUrl({}, { details: carried }), changeLabel: 'Change You are posting as' },
    { label: 'You want to', value: entry.intent === 'buy' ? 'Sell a property' : 'Rent out a property', edit: postingUrl({ role: entry.role }, { details: carried }), changeLabel: 'Change You want to' },
    { label: 'Property type', value: PROPERTY_TYPE_LABEL[entry.type], edit: postingUrl({ role: entry.role, intent: entry.intent }, { details: carried }), changeLabel: 'Change Property type' },
  ]

  const details: Row[] = [
    {
      label: 'Configuration',
      value: facts.bedrooms === undefined ? `Studio · ${formatConfiguration(null, facts.bathrooms)}` : formatConfiguration(facts.bedrooms, facts.bathrooms),
      edit: edit(facts.bedrooms === undefined ? 'baths' : 'bhk'),
      changeLabel: 'Change Configuration',
    },
    { label: 'Carpet area', value: <AreaDisplay value={facts.carpetArea} unit={unit} basis="carpet" variant="full" />, edit: edit('carpet'), changeLabel: 'Change Carpet area' },
    { label: 'Built-up area', value: facts.builtUpArea ? <AreaDisplay value={facts.builtUpArea} unit={unit} basis="builtup" variant="full" /> : notStated, edit: edit('builtup'), changeLabel: 'Change Built-up area' },
    { label: 'Super built-up area', value: facts.superArea ? <AreaDisplay value={facts.superArea} unit={unit} basis="super" variant="full" /> : notStated, edit: edit('super'), changeLabel: 'Change Super built-up area' },
    { label: 'Furnishing', value: FURNISHING_LABEL[facts.furnishing], edit: edit('furnishing'), changeLabel: 'Change Furnishing' },
    { label: 'Floor', value: floorText(facts), edit: edit(facts.floor === undefined ? 'floors' : 'floor'), changeLabel: 'Change Floor' },
    {
      label: 'Availability',
      value: facts.availableFrom === 'now'
        ? 'Available now'
        : facts.availableFrom
          ? `Available from ${formatDay(facts.availableFrom.from)}`
          : facts.possessionBy
            ? `${CONSTRUCTION_LABEL.UNDER_CONSTRUCTION} · possession by ${formatMonth(facts.possessionBy)}`
            : CONSTRUCTION_LABEL.READY,
      edit: edit(entry.intent === 'rent' ? 'available' : 'status'),
      changeLabel: 'Change Availability',
    },
  ]
  if (facts.ageYears !== undefined) details.push({ label: 'Age', value: ageText(facts.ageYears), edit: edit('age'), changeLabel: 'Change Age' })

  const list = (rows: Row[], label: string) => (
    <dl aria-label={label} className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-subtle bg-surface-000 px-5 shadow-e1 sm:px-7">
      {rows.map((row) => (
        <div key={row.label} className="flex min-h-20 items-center justify-between gap-4 py-4">
          <div className="min-w-0">
            <dt className="text-caption text-ink-500">{row.label}</dt>
            <dd className="mt-1 font-display text-body-lg font-semibold text-ink-900 tabular">{row.value}</dd>
          </div>
          <Link href={row.edit} className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 text-label text-brand-700 underline-offset-4 hover:underline" aria-label={row.changeLabel}>Change</Link>
        </div>
      ))}
    </dl>
  )

  return <>
    <h1 id="post-heading" className="font-display text-heading-1 text-ink-900 sm:text-[40px] sm:leading-tight">Check the property details.</h1>
    <p className="mt-3 max-w-xl text-body-lg text-ink-700">Check each answer before moving on, and change anything that is not right.</p>
    <h2 className="mt-8 font-display text-heading-3 text-ink-900">Your choices</h2>
    <div className="mt-3">{list(choices, 'Your choices')}</div>
    <h2 className="mt-8 font-display text-heading-3 text-ink-900">Property details</h2>
    <div className="mt-3">{list(details, 'Property details')}</div>
    <div className="mt-6 rounded-lg border border-brand-600/20 bg-brand-100/65 p-5 sm:p-6">
      <h2 className="font-display text-heading-3 text-ink-900">What happens next?</h2>
      <p className="mt-2 text-body text-ink-700">The next stage, the property&apos;s location, is being prepared. Your answers are in this page link only: they have not been saved to an account and no property has been posted.</p>
      <Link href={postingUrl(entry, { details: carried, edit: true })} className="mt-5 inline-flex min-h-11 items-center rounded-full border border-brand-600 bg-surface-000 px-5 text-label text-brand-700 hover:bg-brand-100">Edit property details</Link>
    </div>
  </>
}
