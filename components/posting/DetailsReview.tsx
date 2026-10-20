import type { PricingInput } from '@/lib/posting/pricing'
import { AreaDisplay } from '@/components/property/AreaDisplay'
import { formatConfiguration } from '@/lib/format/area'
import { postingUrl } from '@/lib/posting/entry'
import type { DetailInput, DetailKey, PropertyFacts } from '@/lib/posting/details'
import type { CompleteEntry } from '@/lib/posting/flow'
import { CONSTRUCTION_LABEL, FURNISHING_LABEL, PROPERTY_TYPE_LABEL, SELLER_LABEL } from '@/lib/property/types'
import type { LocationInput } from '@/lib/posting/location'
import { fieldId } from './DetailsForm'
import { StepHeading } from './PostingWorkspace'
import { NextStep, ReviewList, type ReviewRow } from './ReviewParts'

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
const rowsOf = (rows: Row[]): ReviewRow[] => rows.map((r) => ({ ...r, key: r.label }))

/**
 * Everything answered so far, each with its own way back.
 *
 * Every figure goes through the shared formatters (`AreaDisplay`,
 * `formatConfiguration`) so the review reads exactly as the published
 * listing will — a seller should not approve one rendering and get another.
 * An optional basis that was not given says so rather than disappearing:
 * on this screen the seller is checking what they did and did not state.
 */
export function DetailsReview({ entry, facts, carried, location = {}, pricing = {}, finalReview = false, heading }: { entry: CompleteEntry; facts: PropertyFacts; carried: DetailInput; location?: LocationInput; finalReview?: boolean; pricing?: PricingInput; heading?: string }) {
  const edit = (key: DetailKey) => `${postingUrl(entry, { details: carried, edit: true, location, pricing })}#${fieldId(key)}`
  const unit = facts.areaUnit
  const notStated = <span className="font-normal text-ink-500">Not stated</span>

  const choices: Row[] = [
    { label: 'You are posting as', value: SELLER_LABEL[entry.role], edit: postingUrl({}, { details: carried, location, pricing }), changeLabel: 'Change You are posting as' },
    { label: 'You want to', value: entry.intent === 'buy' ? 'Sell a property' : 'Rent out a property', edit: postingUrl({ role: entry.role }, { details: carried, location, pricing }), changeLabel: 'Change You want to' },
    { label: 'Property type', value: PROPERTY_TYPE_LABEL[entry.type], edit: postingUrl({ role: entry.role, intent: entry.intent }, { details: carried, location, pricing }), changeLabel: 'Change Property type' },
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

  return <>
    <StepHeading title={heading ?? (finalReview ? 'Check the details and location.' : 'Check the property details.')} lede="Check each answer before moving on, and change anything that is not right." />
    <ReviewList className="mt-8" title="Your choices" rows={rowsOf(choices)} />
    <ReviewList className="mt-7" title="Property details" rows={rowsOf(details)} />
    {!finalReview && <NextStep
      body="Add the property's location next. Nothing is published until you submit it for review."
      primary={{ href: postingUrl(entry, { details: carried, location, pricing, step: 'location' }), label: 'Continue to location' }}
      secondary={{ href: postingUrl(entry, { details: carried, edit: true, location, pricing }), label: 'Edit property details' }}
    />}
  </>
}
