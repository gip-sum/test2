import { describe, expect, it } from 'vitest'
import { PROPERTY_TYPE_ORDER } from '@/lib/property/types'
import {
  applicableKeys,
  factsToInput,
  hasDetails,
  kolkataToday,
  parseWholeNumber,
  readDetailInput,
  restrictDetails,
  validateDetails,
  type DetailInput,
} from './details'
import { postingUrl } from './entry'

const TODAY = '2026-09-25'
const flat = { type: 'APARTMENT', intent: 'buy' } as const
const VALID_FLAT: DetailInput = {
  bhk: '3', baths: '2', unit: 'sqft', carpet: '1,240', builtup: '', super: '1,650',
  furnishing: 'SEMI_FURNISHED', floor: '4', floors: '12', status: 'READY', age: '6', possession: '',
}

function errorsOf(raw: DetailInput, context: Parameters<typeof validateDetails>[1] = flat) {
  const result = validateDetails(raw, context, TODAY)
  return result.ok ? {} : result.errors
}

describe('which questions apply', () => {
  it('asks every type and intent exactly the questions that fit it', () => {
    for (const type of PROPERTY_TYPE_ORDER) {
      for (const intent of ['buy', 'rent'] as const) {
        const keys = applicableKeys({ type, intent })
        expect(keys.has('bhk')).toBe(type !== 'STUDIO')
        expect(keys.has('floor')).toBe(type === 'APARTMENT' || type === 'BUILDER_FLOOR' || type === 'STUDIO')
        expect(keys.has('status')).toBe(intent === 'buy')
        expect(keys.has('possession')).toBe(intent === 'buy')
        expect(keys.has('available')).toBe(intent === 'rent')
        for (const always of ['baths', 'unit', 'carpet', 'builtup', 'super', 'furnishing', 'floors', 'age'] as const) {
          expect(keys.has(always)).toBe(true)
        }
      }
    }
  })

  it('drops answers that no longer apply when the type or intent changes', () => {
    const kept = restrictDetails(VALID_FLAT, { type: 'VILLA', intent: 'rent' })
    expect(kept.floor).toBeUndefined()
    expect(kept.status).toBeUndefined()
    expect(kept.carpet).toBe('1,240')
    expect(restrictDetails(VALID_FLAT, { type: 'STUDIO', intent: 'buy' }).bhk).toBeUndefined()
  })
})

describe('reading raw input', () => {
  it('keeps recognised single values and drops duplicates, oversized values and unknown keys', () => {
    const raw = readDetailInput({ bhk: ['2', '3'], carpet: '9'.repeat(41), baths: '2', role: 'OWNER', junk: 'x' })
    expect(raw).toEqual({ baths: '2' })
    expect(hasDetails(raw)).toBe(true)
    expect(hasDetails(readDetailInput({ role: 'OWNER' }))).toBe(false)
  })

  it('treats a submitted empty field as a submission', () => {
    expect(hasDetails(readDetailInput({ carpet: '' }))).toBe(true)
  })
})

describe('whole numbers', () => {
  it('accepts Indian and international grouping', () => {
    expect(parseWholeNumber('1,240')).toBe(1240)
    expect(parseWholeNumber('1,24,000')).toBe(124000)
    expect(parseWholeNumber('124,000')).toBe(124000)
    expect(parseWholeNumber(' 950 ')).toBe(950)
  })

  it('rejects everything that is not a plain whole number', () => {
    for (const bad of ['12,34,5', '1.5', '-3', '1e3', '12a', '', ',100', '<script>', '1,,000']) {
      expect(parseWholeNumber(bad)).toBeUndefined()
    }
  })
})

