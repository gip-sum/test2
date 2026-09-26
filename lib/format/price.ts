/**
 * Indian price formatting.
 *
 * Every price in the product passes through here. Prices are stored as
 * INTEGER RUPEES — never floats, never paise — so arithmetic is exact.
 */

/** Group digits the Indian way: last three, then pairs. 12500000 → 1,25,00,000 */
export function groupIndian(value: number): string {
  const n = Math.round(Math.abs(value))
  const s = String(n)
  if (s.length <= 3) return s
  const last3 = s.slice(-3)
  const rest = s.slice(0, -3)
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `${grouped},${last3}`
}

/**
 * Trim trailing decimal zeros: 62.50 → 62.5, 1.00 → 1.
 *
 * Only strips AFTER a decimal point — a naive /\.?0+$/ would turn the
 * integer "100" into "1".
 */
function trim(value: number, decimals: number): string {
  return value
    .toFixed(decimals)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
}

const LAKH = 100_000
const CRORE = 10_000_000

/**
 * Compact sale price: ₹85,000 · ₹62.5 L · ₹1.25 Cr
 *
 * Compact notation is what Indian buyers actually read and compare. The
 * exact figure stays available via `formatPriceExact` for the detail page.
 */
export function formatPrice(rupees: number): string {
  if (!Number.isFinite(rupees) || rupees <= 0) return 'Price on request'
  if (rupees >= CRORE) return `₹${trim(rupees / CRORE, 2)} Cr`
  if (rupees >= LAKH) return `₹${trim(rupees / LAKH, 2)} L`
  return `₹${groupIndian(rupees)}`
}

/** Full figure with Indian grouping: ₹1,25,00,000 */
export function formatPriceExact(rupees: number): string {
  if (!Number.isFinite(rupees) || rupees <= 0) return 'Price on request'
  return `₹${groupIndian(rupees)}`
}

/**
 * Monthly rent. Rents are read as whole numbers up to about a lakh, above
 * which the compact form is clearer.
 */
export function formatRent(rupeesPerMonth: number): string {
  if (!Number.isFinite(rupeesPerMonth) || rupeesPerMonth <= 0) return 'Rent on request'
  if (rupeesPerMonth >= LAKH) return `${formatPrice(rupeesPerMonth)}/mo`
  return `₹${groupIndian(rupeesPerMonth)}/mo`
}

/** Rate per unit area, always rounded to whole rupees: ₹5,040 per sqft */
export function formatPricePerArea(rupees: number, area: number, unit = 'sqft'): string | null {
  if (!Number.isFinite(rupees) || !Number.isFinite(area) || rupees <= 0 || area <= 0) return null
  return `₹${groupIndian(rupees / area)} per ${unit}`
}

/**
 * A computed amount, compact like a price but honest about zero: ₹0,
 * ₹43,391, ₹62.5 L. formatPrice reads zero as "Price on request", which
 * is right for a listing and wrong for a calculator's interest at 0%.
 */
export function formatAmount(rupees: number): string {
  if (!Number.isFinite(rupees) || rupees <= 0) return '₹0'
  return formatPrice(rupees)
}
