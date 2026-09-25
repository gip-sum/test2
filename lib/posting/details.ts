import type { AreaUnit } from '@/lib/format/area'
import type { ConstructionStatus, Furnishing, Intent, PropertyTypeCode } from '@/lib/property/types'
import { FURNISHING_ORDER } from '@/lib/property/types'
import type { EntryInput } from './entry'

/**
 * Property facts collected in Phase 12.
 *
 * The only module that knows which facts exist, which apply to which
 * property, and what makes them valid. The page, the form and the review
 * all ask this module; none of them re-derives a rule. Pure on purpose:
 * `today` is injected so date rules are testable and cannot drift with the
 * server clock.
 */

/**
 * Query parameter names, in form order. The order is also the canonical
 * order of a review link, and the order errors are listed in the summary,
 * so the summary reads top to bottom like the form it points into.
 */
export const DETAIL_KEYS = [
  'bhk',
  'baths',
  'unit',
  'carpet',
  'builtup',
  'super',
  'furnishing',
  'floor',
  'floors',
  'status',
  'age',
  'possession',
  'available',
  'from',
] as const
export type DetailKey = (typeof DETAIL_KEYS)[number]

/** Raw, unvalidated form values exactly as typed — what the form echoes back. */
export type DetailInput = Partial<Record<DetailKey, string>>
export type DetailErrors = Partial<Record<DetailKey, string>>

export type Availability = 'now' | { from: string }

/**
 * Field names and units match `PropertySummary` / `PropertyDetail` so the
 * Phase 16 draft stores this shape and Phase 18 publishes it without a
 * translation layer. Areas stay in the unit the seller typed them in —
 * converting would round a figure the seller will later see quoted back.
 */
export type PropertyFacts = {
  /** Absent for a studio: a studio is not a 1 BHK, and must not claim to be. */
  bedrooms?: number
  bathrooms: number
  areaUnit: AreaUnit
  carpetArea: number
  builtUpArea?: number
  superArea?: number
  furnishing: Furnishing
  /** 0 is the ground floor. Absent for houses and villas, which are the whole building. */
  floor?: number
  /** Every storey, ground included: ground-plus-four is 5. */
  totalFloors: number
  constructionStatus: ConstructionStatus
  /** Years since completion. Absent while under construction. */
  ageYears?: number
  /** `YYYY-MM`. Sale, under construction only. New to the domain; see the Phase 12 spec. */
  possessionBy?: string
  /** Rent only. */
  availableFrom?: Availability
}

export type DetailContext = { type: PropertyTypeCode; intent: Intent }

export const AREA_UNITS: AreaUnit[] = ['sqft', 'sqm', 'sqyd']
/** Conversion to square feet, used only for plausibility bounds — never stored. */
const TO_SQFT: Record<AreaUnit, number> = { sqft: 1, sqm: 10.7639, sqyd: 9 }
const MIN_CARPET_SQFT = 100
const MAX_AREA_SQFT = 100_000
const MAX_ROOMS = 10
const MAX_FLOORS = 99
const MAX_AGE = 150
const MAX_VALUE_LENGTH = 40

/** A flat's position in a building only means something when it is part of one. */
export function hasUnitFloor(type: PropertyTypeCode): boolean {
  return type === 'APARTMENT' || type === 'BUILDER_FLOOR' || type === 'STUDIO'
}

/**
 * Which parameters can apply at all, before any answer is known.
 *
 * `age` and `possession` both apply to a sale because either may be the
 * follow-up, depending on `status`; `validateDetails` decides which one is
 * read. Everything outside this set is dropped from links — this is how a
 * floor vanishes when the type changes to a villa.
 */
export function applicableKeys({ type, intent }: DetailContext): Set<DetailKey> {
  const keys = new Set<DetailKey>(['baths', 'unit', 'carpet', 'builtup', 'super', 'furnishing', 'floors', 'age'])
  if (type !== 'STUDIO') keys.add('bhk')
  if (hasUnitFloor(type)) keys.add('floor')
  if (intent === 'buy') {
    keys.add('status')
    keys.add('possession')
  } else {
    // A rental is, by definition, somewhere a tenant can live: "under
    // construction" is not a state a rental can be in.
    keys.add('available')
    keys.add('from')
  }
  return keys
}

/**
 * Recognised detail parameters from a request. Duplicates and oversized
 * values are dropped rather than resolved or truncated: picking one of two
 * values would be a guess, and a truncated number is a different number.
 */
export function readDetailInput(input: EntryInput): DetailInput {
  const raw: DetailInput = {}
  for (const key of DETAIL_KEYS) {
    const value = input[key]
    if (typeof value === 'string' && value.length <= MAX_VALUE_LENGTH) raw[key] = value
  }
  return raw
}

export function hasDetails(raw: DetailInput): boolean {
  return DETAIL_KEYS.some((key) => raw[key] !== undefined)
}

