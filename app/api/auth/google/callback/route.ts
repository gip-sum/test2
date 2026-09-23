import { NextResponse, type NextRequest } from 'next/server'
import { authRequest, validSession, type AuthSession } from '@/lib/auth/provider'
import { authSiteOrigin, OAUTH_RETURN_COOKIE, OAUTH_VERIFIER_COOKIE } from '@/lib/auth/google'
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions } from '@/lib/auth/session'
import { safeReturnPath } from '@/lib/auth/validation'

export async function GET(request: NextRequest) {
  const origin = authSiteOrigin() ?? request.nextUrl.origin
  const code = request.nextUrl.searchParams.get('code')
  const verifier = request.cookies.get(OAUTH_VERIFIER_COOKIE)?.value
  const returnPath = safeReturnPath(request.cookies.get(OAUTH_RETURN_COOKIE)?.value)
  // Consume the verifier even on failure. An intercepted callback or replay
  // cannot complete a later login attempt in this browser.
  let session: AuthSession | null = null
  if (origin === request.nextUrl.origin && code && code.length <= 2048 && verifier && /^[\w-]{40,128}$/.test(verifier)) {
    const result = await authRequest<AuthSession>('/token?grant_type=pkce', 'POST', { auth_code: code, code_verifier: verifier })
    if (result.ok && validSession(result.data)) session = result.data
  }
  const response = NextResponse.redirect(new URL(session ? returnPath : '/login?error=google', origin))
  response.cookies.delete(OAUTH_VERIFIER_COOKIE)
  response.cookies.delete(OAUTH_RETURN_COOKIE)
  if (session) {
    response.cookies.set(ACCESS_COOKIE, session.access_token, { ...cookieOptions, maxAge: Math.max(60, Math.min(session.expires_in, 3600)) })
    response.cookies.set(REFRESH_COOKIE, session.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 })
  }
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
