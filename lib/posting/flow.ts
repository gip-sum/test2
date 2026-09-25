import type { Intent, PropertyTypeCode, SellerType } from '@/lib/property/types'
import {
  factsToInput,
  hasDetails,
  readDetailInput,
  restrictDetails,
  validateDetails,
  type DetailErrors,
  type DetailInput,
  type PropertyFacts,
} from './details'
import { parsePostingEntry, postingUrl, type EntryInput, type PostingEntry } from './entry'

export type CompleteEntry = { role: SellerType; intent: Intent; type: PropertyTypeCode }

/**
 * Everything `/post` can show, decided from the URL alone.
 *
 * `carried` is always the detail values that links on this view should
 * keep, so no view has to know how the others built theirs.
 */
export type PostingView =
  | { stage: 'role' | 'intent' | 'type'; entry: PostingEntry; carried: DetailInput }
  | { stage: 'details'; entry: CompleteEntry; values: DetailInput; errors: DetailErrors; carried: DetailInput }
  | { stage: 'review'; entry: CompleteEntry; facts: PropertyFacts; carried: DetailInput }

export type ResolvedPosting = { view: PostingView; canonicalUrl: string }

/**
 * Stage and canonical link for a request.
 *
 * - No detail parameters: an empty form.
 * - `edit=1`: the form filled in, not yet judged.
 * - Otherwise detail parameters are a submission. A valid one canonicalises
 *   to its normalised review link; an invalid one keeps what was typed
 *   (dropping only what cannot apply) so the seller corrects rather than
 *   retypes. Redirecting an invalid submission to an empty form would be
 *   the cheapest code and the worst experience.
 */
export function resolvePosting(input: EntryInput, today: string): ResolvedPosting {
  const entry = parsePostingEntry(input)
  const raw = readDetailInput(input)

  if (entry.stage !== 'details' || !entry.role || !entry.intent || !entry.type) {
    // Type unknown, so applicability is unknown: carry every recognised value.
    return { view: { stage: entry.stage as 'role' | 'intent' | 'type', entry, carried: raw }, canonicalUrl: postingUrl(entry, { details: raw }) }
  }

  const complete: CompleteEntry = { role: entry.role, intent: entry.intent, type: entry.type }
  const values = restrictDetails(raw, complete)
  if (!hasDetails(values)) {
    return { view: { stage: 'details', entry: complete, values: {}, errors: {}, carried: {} }, canonicalUrl: postingUrl(complete) }
  }
  if (input.edit === '1') {
    return {
      view: { stage: 'details', entry: complete, values, errors: {}, carried: values },
      canonicalUrl: postingUrl(complete, { details: values, edit: true }),
    }
  }
  const result = validateDetails(values, complete, today)
  if (!result.ok) {
    return {
      view: { stage: 'details', entry: complete, values, errors: result.errors, carried: values },
      canonicalUrl: postingUrl(complete, { details: values }),
    }
  }
  const carried = factsToInput(result.facts)
  return {
    view: { stage: 'review', entry: complete, facts: result.facts, carried },
    canonicalUrl: postingUrl(complete, { details: carried }),
  }
}
