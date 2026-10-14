import { NextResponse, type NextRequest } from 'next/server'
import { getVerifiedUser } from '@/lib/auth/session'
import { listSaved, listSavedListings, setSaved, setSavedListing } from '@/lib/saved/queries'
import { getPropertyDetail } from '@/lib/property/queries'

const headers = { 'Cache-Control': 'private, no-store' }

/**
 * Saved properties for the heart controls. Two identities share one list:
 * demo fixtures (`p_…`, Phase 8) and real listings (UUIDs, Phase 20). The
 * formats cannot collide, so the client keeps one set of ids.
 */
export async function GET() {
  const user = await getVerifiedUser()
  if (!user) return NextResponse.json({ error: 'Sign in to save properties' }, { status: 401, headers })
  const [demo, listings] = await Promise.all([listSaved(user), listSavedListings(user)])
  // Before the Phase 20 migration nothing can have been saved, so a missing
  // table is an empty list; any other failure is a failure.
  if (!demo.ok || (!listings.ok && !listings.missing)) return NextResponse.json({ error: 'Saved properties are temporarily unavailable' }, { status: 503, headers })
  return NextResponse.json({ ids: [...demo.rows.map((row) => row.property_public_id), ...(listings.ok ? listings.rows.map((row) => row.listing_id) : [])] }, { headers })
}

async function mutate(request: NextRequest, save: boolean) {
  const user = await getVerifiedUser()
  if (!user) return NextResponse.json({ error: 'Sign in to save properties' }, { status: 401, headers })
  let body: { publicId?: unknown; listingId?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers }) }
  if (typeof body?.listingId === 'string') {
    const result = await setSavedListing(user, body.listingId, save)
    if (result === 'ok') return NextResponse.json({ saved: save }, { headers })
    const [status, error] = result === 'unavailable' ? [404, 'This listing is no longer available'] : result === 'own' ? [403, 'You cannot save your own listing'] : result === 'limit' ? [429, 'You have saved the maximum number of listings'] : [503, 'Could not update saved properties']
    return NextResponse.json({ error }, { status, headers })
  }
  const publicId = body?.publicId
  if (typeof publicId !== 'string' || !/^p_[a-z0-9]{1,32}$/.test(publicId) || (save && !getPropertyDetail(publicId))) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404, headers })
  }
  if (!await setSaved(user, publicId, save)) {
    return NextResponse.json({ error: 'Could not update saved properties' }, { status: 503, headers })
  }
  return NextResponse.json({ saved: save }, { headers })
}

export async function POST(request: NextRequest) { return mutate(request, true) }
export async function DELETE(request: NextRequest) { return mutate(request, false) }
