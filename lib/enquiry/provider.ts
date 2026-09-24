import 'server-only'
import { createHmac } from 'node:crypto'
import type { EnquiryHistoryItem, NotificationStatus } from './types'

function validWebhookUrl(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    const local = ['127.0.0.1', 'localhost'].includes(url.hostname)
    const testLocal = local && process.env.SELLER_NOTIFICATION_ALLOW_INSECURE_LOCAL === 'true'
    return url.protocol === 'https:' || testLocal ? url.toString() : null
  } catch { return null }
}

export async function notifySeller(enquiry: EnquiryHistoryItem): Promise<Exclude<NotificationStatus, 'PENDING'>> {
  const url = validWebhookUrl(process.env.SELLER_NOTIFICATION_WEBHOOK_URL)
  const secret = process.env.SELLER_NOTIFICATION_WEBHOOK_SECRET
  if (!url || !secret || secret.length < 16) return 'UNCONFIGURED'
  const body = JSON.stringify({
    event: 'lead.created',
    enquiry: {
      id: enquiry.id,
      propertyPublicId: enquiry.listingPublicId,
      listingTitle: enquiry.listingTitle,
      listingLocality: enquiry.listingLocality,
      sellerType: enquiry.sellerType,
      sellerName: enquiry.sellerName,
      buyerName: enquiry.name,
      buyerPhone: enquiry.phone,
      message: enquiry.message,
      duplicate: Boolean(enquiry.duplicateOf),
      createdAt: enquiry.createdAt,
    },
  })
  const signature = createHmac('sha256', secret).update(body).digest('hex')
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-GharBazaar-Signature': `sha256=${signature}` },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    return response.ok ? 'DELIVERED' : 'FAILED'
  } catch { return 'FAILED' }
}
