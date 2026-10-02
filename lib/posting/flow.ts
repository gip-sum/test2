import { readPricingInput, restrictPricing, validatePricing, type PricingInput, type PricingErrors, type PropertyPricing } from './pricing'
import { getPostingLocations } from '@/lib/location/queries'
import type { Location } from '@/lib/location/types'
import { readLocationInput, validateLocation, type LocationInput, type LocationErrors, type PropertyLocation } from './location'
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
export type PostingView = { locationCarried: LocationInput; pricingCarried: PricingInput } & (
  | { stage: 'role' | 'intent' | 'type'; entry: PostingEntry; carried: DetailInput }
  | { stage: 'details'; entry: CompleteEntry; values: DetailInput; errors: DetailErrors; carried: DetailInput }
  | { stage: 'review'; entry: CompleteEntry; facts: PropertyFacts; carried: DetailInput }
  | { stage: 'location'; entry: CompleteEntry; facts: PropertyFacts; carried: DetailInput; values: LocationInput; errors: LocationErrors }
  | { stage: 'pricing'; entry: CompleteEntry; facts: PropertyFacts; carried: DetailInput; location: PropertyLocation; values: PricingInput; errors: PricingErrors }
  | { stage: 'pricing-review'; entry: CompleteEntry; facts: PropertyFacts; carried: DetailInput; location: PropertyLocation; pricing: PropertyPricing }
  | { stage: 'location-review'; entry: CompleteEntry; facts: PropertyFacts; carried: DetailInput; location: PropertyLocation }
)

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
export function resolvePosting(input: EntryInput, today: string, places: readonly Location[] = getPostingLocations()): ResolvedPosting {
  const entry = parsePostingEntry(input)
  const raw = readDetailInput(input)
  const pricingCarried = entry.intent ? restrictPricing(readPricingInput(input), entry.intent) : readPricingInput(input)
  const locationCarried = readLocationInput(input)

  if (entry.stage !== 'details' || !entry.role || !entry.intent || !entry.type) {
    // Type unknown, so applicability is unknown: carry every recognised value.
    return { view: { pricingCarried, locationCarried, stage: entry.stage as 'role' | 'intent' | 'type', entry, carried: raw }, canonicalUrl: postingUrl(entry, { details: raw, pricing: pricingCarried, location: locationCarried }) }
  }

  const complete: CompleteEntry = { role: entry.role, intent: entry.intent, type: entry.type }
  const values = restrictDetails(raw, complete)
  if (!hasDetails(values)) {
    return { view: { pricingCarried, locationCarried, stage: 'details', entry: complete, values: {}, errors: {}, carried: {} }, canonicalUrl: postingUrl(complete, { pricing: pricingCarried, location: locationCarried }) }
  }
  if (input.edit === '1') {
    return {
      view: { pricingCarried, locationCarried, stage: 'details', entry: complete, values, errors: {}, carried: values },
      canonicalUrl: postingUrl(complete, { details: values, edit: true, pricing: pricingCarried, location: locationCarried }),
    }
  }
  const result = validateDetails(values, complete, today)
  if (!result.ok) {
    return {
      view: { pricingCarried, locationCarried, stage: 'details', entry: complete, values, errors: result.errors, carried: values },
      canonicalUrl: postingUrl(complete, { details: values, pricing: pricingCarried, location: locationCarried }),
    }
  }
  const carried = factsToInput(result.facts)
  if (input.step === 'location' || input.step === 'location-review' || input.step === 'pricing' || input.step === 'pricing-review') {
    const submitted = input.step !== 'location'
    const locationResult = submitted ? validateLocation(locationCarried, places) : undefined
    if (locationResult?.ok) {
      if (input.step === 'pricing' || input.step === 'pricing-review') {
        const pricingResult = input.step === 'pricing-review' ? validatePricing(pricingCarried, complete.intent) : undefined
        const shared = { entry: complete, facts: result.facts, carried, locationCarried: locationResult.values, location: locationResult.location }
        if (pricingResult?.ok) return {
          view: { ...shared, stage: 'pricing-review', pricingCarried: pricingResult.values, pricing: pricingResult.pricing },
          canonicalUrl: postingUrl(complete, { details: carried, location: locationResult.values, pricing: pricingResult.values, step: 'pricing-review' }),
        }
        return {
          view: { ...shared, stage: 'pricing', pricingCarried, values: pricingCarried, errors: pricingResult && !pricingResult.ok ? pricingResult.errors : {} },
          canonicalUrl: postingUrl(complete, { details: carried, location: locationResult.values, pricing: pricingCarried, step: input.step }),
        }
      }
      return {
        view: { pricingCarried, stage: 'location-review', entry: complete, facts: result.facts, carried, locationCarried: locationResult.values, location: locationResult.location },
        canonicalUrl: postingUrl(complete, { details: carried, pricing: pricingCarried, location: locationResult.values, step: 'location-review' }),
      }
    }
    return {
      view: { pricingCarried, stage: 'location', entry: complete, facts: result.facts, carried, locationCarried, values: locationCarried, errors: locationResult && !locationResult.ok ? locationResult.errors : {} },
      canonicalUrl: postingUrl(complete, { details: carried, pricing: pricingCarried, location: locationCarried, step: submitted ? 'location-review' : 'location' }),
    }
  }
  return {
    view: { pricingCarried, locationCarried, stage: 'review', entry: complete, facts: result.facts, carried },
    canonicalUrl: postingUrl(complete, { details: carried, pricing: pricingCarried, location: locationCarried }),
  }
}
