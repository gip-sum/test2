import { getPropertyDetail } from '@/lib/property/queries'
import { validateEnquiry } from './validate'
import type { Enquiry, EnquiryInput, EnquiryResult } from './types'

/**
 * Enquiry writes.
 *
 * The only module that knows where enquiries are stored — the same seam
 * `lib/property/queries.ts` uses for listings. Today that is a
 * process-local array; Phase 19 swaps it for a table and Phase 9 extends
 * this module with lead state. Neither touches a component.
 *
 * The store is module-scoped and therefore per-process and non-durable.
 * That is correct for a phase with no database, and it is stated plainly
 * in the interface rather than implied to be permanent.
 */
const STORE: Enquiry[] = []

let counter = 0
function nextId(): string {
  counter += 1
  return `enq_${Date.now().toString(36)}${counter.toString(36)}`
}

/**
 * Records an enquiry.
 *
 * A repeat enquiry from the same number about the same listing is NOT
 * rejected and NOT silently dropped — it is recorded and flagged. A buyer
 * asking twice usually means the first attempt went unanswered, and a
 * marketplace that swallows the second one is choosing the seller's
 * convenience over the buyer's. Phase 9 decides what a seller sees; this
 * phase only has to avoid losing anything.
 */
export function createEnquiry(input: EnquiryInput): EnquiryResult {
  const { errors, phone, name, message } = validateEnquiry(input)
  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const listing = getPropertyDetail(input.listingPublicId)
  if (!listing) {
    return { ok: false, errors: { listing: 'This property is no longer available.' } }
  }

  const duplicate = STORE.some(
    (e) => e.listingPublicId === listing.publicId && e.phone === phone,
  )

  const enquiry: Enquiry = {
    id: nextId(),
    listingId: listing.id,
    listingPublicId: listing.publicId,
    name: name!,
    phone: phone!,
    message,
    createdAt: new Date().toISOString(),
    source: 'property_page',
  }
  STORE.push(enquiry)
  return { ok: true, enquiry, duplicate }
}

/** Reads, for verification and for the Phase 9 seller views that follow. */
export function getEnquiriesForListing(listingPublicId: string): Enquiry[] {
  return STORE.filter((e) => e.listingPublicId === listingPublicId)
}

export function countEnquiries(): number {
  return STORE.length
}

/** Test-only: the store outlives a single test file otherwise. */
export function __resetEnquiries(): void {
  STORE.length = 0
}
