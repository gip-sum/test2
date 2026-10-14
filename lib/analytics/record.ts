import 'server-only'
import { authConfig } from '@/lib/auth/provider'

/**
 * Records one listing view through the service-only database function.
 *
 * Never throws and never reports why a view was not counted: the caller
 * answers every beacon the same way, so a beacon cannot be used to learn
 * whether a listing exists, is public, or belongs to the viewer.
 */
export async function recordListingView(listingId: string, visitorKey: string, viewerId: string | null): Promise<void> {
  const config = authConfig(), secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!config || !secret) return
  try {
    await fetch(config.base.replace(/\/auth\/v1$/, '') + '/rest/v1/rpc/record_listing_view', {
      method: 'POST',
      // Modern secret keys go in apikey only; a legacy JWT key is also a bearer token.
      headers: { apikey: secret, ...(secret.startsWith('sb_') ? {} : { Authorization: `Bearer ${secret}` }), 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_listing: listingId, p_visitor_key: visitorKey, p_viewer: viewerId }),
      cache: 'no-store', signal: AbortSignal.timeout(5000),
    })
  } catch { /* An uncounted view is the correct failure. */ }
}
