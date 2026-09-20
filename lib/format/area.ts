/**
 * Area formatting.
 *
 * Carpet, built-up and super built-up are three distinct legal quantities in
 * India. Conflating them produces a wrong price-per-sqft and destroys trust,
 * so the basis is part of the formatted output and cannot be omitted.
 */

export type AreaBasis = 'carpet' | 'builtup' | 'super'
export type AreaUnit = 'sqft' | 'sqm' | 'sqyd'

const BASIS_LABEL: Record<AreaBasis, string> = {
  carpet: 'carpet',
  builtup: 'built-up',
  super: 'super built-up',
}

const UNIT_LABEL: Record<AreaUnit, string> = {
  sqft: 'sqft',
  sqm: 'sq.m',
  sqyd: 'sq.yd',
}

/** 1240, 'sqft', 'carpet' → "1,240 sqft carpet" */
export function formatArea(value: number, unit: AreaUnit, basis: AreaBasis): string {
  if (!Number.isFinite(value) || value <= 0) return '—'
  const grouped = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
  return `${grouped} ${UNIT_LABEL[unit]} ${BASIS_LABEL[basis]}`
}

/** Compact card form, basis still present: "1,240 sqft (carpet)" */
export function formatAreaCompact(value: number, unit: AreaUnit, basis: AreaBasis): string {
  if (!Number.isFinite(value) || value <= 0) return '—'
  const grouped = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
  return `${grouped} ${UNIT_LABEL[unit]} (${BASIS_LABEL[basis]})`
}

/** "3 BHK · 2 Baths" — omits any part that is missing rather than printing 0. */
export function formatConfiguration(bedrooms?: number | null, bathrooms?: number | null): string {
  const parts: string[] = []
  if (bedrooms && bedrooms > 0) parts.push(`${bedrooms} BHK`)
  if (bathrooms && bathrooms > 0) parts.push(`${bathrooms} ${bathrooms === 1 ? 'Bath' : 'Baths'}`)
  return parts.join(' · ')
}
