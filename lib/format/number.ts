/**
 * Parsing numbers the way people type them in India.
 *
 * Plain digits, or digits grouped the Indian way (1,24,000) or the
 * international way (124,000). Anything else — "12,34,5", "1.5", "-3",
 * "1e3" — is a typing mistake we should point out, not guess at.
 */
const PLAIN = /^\d+$/
const INDIAN = /^\d{1,2}(,\d{2})*,\d{3}$/
const INTERNATIONAL = /^\d{1,3}(,\d{3})+$/

export function parseWholeNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!PLAIN.test(trimmed) && !INDIAN.test(trimmed) && !INTERNATIONAL.test(trimmed)) return undefined
  const parsed = Number(trimmed.replaceAll(',', ''))
  return Number.isSafeInteger(parsed) ? parsed : undefined
}
