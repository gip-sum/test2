import { parseWholeNumber } from '@/lib/format/number'
import type { Intent } from '@/lib/property/types'
import type { PropertyFacts } from './details'
import type { EntryInput } from './entry'

export const PRICING_KEYS = ['saleprice', 'rent', 'deposit', 'maintenance', 'maintenanceAmount', 'negotiable'] as const
export type PricingKey = (typeof PRICING_KEYS)[number]
export type PricingInput = Partial<Record<PricingKey, string>>
export type PricingErrors = Partial<Record<PricingKey, string>>
type Maintenance = { status: 'separate'; monthly: number } | { status: 'none' | 'unknown' | 'included' }
export type PropertyPricing = { negotiable: boolean; maintenance: Maintenance } & (
  | { intent: 'buy'; price: number }
  | { intent: 'rent'; monthlyRent: number; deposit: number }
)
export const PRICING_LIMITS = { saleprice: 10_000_000_000, rent: 10_000_000, deposit: 100_000_000, maintenanceAmount: 1_000_000 } as const

export function readPricingInput(input: EntryInput): PricingInput {
  const values: PricingInput = {}
  for (const key of PRICING_KEYS) {
    const value = input[key]
    if (value === undefined || value === '') continue
    values[key] = typeof value === 'string' && value.length <= 24 ? value : '�'
  }
  return values
}
export function restrictPricing(input: PricingInput, intent: Intent): PricingInput {
  const values = { ...input }
  if (intent === 'buy') { delete values.rent; delete values.deposit }
  else delete values.saleprice
  if (values.maintenance !== 'separate') delete values.maintenanceAmount
  return values
}
export function pricingPairs(input: PricingInput): [PricingKey, string][] {
  return PRICING_KEYS.flatMap((key) => input[key] !== undefined ? [[key, input[key]!] as [PricingKey, string]] : [])
}
export function validatePricing(input: PricingInput, intent: Intent):
  | { ok: true; pricing: PropertyPricing; values: PricingInput }
  | { ok: false; errors: PricingErrors } {
  const values = restrictPricing(input, intent)
  const errors: PricingErrors = {}
  const money = (key: keyof typeof PRICING_LIMITS, label: string, allowZero = false) => {
    const number = parseWholeNumber(values[key] ?? '')
    if (number === undefined || number < (allowZero ? 0 : 1) || number > PRICING_LIMITS[key]) {
      errors[key] = `Enter ${label} in whole rupees, ${allowZero ? 'zero or more' : 'greater than zero'}, up to ${PRICING_LIMITS[key].toLocaleString('en-IN')}.`
      return undefined
    }
    return number
  }
  const amount = intent === 'buy' ? money('saleprice', 'the sale price') : money('rent', 'monthly rent')
  const deposit = intent === 'rent' ? money('deposit', 'the security deposit', true) : undefined
  const status = values.maintenance
  if (!['separate', 'none', 'unknown', ...(intent === 'rent' ? ['included'] : [])].includes(status ?? '')) errors.maintenance = 'Choose how monthly maintenance is charged.'
  const monthly = status === 'separate' ? money('maintenanceAmount', 'monthly maintenance') : undefined
  if (values.negotiable !== 'yes' && values.negotiable !== 'no') errors.negotiable = 'Choose whether the price is negotiable.'
  if (Object.keys(errors).length || amount === undefined) return { ok: false, errors }
  const maintenance: Maintenance = status === 'separate' ? { status, monthly: monthly! } : { status: status as 'none' | 'unknown' | 'included' }
  const pricing: PropertyPricing = intent === 'buy'
    ? { intent, price: amount, maintenance, negotiable: values.negotiable === 'yes' }
    : { intent, monthlyRent: amount, deposit: deposit!, maintenance, negotiable: values.negotiable === 'yes' }
  const canonical: PricingInput = { ...values, [intent === 'buy' ? 'saleprice' : 'rent']: String(amount) }
  if (deposit !== undefined) canonical.deposit = String(deposit)
  if (monthly !== undefined) canonical.maintenanceAmount = String(monthly)
  return { ok: true, pricing, values: canonical }
}
/** Carpet basis only; monthly rent stays a monthly rate. Never persisted. */
export function pricingRate(pricing: PropertyPricing, facts: PropertyFacts): number {
  const sqft = facts.carpetArea * (facts.areaUnit === 'sqm' ? 10.7639 : facts.areaUnit === 'sqyd' ? 9 : 1)
  return Math.round((pricing.intent === 'buy' ? pricing.price : pricing.monthlyRent) / sqft)
}
