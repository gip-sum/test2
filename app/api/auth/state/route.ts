import { NextResponse } from 'next/server'
import { getVerifiedUser } from '@/lib/auth/session'

export async function GET() {
  const user = await getVerifiedUser()
  return NextResponse.json({ authenticated: Boolean(user) }, { headers: { 'Cache-Control': 'private, no-store' } })
}
