import { NextResponse, type NextRequest } from 'next/server'
import { authConfig } from '@/lib/auth/provider'
import { authSiteOrigin, googleAuthorizeUrl, googleChallenge, OAUTH_RETURN_COOKIE, OAUTH_VERIFIER_COOKIE, oauthCookieOptions } from '@/lib/auth/google'
import { safeReturnPath } from '@/lib/auth/validation'

export function GET(request: NextRequest) {
  const config = authConfig()
  const origin = authSiteOrigin()
  if (!config || !origin) return NextResponse.redirect(new URL('/login?error=google', request.url))
  const { verifier, challenge } = googleChallenge()
  const returnPath = safeReturnPath(request.nextUrl.searchParams.get('next'))
  const response = NextResponse.redirect(googleAuthorizeUrl(config.base, origin, challenge))
  response.cookies.set(OAUTH_VERIFIER_COOKIE, verifier, oauthCookieOptions)
  response.cookies.set(OAUTH_RETURN_COOKIE, returnPath, oauthCookieOptions)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
