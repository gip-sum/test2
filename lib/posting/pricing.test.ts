import { describe, expect, it } from 'vitest'
import { readPricingInput, validatePricing, pricingRate, PRICING_LIMITS } from './pricing'
import { resolvePosting } from './flow'
import { isCanonicalInput } from './entry'

const sale = { saleprice: '62,50,000', maintenance: 'separate', maintenanceAmount: '2,500', negotiable: 'yes' }
const rent = { rent: '25,000', deposit: '0', maintenance: 'included', negotiable: 'no' }
const details = { role: 'OWNER', intent: 'buy', type: 'APARTMENT', bhk: '2', baths: '2', unit: 'sqft', carpet: '1000', furnishing: 'UNFURNISHED', floor: '3', floors: '8', status: 'READY', age: '4' }
const location = { city: 'kolkata', locality: 'new-town', address: 'Test building address' }
const today = '2026-10-01'

describe('property pricing', () => {
  it('normalises grouped integer rupees and records separate maintenance', () => {
    const result = validatePricing(sale, 'buy')
    expect(result).toEqual({ ok: true, pricing: { intent: 'buy', price: 6250000, negotiable: true, maintenance: { status: 'separate', monthly: 2500 } }, values: { ...sale, saleprice: '6250000', maintenanceAmount: '2500' } })
  })
  it('keeps zero deposit and distinguishes included maintenance', () => {
    const result = validatePricing(rent, 'rent')
    expect(result.ok && result.pricing).toEqual({ intent: 'rent', monthlyRent: 25000, deposit: 0, negotiable: false, maintenance: { status: 'included' } })
    expect(result.ok && result.values.deposit).toBe('0')
  })
  it.each(['', '0', '-1', '1.5', '1e6', '₹100', '12,34,5', '9007199254740992', '10000000001', 'Infinity'])('rejects invalid sale price %s', (saleprice) => {
    const result = validatePricing({ ...sale, saleprice }, 'buy')
    expect(!result.ok && result.errors.saleprice).toBeTruthy()
  })
  it.each(Object.entries(PRICING_LIMITS))('accepts the %s ceiling and rejects above it', (key, max) => {
    const base = key === 'saleprice' ? sale : { ...rent, maintenance: 'separate', maintenanceAmount: '2500' }
    const intent = key === 'saleprice' ? 'buy' : 'rent'
    expect(validatePricing({ ...base, [key]: String(max) }, intent).ok).toBe(true)
    expect(validatePricing({ ...base, [key]: String(max + 1) }, intent).ok).toBe(false)
  })
  it('requires rental deposit rather than treating omission as zero', () => {
    const result = validatePricing({ ...rent, deposit: '' }, 'rent')
    expect(!result.ok && result.errors.deposit).toBeTruthy()
  })
  it('does not reinterpret sale price as rent or allow included maintenance on a sale', () => {
    expect(validatePricing(sale, 'rent').ok).toBe(false)
    expect(validatePricing({ ...sale, maintenance: 'included' }, 'buy').ok).toBe(false)
  })
  it.each(['none', 'unknown'])('keeps %s maintenance distinct and removes stale amount', (status) => {
    const result = validatePricing({ ...sale, maintenance: status }, 'buy')
    expect(result.ok && result.pricing.maintenance).toEqual({ status })
    expect(result.ok && result.values.maintenanceAmount).toBeUndefined()
  })
  it('requires positive separate maintenance and explicit negotiability', () => {
    const result = validatePricing({ ...sale, maintenanceAmount: '0', negotiable: '' }, 'buy')
    expect(!result.ok && Object.keys(result.errors)).toEqual(['maintenanceAmount', 'negotiable'])
  })
  it('rejects duplicates and oversized inputs instead of silently losing invalid answers', () => {
    for (const key of ['saleprice', 'maintenance', 'maintenanceAmount', 'negotiable'] as const) {
      const result = validatePricing(readPricingInput({ ...sale, [key]: [sale[key], sale[key]] }), 'buy')
      expect(result.ok).toBe(false)
    }
    expect(validatePricing(readPricingInput({ ...sale, saleprice: '1'.repeat(25) }), 'buy').ok).toBe(false)
  })
  it.each([['sqft', 1000, 6250], ['sqm', 100, 5806], ['sqyd', 100, 6944]] as const)('derives rate from %s carpet area, ignoring other bases', (unit, carpet, expected) => {
    const result = resolvePosting({ ...details, unit, carpet: String(carpet), ...location, ...sale, step: 'pricing-review' }, today)
    expect(result.view.stage).toBe('pricing-review')
    if (result.view.stage !== 'pricing-review') throw new Error('expected review')
    expect(pricingRate(result.view.pricing, { ...result.view.facts, superArea: 9999 })).toBe(expected)
  })
})

describe('pricing flow', () => {
  const input = { ...details, ...location, ...sale, step: 'pricing-review' }
  it('canonicalises review and is stable on refresh', () => {
    const result = resolvePosting(input, today)
    expect(result.view.stage).toBe('pricing-review')
    const canonical = Object.fromEntries(new URL(result.canonicalUrl, 'https://test.local').searchParams)
    expect(isCanonicalInput(canonical, result.canonicalUrl)).toBe(true)
    expect(resolvePosting(canonical, today).canonicalUrl).toBe(result.canonicalUrl)
  })
  it('opens unjudged pricing in edit mode', () => {
    const result = resolvePosting({ ...input, saleprice: 'bad', step: 'pricing' }, today)
    expect(result.view.stage === 'pricing' && result.view.errors).toEqual({})
  })
  it('preserves invalid typed pricing and reports all missing choices', () => {
    const result = resolvePosting({ ...details, ...location, saleprice: 'bad', step: 'pricing-review' }, today)
    expect(result.view.stage === 'pricing' && Object.keys(result.view.errors)).toEqual(['saleprice', 'maintenance', 'negotiable'])
    expect(result.view.pricingCarried.saleprice).toBe('bad')
  })
  it('guards earlier stages and retains pricing', () => {
    for (const [override, stage] of [[{ role: '' }, 'role'], [{ carpet: '' }, 'details'], [{ locality: 'missing' }, 'location']] as const) {
      const result = resolvePosting({ ...input, ...override }, today)
      expect(result.view.stage).toBe(stage)
      expect(result.view.pricingCarried.saleprice).toBe(sale.saleprice)
    }
  })
  it('carries pricing when revisiting details, location and choices', () => {
    for (const override of [{ edit: '1' }, { step: 'location' }, { type: '' }]) {
      const result = resolvePosting({ ...input, ...override }, today)
      expect(result.canonicalUrl).toContain('saleprice=62%2C50%2C000')
    }
  })
  it('clears sale-only data after changing to rental', () => {
    const result = resolvePosting({ ...input, intent: 'rent', available: 'now', ...rent }, today)
    expect(result.view.stage).toBe('pricing-review')
    expect(result.canonicalUrl).not.toContain('saleprice')
    expect(result.canonicalUrl).not.toContain('maintenanceAmount')
  })
})