export function restrictDetails(raw: DetailInput, context: DetailContext): DetailInput {
  const keys = applicableKeys(context)
  const kept: DetailInput = {}
  for (const key of DETAIL_KEYS) if (keys.has(key) && raw[key] !== undefined) kept[key] = raw[key]
  return kept
}

/** Canonical ordered pairs for a link. Raw values are carried as typed. */
export function detailPairs(raw: DetailInput): [DetailKey, string][] {
  return DETAIL_KEYS.flatMap((key) => (raw[key] === undefined ? [] : [[key, raw[key]] as [DetailKey, string]]))
}

/** Today's date in Kolkata, `YYYY-MM-DD`. Server midnight is not the seller's midnight. */
export function kolkataToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

// Plain digits, or digits grouped the Indian way (1,24,000) or the
// international way (124,000). Anything else — "12,34,5", "1.5", "-3",
// "1e3" — is a typing mistake we should point out, not guess at.
const PLAIN = /^\d+$/
const INDIAN = /^\d{1,2}(,\d{2})*,\d{3}$/
const INTERNATIONAL = /^\d{1,3}(,\d{3})+$/

export function parseWholeNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!PLAIN.test(trimmed) && !INDIAN.test(trimmed) && !INTERNATIONAL.test(trimmed)) return undefined
  const parsed = Number(trimmed.replaceAll(',', ''))
  return Number.isSafeInteger(parsed) ? parsed : undefined
}

function isRealDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const date = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const UNIT_WORD: Record<AreaUnit, string> = { sqft: 'sqft', sqm: 'sq.m', sqyd: 'sq.yd' }

export type DetailResult = { ok: true; facts: PropertyFacts } | { ok: false; errors: DetailErrors }

