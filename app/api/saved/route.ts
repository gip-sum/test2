import { NextResponse, type NextRequest } from 'next/server'
import { getVerifiedUser } from '@/lib/auth/session'
import { listSaved, setSaved } from '@/lib/saved/queries'
import { getPropertyDetail } from '@/lib/property/queries'

const headers = { 'Cache-Control': 'private, no-store' }

export async function GET() {
  const user = await getVerifiedUser()
  if (!user) return NextResponse.json({ error: 'Sign in to save properties' }, { status: 401, headers })
  const result = await listSaved(user)
  if (!result.ok) return NextResponse.json({ error: 'Saved properties are temporarily unavailable' }, { status: 503, headers })
  return NextResponse.json({ ids: result.rows.map((row) => row.property_public_id) }, { headers })
}

async function mutate(request: NextRequest, save: boolean) {
  const user = await getVerifiedUser()
  if (!user) return NextResponse.json({ error: 'Sign in to save properties' }, { status: 401, headers })
  let publicId: unknown
  try { publicId = (await request.json()).publicId } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers }) }
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