describe('validation', () => {
  it('produces facts in the listing model shape and a canonical link', () => {
    const result = validateDetails(VALID_FLAT, flat, TODAY)
    expect(result).toEqual({
      ok: true,
      facts: {
        bedrooms: 3, bathrooms: 2, areaUnit: 'sqft', carpetArea: 1240, superArea: 1650,
        furnishing: 'SEMI_FURNISHED', floor: 4, totalFloors: 12, constructionStatus: 'READY', ageYears: 6,
      },
    })
    if (!result.ok) throw new Error('expected valid')
    expect(postingUrl({ role: 'OWNER', intent: 'buy', type: 'APARTMENT' }, { details: factsToInput(result.facts) })).toBe(
      '/post?role=OWNER&intent=buy&type=APARTMENT&bhk=3&baths=2&unit=sqft&carpet=1240&super=1650&furnishing=SEMI_FURNISHED&floor=4&floors=12&status=READY&age=6',
    )
  })

  it('round-trips canonical input to the same facts', () => {
    const first = validateDetails(VALID_FLAT, flat, TODAY)
    if (!first.ok) throw new Error('expected valid')
    expect(validateDetails(factsToInput(first.facts), flat, TODAY)).toEqual(first)
  })

  it('reports every required answer on an empty submission, in form order', () => {
    const errors = errorsOf({ carpet: '' })
    expect(Object.keys(errors)).toEqual(['bhk', 'baths', 'unit', 'carpet', 'furnishing', 'floor', 'floors', 'status'])
    expect(errors.carpet).toMatch(/for example 1,240/)
  })

  it('never claims a BHK count for a studio', () => {
    const result = validateDetails({ ...VALID_FLAT, bhk: '3' }, { type: 'STUDIO', intent: 'buy' }, TODAY)
    expect(result.ok && result.facts.bedrooms).toBe(undefined)
    expect(result.ok).toBe(true)
  })

  it('bounds bedrooms and bathrooms', () => {
    expect(errorsOf({ ...VALID_FLAT, bhk: '0' }).bhk).toMatch(/between 1 and 10/)
    expect(errorsOf({ ...VALID_FLAT, baths: '11' }).baths).toMatch(/between 1 and 10/)
  })

  it('keeps the three area bases in order and names the offending basis', () => {
    expect(errorsOf({ ...VALID_FLAT, builtup: '1,100' }).builtup).toMatch(/cannot be smaller than the carpet/)
    expect(errorsOf({ ...VALID_FLAT, builtup: '1,400', super: '1,300' }).super).toMatch(/smaller than the built-up/)
    expect(errorsOf({ ...VALID_FLAT, super: '1,000' }).super).toMatch(/smaller than the carpet/)
    expect(errorsOf({ ...VALID_FLAT, builtup: '1,240', super: '1,240' })).toEqual({})
  })

  it('checks plausibility in square feet but stores the unit as typed', () => {
    expect(errorsOf({ ...VALID_FLAT, carpet: '80', super: '' }).carpet).toMatch(/between 100 and 1,00,000 sqft/)
    expect(errorsOf({ ...VALID_FLAT, unit: 'sqm', carpet: '9', super: '' }).carpet).toMatch(/between 10 and 9,290 sq.m/)
    const metric = validateDetails({ ...VALID_FLAT, unit: 'sqm', carpet: '115', super: '' }, flat, TODAY)
    expect(metric.ok && metric.facts.carpetArea).toBe(115)
    expect(errorsOf({ ...VALID_FLAT, unit: 'acres' }).unit).toBeDefined()
    expect(errorsOf({ ...VALID_FLAT, carpet: '1.5' }).carpet).toMatch(/whole number/)
  })

  it('counts the ground floor, so the top floor is one less than the total', () => {
    expect(errorsOf({ ...VALID_FLAT, floor: '11', floors: '12' })).toEqual({})
    expect(errorsOf({ ...VALID_FLAT, floor: '0', floors: '1' })).toEqual({})
    expect(errorsOf({ ...VALID_FLAT, floor: '12', floors: '12' }).floor).toMatch(/floors 0 to 11/)
    expect(errorsOf({ ...VALID_FLAT, floor: '1', floors: '1' }).floor).toMatch(/only the ground floor/)
    expect(errorsOf({ ...VALID_FLAT, floors: '0' }).floors).toMatch(/between 1 and 99/)
    expect(errorsOf({ ...VALID_FLAT, floor: '' }).floor).toMatch(/0 for the ground floor/)
  })

  it('asks a house for its storeys and never for a unit floor', () => {
    const house = { type: 'INDEPENDENT_HOUSE', intent: 'buy' } as const
    const result = validateDetails({ ...VALID_FLAT, floor: '9', floors: '2' }, house, TODAY)
    expect(result.ok && result.facts.floor).toBe(undefined)
    expect(errorsOf({ ...VALID_FLAT, floors: '' }, house).floors).toMatch(/floors in the house/)
  })

  it('reads age for ready homes and possession for those under construction', () => {
    expect(errorsOf({ ...VALID_FLAT, age: '' }).age).toMatch(/Enter 0/)
    expect(errorsOf({ ...VALID_FLAT, age: '151' }).age).toMatch(/between 0 and 150/)
    const uc = { ...VALID_FLAT, status: 'UNDER_CONSTRUCTION', age: 'ignored' }
    expect(errorsOf(uc).possession).toMatch(/possession month/)
    expect(errorsOf({ ...uc, possession: '2026-08' }).possession).toMatch(/already passed/)
    expect(errorsOf({ ...uc, possession: '2026-13' }).possession).toMatch(/for example/)
    expect(errorsOf({ ...uc, possession: '2036-10' }).possession).toMatch(/10 years/)
    const valid = validateDetails({ ...uc, possession: '2026-09' }, flat, TODAY)
    expect(valid.ok && valid.facts).toMatchObject({ constructionStatus: 'UNDER_CONSTRUCTION', possessionBy: '2026-09' })
    expect(valid.ok && valid.facts.ageYears).toBe(undefined)
  })

  it('makes every rental ready to move and asks when it is available', () => {
    const rent = { type: 'APARTMENT', intent: 'rent' } as const
    const base = { ...VALID_FLAT, status: 'UNDER_CONSTRUCTION' }
    expect(errorsOf(base, rent).available).toBeDefined()
    const now = validateDetails({ ...base, available: 'now' }, rent, TODAY)
    expect(now.ok && now.facts).toMatchObject({ constructionStatus: 'READY', availableFrom: 'now', ageYears: 6 })
    expect(errorsOf({ ...base, available: 'date', from: '' }, rent).from).toMatch(/Enter the date/)
    expect(errorsOf({ ...base, available: 'date', from: '2026-09-24' }, rent).from).toMatch(/has passed/)
    expect(errorsOf({ ...base, available: 'date', from: '2026-02-30' }, rent).from).toMatch(/real date/)
    expect(errorsOf({ ...base, available: 'date', from: '2027-09-26' }, rent).from).toMatch(/next year/)
    const dated = validateDetails({ ...base, available: 'date', from: TODAY }, rent, TODAY)
    expect(dated.ok && dated.facts.availableFrom).toEqual({ from: TODAY })
    if (!dated.ok) throw new Error('expected valid')
    expect(factsToInput(dated.facts).status).toBeUndefined()
  })
})

describe('links', () => {
  it('carries details through earlier choices and marks the return as an edit', () => {
    expect(postingUrl({ role: 'OWNER' }, { details: { carpet: '900', bhk: '2' } })).toBe('/post?role=OWNER&bhk=2&carpet=900')
    expect(postingUrl({ role: 'OWNER', intent: 'buy', type: 'VILLA' }, { details: { carpet: '900' }, edit: true })).toBe(
      '/post?role=OWNER&intent=buy&type=VILLA&carpet=900&edit=1',
    )
    expect(postingUrl({ role: 'OWNER', intent: 'buy', type: 'VILLA' }, { details: {}, edit: true })).toBe(
      '/post?role=OWNER&intent=buy&type=VILLA',
    )
  })

  it('uses the Kolkata calendar day, not the server one', () => {
    expect(kolkataToday(new Date('2026-09-25T19:00:00Z'))).toBe('2026-09-26')
    expect(kolkataToday(new Date('2026-09-25T18:00:00Z'))).toBe('2026-09-25')
  })
})
