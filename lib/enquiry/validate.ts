import type { EnquiryFieldError, EnquiryInput } from './types'

/**
 * Validation, separate from the command so it can be unit-tested without a
 * store and reused by the client for immediate feedback.
 *
 * The server calls this too. Client-side validation is a courtesy; this is
 * the boundary, and it is the only one that counts.
 */

export const NAME_MAX = 80
export const MESSAGE_MAX = 1000

/**
 * Indian mobile numbers.
 *
 * Ten digits beginning 6–9, optionally carrying a +91, 91 or leading 0.
 * Spaces, hyphens and brackets are stripped before checking, because people
 * type numbers the way they read them and rejecting "98765 43210" for its
 * space is a self-inflicted lost lead.
 *
 * Landlines are deliberately not accepted: sellers need a mobile number
 * to call the buyer back about an enquiry.
 */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-()./]/g, '')
  const m = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(digits)
  return m ? `+91${m[1]}` : null
}

export function validateEnquiry(input: EnquiryInput): {
  errors: Partial<Record<EnquiryFieldError, string>>
  phone?: string
  name?: string
  message?: string
} {
  const errors: Partial<Record<EnquiryFieldError, string>> = {}

  const name = input.name?.trim() ?? ''
  if (!name) errors.name = 'Enter your name so the seller knows who is asking.'
  else if (name.length > NAME_MAX) errors.name = `Keep your name under ${NAME_MAX} characters.`

  const phone = normalisePhone(input.phone ?? '')
  if (!input.phone?.trim()) errors.phone = 'Enter your mobile number so the seller can reply.'
  else if (!phone) errors.phone = 'Enter a valid 10-digit Indian mobile number.'

  const message = input.message?.trim() || undefined
  if (message && message.length > MESSAGE_MAX) {
    errors.message = `Keep your message under ${MESSAGE_MAX} characters.`
  }

  if (!input.listingPublicId) errors.listing = 'This property could not be identified.'

  return { errors, phone: phone ?? undefined, name: name || undefined, message }
}
