import { getPropertyDetail } from '@/lib/property/queries'
import type { AuthUser } from '@/lib/auth/provider'
import { validateEnquiry } from './validate'
import { insertEnquiry, setNotificationStatus } from './queries'
import { notifySeller } from './provider'
import type { EnquiryInput, EnquiryResult } from './types'

/** Validate, persist and attempt delivery without ever sacrificing a valid lead to notification failure. */
export async function createEnquiry(input: EnquiryInput, buyer: AuthUser | null): Promise<EnquiryResult> {
  const { errors, phone, name, message } = validateEnquiry(input)
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  const listing = getPropertyDetail(input.listingPublicId)
  if (!listing) return { ok: false, errors: { listing: 'This property is no longer available.' } }

  const notificationConfigured = Boolean(process.env.SELLER_NOTIFICATION_WEBHOOK_URL && process.env.SELLER_NOTIFICATION_WEBHOOK_SECRET)
  const enquiry = await insertEnquiry({
    buyer_id: buyer?.id ?? null,
    property_public_id: listing.publicId,
    listing_title: listing.society ?? listing.title,
    listing_locality: `${listing.localityName}, ${listing.cityName}`,
    seller_type: listing.sellerType,
    seller_name: listing.sellerName ?? null,
    buyer_name: name!,
    buyer_phone: phone!,
    message: message ?? null,
    source: 'property_page',
    notification_status: notificationConfigured ? 'PENDING' : 'UNCONFIGURED',
  })
  if (!enquiry) return { ok: false, errors: { listing: 'Enquiries are temporarily unavailable. Please try again.' }, unavailable: true }

  const notificationStatus = await notifySeller(enquiry)
  if (notificationStatus !== enquiry.notificationStatus) await setNotificationStatus(enquiry.id, notificationStatus)
  return {
    ok: true,
    enquiry: { ...enquiry, notificationStatus },
    duplicate: Boolean(enquiry.duplicateOf),
    hasHistory: Boolean(buyer),
  }
}
