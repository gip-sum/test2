'use server'

import { createEnquiry } from '@/lib/enquiry/commands'
import type { EnquiryFieldError } from '@/lib/enquiry/types'

/**
 * The enquiry submission.
 *
 * A server action rather than a fetch handler, so the form is a real form:
 * it submits and works with JavaScript disabled or still loading, which is
 * the state a meaningful share of this product's traffic will actually be
 * in on a phone on a slow connection. The client only adds pending state
 * and inline errors on top of something that already works.
 *
 * SERVER-SIDE VALIDATION IS THE BOUNDARY. `createEnquiry` validates again
 * regardless of what the client did; client validation is a courtesy.
 *
 * Everything typed is returned on failure. Losing a message someone spent
 * two minutes writing because their phone number had a stray space is how
 * a marketplace loses a lead it had already won.
 */
export type EnquiryFormState = {
  status: 'idle' | 'success' | 'error'
  errors?: Partial<Record<EnquiryFieldError, string>>
  /** True when this number has already enquired about this listing. */
  duplicate?: boolean
  /** Echoed back so a failed submit does not clear the form. */
  values?: { name: string; phone: string; message: string }
}

export async function submitEnquiry(
  _previous: EnquiryFormState,
  formData: FormData,
): Promise<EnquiryFormState> {
  const values = {
    name: String(formData.get('name') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    message: String(formData.get('message') ?? ''),
  }
  const listingPublicId = String(formData.get('listingPublicId') ?? '')

  const result = createEnquiry({
    listingPublicId,
    name: values.name,
    phone: values.phone,
    message: values.message,
  })

  if (!result.ok) {
    return { status: 'error', errors: result.errors, values }
  }
  return { status: 'success', duplicate: result.duplicate }
}
