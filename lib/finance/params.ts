import { parseWholeNumber } from '@/lib/format/number'
import { groupIndian } from '@/lib/format/price'
import { LAKH, maxLoanForPrice } from './loan'

/**
 * The calculators' URL grammar (Phase 40A).
 *
 * The URL is the state, as everywhere in the product: every input is a
 * query parameter, so a result can be shared, refreshed, bookmarked or
 * submitted without JavaScript and come back identical. This module is the
 * only one that knows the parameter names, the defaults and the bounds;
 * the server page and the client form both call it, so they cannot
 * disagree about what is valid.
 *
 * An absent parameter takes its default. A present but invalid one is an
 * error with a message saying what to type — never silently replaced,
 * because a result computed from a number the person did not enter would
 * be a result they did not ask for.
 */

export type FieldSpec = {
  label: string
  kind: 'rupees' | 'percent' | 'years'
  min: number
  max: number
  /** Default when the parameter is absent. */
  fallback: number
  /** An example for the error message, as the person would type it. */
  example: string
}

export const EMI_FIELDS = {
  price: { label: 'Property price', kind: 'rupees', min: 1 * LAKH, max: 100 * 100 * LAKH, fallback: 50 * LAKH, example: '62,50,000' },
  down: { label: 'Down payment', kind: 'rupees', min: 0, max: 100 * 100 * LAKH, fallback: 10 * LAKH, example: '12,50,000' },
  rate: { label: 'Interest rate', kind: 'percent', min: 1, max: 20, fallback: 8.5, example: '8.5' },
  years: { label: 'Loan tenure', kind: 'years', min: 1, max: 30, fallback: 20, example: '20' },
} as const satisfies Record<string, FieldSpec>

export const BUDGET_FIELDS = {
  income: { label: 'Monthly take-home income', kind: 'rupees', min: 5_000, max: 100 * LAKH, fallback: 1 * LAKH, example: '1,00,000' },
  emis: { label: 'Existing EMIs per month', kind: 'rupees', min: 0, max: 100 * LAKH, fallback: 0, example: '15,000' },
  savings: { label: 'Savings for the down payment', kind: 'rupees', min: 0, max: 100 * 100 * LAKH, fallback: 10 * LAKH, example: '10,00,000' },
  rate: EMI_FIELDS.rate,
  years: EMI_FIELDS.years,
  share: { label: 'Share of income for EMIs', kind: 'percent', min: 20, max: 60, fallback: 40, example: '40' },
} as const satisfies Record<string, FieldSpec>

export type EmiKey = keyof typeof EMI_FIELDS
export type BudgetKey = keyof typeof BUDGET_FIELDS

/** Raw text per field: what is in the URL, or what is being typed. */
export type RawValues<K extends string> = Record<K, string>
export type Parsed<K extends string> =
  | { ok: true; values: Record<K, number>; errors: Partial<Record<K, string>> }
  | { ok: false; values: Partial<Record<K, number>>; errors: Partial<Record<K, string>> }

const DECIMAL = /^\d{1,2}(\.\d{1,2})?$/

function parseField(spec: FieldSpec, raw: string): { value?: number; error?: string } {
  const text = raw.trim()
  if (text === '') return { error: `Enter the ${spec.label.toLowerCase()}, for example ${spec.example}` }
  const value = spec.kind === 'rupees'
    ? parseWholeNumber(text.replace(/^₹\s*/, ''))
    : spec.kind === 'percent'
      ? (DECIMAL.test(text.replace(/%$/, '').trim()) ? Number(text.replace(/%$/, '').trim()) : undefined)
      : parseWholeNumber(text)
  if (value === undefined) {
    return { error: spec.kind === 'rupees'
      ? `Enter a whole number of rupees, for example ${spec.example}`
      : `Enter a number, for example ${spec.example}` }
  }
  if (value < spec.min || value > spec.max) return { error: `Enter ${describeRange(spec)}` }
  return { value }
}

function describeRange(spec: FieldSpec): string {
  if (spec.kind === 'rupees') return `an amount from ₹${groupIndian(spec.min)} to ₹${groupIndian(spec.max)}`
  if (spec.kind === 'percent') return `a percentage from ${spec.min} to ${spec.max}`
  return `from ${spec.min} to ${spec.max} years`
}

/** The raw values for a form: the URL's text where given, the default otherwise. */
export function rawFromParams<K extends string>(
  fields: Record<K, FieldSpec>,
  params: Record<string, string | string[] | undefined>,
): RawValues<K> {
  const out = {} as RawValues<K>
  for (const key of Object.keys(fields) as K[]) {
    const given = params[key]
    const text = Array.isArray(given) ? given[0] : given
    if (text === undefined) {
      out[key] = formatForInput(fields[key], fields[key].fallback)
      continue
    }
    // A shared link carries plain digits; show them grouped, as typed.
    const amount = fields[key].kind === 'rupees' ? parseWholeNumber(text) : undefined
    out[key] = amount === undefined ? text : groupIndian(amount)
  }
  return out
}

export function formatForInput(spec: FieldSpec, value: number): string {
  return spec.kind === 'rupees' ? groupIndian(value) : String(value)
}

export function parseFields<K extends string>(fields: Record<K, FieldSpec>, raw: RawValues<K>): Parsed<K> {
  const values: Partial<Record<K, number>> = {}
  const errors: Partial<Record<K, string>> = {}
  for (const key of Object.keys(fields) as K[]) {
    const { value, error } = parseField(fields[key], raw[key] ?? '')
    if (error) errors[key] = error
    else values[key] = value
  }
  if (Object.keys(errors).length) return { ok: false, values, errors }
  return { ok: true, values: values as Record<K, number>, errors }
}

/** EMI: the down payment cannot exceed the price it pays for. */
export function parseEmi(raw: RawValues<EmiKey>): Parsed<EmiKey> {
  const parsed = parseFields(EMI_FIELDS, raw)
  if (parsed.ok && parsed.values.down >= parsed.values.price) {
    return { ok: false, values: parsed.values, errors: { down: 'The down payment must be less than the property price' } }
  }
  return parsed
}

/** Budget: existing EMIs are part of income, never more than it. */
export function parseBudget(raw: RawValues<BudgetKey>): Parsed<BudgetKey> {
  const parsed = parseFields(BUDGET_FIELDS, raw)
  if (parsed.ok && parsed.values.emis >= parsed.values.income) {
    return { ok: false, values: parsed.values, errors: { emis: 'Existing EMIs must be less than your monthly income' } }
  }
  return parsed
}

/**
 * The canonical query string for valid values: plain digits, fixed order.
 * Only what differs from the defaults is kept, so the bare page stays
 * `/calculators/emi` and a shared link carries just what was changed.
 */
export function toQuery<K extends string>(fields: Record<K, FieldSpec>, values: Record<K, number>): string {
  const params = new URLSearchParams()
  for (const key of Object.keys(fields) as K[]) {
    if (values[key] !== fields[key].fallback) params.set(key, String(values[key]))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/**
 * The EMI calculator for one listing: its price, and the smallest down
 * payment the RBI's loan-to-value limits allow on that price — the loan a
 * buyer stretching furthest would need. Both are edited freely on the page.
 */
export function emiCalculatorHref(price: number): string {
  const down = price - maxLoanForPrice(price)
  return `/calculators/emi${toQuery(EMI_FIELDS, { price, down, rate: EMI_FIELDS.rate.fallback, years: EMI_FIELDS.years.fallback })}`
}
