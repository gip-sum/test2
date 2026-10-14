import { NextResponse, type NextRequest } from 'next/server'
import { getVerifiedUser } from '@/lib/auth/session'
import { recordListingView } from '@/lib/analytics/record'
import { isAutomated, visitorKey, VISITOR_COOKIE, VISITOR_ID } from '@/lib/analytics/views'
import { UUID } from '@/lib/media/types'
import { kolkataToday } from '@/lib/posting/details'

export const runtime = 'nodejs'

/**
 * The view beacon (Phase 20). Every request gets the same empty 204,
 * counted or not. The owner is excluded in the database using the verified
 * account id from here, never anything the browser claims.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const visitor = request.cookies.get(VISITOR_COOKIE)?.value
  if (UUID.test(id) && request.headers.get('origin') === request.nextUrl.origin && !isAutomated(request.headers.get('user-agent')) && visitor && VISITOR_ID.test(visitor)) {
    const user = await getVerifiedUser()
    await recordListingView(id, visitorKey(visitor, id, kolkataToday()), user?.id ?? null)
  }
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}
