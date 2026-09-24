/**
 * An enquiry: a buyer asking a seller about one listing.
 *
 * The marketplace's unit of value. Everything on the buyer side exists to
 * produce one of these, and everything on the seller side exists to act on
 * one.
 *
 * The original Phase 4 development fixture type. Persistent lead state and
 * its history live in `queries.ts` and the Phase 9 database schema.
 */
export type EnquirySource = 'property_page'

export type Enquiry = {
  id: string
  listingId: string
  /** The listing's public id, so a seller-side view can link without a join. */
  listingPublicId: string
  name: string
  /** Normalised to +91XXXXXXXXXX. Never stored as typed. */
  phone: string
  message?: string
  createdAt: string
  source: EnquirySource
}

export type EnquiryInput = {
  listingPublicId: string
  name: string
  phone: string
  message?: string
}

/** Field-level failures, keyed so a form can attach each to its input. */
export type EnquiryFieldError = 'name' | 'phone' | 'message' | 'listing'

export type EnquiryResult =
  | { ok: true; enquiry: Enquiry; duplicate: boolean }
  | { ok: false; errors: Partial<Record<EnquiryFieldError, string>> }
