/**
 * An enquiry: a buyer asking a seller about one listing.
 *
 * The marketplace's unit of value. Everything on the buyer side exists to
 * produce one of these, and everything on the seller side exists to act on
 * one.
 *
 * Deliberately NOT here: lead status, assignment, follow-ups, read state,
 * seller notes, contact-reveal history. Those are Phase 9 (lead system),
 * Phase 10 (phone reveal) and Phase 68 (advanced lead management). Adding a
 * status column now, before anything can move a lead between states, would
 * be a field nobody writes and everybody has to reason about.
 */
export type EnquirySource = 'property_page'
export type LeadStatus = 'NEW' | 'CONTACTED' | 'CLOSED'
export type NotificationStatus = 'PENDING' | 'DELIVERED' | 'FAILED' | 'UNCONFIGURED'

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
  status: LeadStatus
  notificationStatus: NotificationStatus
  duplicateOf?: string
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
  | { ok: true; enquiry: Enquiry; duplicate: boolean; hasHistory: boolean }
  | { ok: false; errors: Partial<Record<EnquiryFieldError, string>>; unavailable?: boolean }

export type EnquiryHistoryItem = Enquiry & {
  listingTitle: string
  listingLocality: string
  sellerType: 'OWNER' | 'AGENT' | 'BUILDER'
  sellerName?: string
}
