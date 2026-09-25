import type { Intent, PropertyTypeCode, SellerType } from '@/lib/property/types'
import { PROPERTY_TYPE_ORDER } from '@/lib/property/types'
import { detailPairs, type DetailInput } from './details'

export type EntryInput = Record<string, string | string[] | undefined>
export type PostingEntry = {
  role?: SellerType
  intent?: Intent
  type?: PropertyTypeCode
  /** The next unanswered entry question; `details` once all three are answered. */
  stage: 'role' | 'intent' | 'type' | 'details'
}

const ROLES: SellerType[] = ['OWNER', 'AGENT', 'BUILDER']
const INTENTS: Intent[] = ['buy', 'rent']

function choice<T extends string>(value: EntryInput[string], values: readonly T[]): T | undefined {
  // Arrays mean duplicate parameters. Do not silently select one of them.
  if (typeof value !== 'string' || value.length > 30) return undefined
  return values.find((item) => item === value)
}

export function parsePostingEntry(input: EntryInput): PostingEntry {
  const role = choice(input.role, ROLES)
  if (!role) return { stage: 'role' }
  const intent = choice(input.intent, INTENTS)
  if (!intent) return { role, stage: 'intent' }
  const type = choice(input.type, PROPERTY_TYPE_ORDER)
  if (!type) return { role, intent, stage: 'type' }
  return { role, intent, type, stage: 'details' }
}

/**
 * Only typed, supported values are ever included in a link.
 *
 * `details` are the Phase 12 facts carried alongside: changing an earlier
 * answer keeps what the seller typed instead of discarding a whole form.
 * `edit` opens the details form filled in rather than validating it.
 */
export function postingUrl(
  entry: Pick<PostingEntry, 'role' | 'intent' | 'type'>,
  options: { details?: DetailInput; edit?: boolean } = {},
): string {
  const params = new URLSearchParams()
  if (entry.role) params.set('role', entry.role)
  if (entry.role && entry.intent) params.set('intent', entry.intent)
  if (entry.role && entry.intent && entry.type) params.set('type', entry.type)
  const pairs = options.details ? detailPairs(options.details) : []
  for (const [key, value] of pairs) params.append(key, value)
  if (options.edit && pairs.length > 0) params.set('edit', '1')
  const query = params.toString()
  return query ? `/post?${query}` : '/post'
}

export function isCanonicalInput(input: EntryInput, canonicalUrl: string): boolean {
  // URLSearchParams preserves insertion order and duplicate values here;
  // a canonical redirect drops unknown values without displaying them.
  const received = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) value.forEach((item) => received.append(key, item))
    else if (typeof value === 'string') received.append(key, value)
  }
  const canonical = canonicalUrl.split('?')[1] ?? ''
  return received.toString() === canonical
}

export function isCanonicalEntryInput(input: EntryInput, entry: PostingEntry): boolean {
  return isCanonicalInput(input, postingUrl(entry))
}