export function validateDetails(raw: DetailInput, context: DetailContext, today: string): DetailResult {
  const keys = applicableKeys(context)
  const errors: DetailErrors = {}
  const value = (key: DetailKey) => (keys.has(key) ? (raw[key] ?? '').trim() : '')

  const count = (key: 'bhk' | 'baths', noun: string): number | undefined => {
    const n = parseWholeNumber(value(key))
    if (n === undefined || n < 1 || n > MAX_ROOMS) {
      errors[key] = value(key) === '' ? `Choose the number of ${noun}` : `Choose between 1 and ${MAX_ROOMS} ${noun}`
      return undefined
    }
    return n
  }
  const bedrooms = keys.has('bhk') ? count('bhk', 'bedrooms') : undefined
  const bathrooms = count('baths', 'bathrooms')

  const unit = AREA_UNITS.find((u) => u === value('unit'))
  if (!unit) errors.unit = 'Choose the unit the areas are measured in'
  const word = unit ? UNIT_WORD[unit] : 'sqft'
  const factor = unit ? TO_SQFT[unit] : 1

  const area = (key: 'carpet' | 'builtup' | 'super', label: string, required: boolean): number | undefined => {
    const text = value(key)
    if (text === '') {
      if (required) errors[key] = `Enter the ${label}, for example 1,240`
      return undefined
    }
    const n = parseWholeNumber(text)
    if (n === undefined) {
      errors[key] = `Enter the ${label} as a whole number, like 1,240 — no decimals or letters`
      return undefined
    }
    const sqft = n * factor
    if (sqft < MIN_CARPET_SQFT || sqft > MAX_AREA_SQFT) {
      const lo = Math.ceil(MIN_CARPET_SQFT / factor)
      const hi = Math.floor(MAX_AREA_SQFT / factor)
      errors[key] = `Enter a ${label} between ${lo.toLocaleString('en-IN')} and ${hi.toLocaleString('en-IN')} ${word}`
      return undefined
    }
    return n
  }
  const carpetArea = area('carpet', 'carpet area', true)
  const builtUpArea = area('builtup', 'built-up area', false)
  const superArea = area('super', 'super built-up area', false)
  // Each basis adds to the one before it, so the order is a law, not a
  // preference. The error goes on the larger basis: that is the figure most
  // often typed into the wrong box.
  if (carpetArea !== undefined && builtUpArea !== undefined && builtUpArea < carpetArea) {
    errors.builtup = 'Built-up area includes the walls, so it cannot be smaller than the carpet area'
  }
  if (superArea !== undefined && builtUpArea !== undefined && !errors.builtup && superArea < builtUpArea) {
    errors.super = 'Super built-up area includes shared spaces, so it cannot be smaller than the built-up area'
  } else if (superArea !== undefined && carpetArea !== undefined && superArea < carpetArea) {
    errors.super = 'Super built-up area includes shared spaces, so it cannot be smaller than the carpet area'
  }

  const furnishing = FURNISHING_ORDER.find((f) => f === value('furnishing'))
  if (!furnishing) errors.furnishing = 'Choose how the property is furnished'

  const totalFloors = parseWholeNumber(value('floors'))
  const floorsNoun = hasUnitFloor(context.type) ? 'floors in the building' : 'floors in the house'
  if (value('floors') === '') errors.floors = `Enter the number of ${floorsNoun}`
  else if (totalFloors === undefined || totalFloors < 1 || totalFloors > MAX_FLOORS) {
    errors.floors = `Enter between 1 and ${MAX_FLOORS} ${floorsNoun}`
  }
  let floor: number | undefined
  if (keys.has('floor')) {
    floor = parseWholeNumber(value('floor'))
    if (value('floor') === '') errors.floor = 'Enter the floor the property is on. Enter 0 for the ground floor'
    else if (floor === undefined) errors.floor = 'Enter the floor as a whole number. Enter 0 for the ground floor'
    else if (totalFloors !== undefined && !errors.floors && floor > totalFloors - 1) {
      errors.floor = `A building with ${totalFloors} ${totalFloors === 1 ? 'floor has only the ground floor' : `floors has floors 0 to ${totalFloors - 1}`}. Check the floor or the total`
    }
  }

  let constructionStatus: ConstructionStatus | undefined = context.intent === 'rent' ? 'READY' : undefined
  if (context.intent === 'buy') {
    constructionStatus = (['READY', 'UNDER_CONSTRUCTION'] as const).find((s) => s === value('status'))
    if (!constructionStatus) errors.status = 'Choose whether the property is ready to move or under construction'
  }

  let ageYears: number | undefined
  if (constructionStatus === 'READY') {
    ageYears = parseWholeNumber(value('age'))
    if (value('age') === '') errors.age = 'Enter the age of the property in years. Enter 0 if it is less than a year old'
    else if (ageYears === undefined || ageYears > MAX_AGE) errors.age = `Enter an age between 0 and ${MAX_AGE} years`
  }

  let possessionBy: string | undefined
  if (constructionStatus === 'UNDER_CONSTRUCTION') {
    const text = value('possession')
    const month = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(text)
    const current = today.slice(0, 7)
    const latest = `${Number(today.slice(0, 4)) + 10}${today.slice(4, 7)}`
    if (text === '') errors.possession = 'Enter the expected possession month'
    else if (!month) errors.possession = 'Enter the possession month as year and month, for example 2028-03'
    else if (text < current) errors.possession = 'Possession month has already passed. Enter this month or a later one'
    else if (text > latest) errors.possession = 'Enter a possession month within the next 10 years'
    else possessionBy = text
  }

  let availableFrom: Availability | undefined
  if (context.intent === 'rent') {
    const choice = value('available')
    if (choice === 'now') availableFrom = 'now'
    else if (choice === 'date') {
      const from = value('from')
      if (from === '') errors.from = 'Enter the date the property is available from'
      else if (!isRealDate(from)) errors.from = 'Enter a real date, for example 2026-11-01'
      else if (from < today) errors.from = 'That date has passed. Enter today or a later date, or choose available now'
      else if (from > addDays(today, 365)) errors.from = 'Enter a date within the next year'
      else availableFrom = { from }
    } else errors.available = 'Choose when the property is available'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors: orderErrors(errors) }
  return {
    ok: true,
    facts: {
      ...(bedrooms !== undefined && { bedrooms }),
      bathrooms: bathrooms!,
      areaUnit: unit!,
      carpetArea: carpetArea!,
      ...(builtUpArea !== undefined && { builtUpArea }),
      ...(superArea !== undefined && { superArea }),
      furnishing: furnishing!,
      ...(floor !== undefined && { floor }),
      totalFloors: totalFloors!,
      constructionStatus: constructionStatus!,
      ...(ageYears !== undefined && { ageYears }),
      ...(possessionBy !== undefined && { possessionBy }),
      ...(availableFrom !== undefined && { availableFrom }),
    },
  }
}

function orderErrors(errors: DetailErrors): DetailErrors {
  const ordered: DetailErrors = {}
  for (const key of DETAIL_KEYS) if (errors[key]) ordered[key] = errors[key]
  return ordered
}

/** The canonical raw form of valid facts: normalised numbers, nothing inapplicable. */
export function factsToInput(facts: PropertyFacts): DetailInput {
  const raw: DetailInput = {}
  if (facts.bedrooms !== undefined) raw.bhk = String(facts.bedrooms)
  raw.baths = String(facts.bathrooms)
  raw.unit = facts.areaUnit
  raw.carpet = String(facts.carpetArea)
  if (facts.builtUpArea !== undefined) raw.builtup = String(facts.builtUpArea)
  if (facts.superArea !== undefined) raw.super = String(facts.superArea)
  raw.furnishing = facts.furnishing
  if (facts.floor !== undefined) raw.floor = String(facts.floor)
  raw.floors = String(facts.totalFloors)
  if (facts.availableFrom === undefined) raw.status = facts.constructionStatus
  if (facts.ageYears !== undefined) raw.age = String(facts.ageYears)
  if (facts.possessionBy !== undefined) raw.possession = facts.possessionBy
  if (facts.availableFrom === 'now') raw.available = 'now'
  else if (facts.availableFrom) {
    raw.available = 'date'
    raw.from = facts.availableFrom.from
  }
  return raw
}
