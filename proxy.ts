import { NextResponse, type NextRequest } from 'next/server'
import { KOLKATA_LOCATIONS } from '@/lib/location/kolkata'
import { DEMO_SUMMARIES } from '@/lib/property/demo-data'
import { parsePropertyHandle, propertyPath } from '@/lib/property/public-id'
import { authConfig, authRequest, validSession, type AuthSession, type AuthUser } from '@/lib/auth/provider'
import { safeReturnPath } from '@/lib/auth/validation'
import { cookieOptions } from '@/lib/auth/cookies'

/**
 * Validates the shape of a results URL before the route renders.
 *
 * This exists for one reason: status codes. The results route has a
 * loading.tsx, which puts a Suspense boundary at the segment, so Next
 * flushes the shell — and with it a 200 — before the page component ever
 * runs. By the time notFound() is called the status is already on the
 * wire, and the visitor gets a 404 page served as "200 OK". A crawler
 * indexes that as a real page, and uptime monitoring never sees the
 * failure. Deciding here, ahead of rendering, is the only place the status
 * can still be set.
 *
 * Rewriting to a path that matches no route hands the request back to
 * Next's own not-found handling, which renders app/not-found.tsx with a
 * genuine 404. That keeps the branded page and the correct status without
 * a second copy of the 404 UI living in middleware.
 */
const CITY_SLUGS = new Set(KOLKATA_LOCATIONS.filter((l) => l.type === 'CITY').map((l) => l.slug))

/**
 * Scoped to the two routes that take a city. Intent needs no check any
 * more — /nope/kolkata matches no route at all now that buy and rent are
 * literal segments, so Next 404s it without help.
 */
export const config = {
  matcher: ['/buy/:path+', '/rent/:path+', '/property/:handle', '/account/:path*', '/dashboard/:path*', '/login', '/api/auth/state'],
}

/**
 * Canonical slugs, by public id.
 *
 * Phase 19 replaces this map with a lookup; the shape of the decision does
 * not change.
 */
const CANONICAL_SLUG = new Map(DEMO_SUMMARIES.map((p) => [p.publicId, p.slug]))

/**
 * A property URL carries its own identity and its own decoration, and the
 * two can disagree: the slug changes when a listing is edited, and links
 * shared before that keep the old one.
 *
 * Deciding here keeps route identity separate from streamed rendering.
 * A future loading boundary must not turn a moved or missing listing into
 * a shell with a 200 status line.
 *
 * 301 rather than 308 because §5 asks for 301, and because a permanent
 * redirect that is allowed to become a GET is exactly what is wanted for a
 * shared link.
 */
function handleProperty(request: NextRequest): NextResponse | undefined {
  const handle = request.nextUrl.pathname.split('/')[2]
  if (!handle) return NextResponse.rewrite(new URL('/_gharbazaar_not_found', request.url))

  const parsed = parsePropertyHandle(decodeURIComponent(handle))
  if (!parsed) return NextResponse.rewrite(new URL('/_gharbazaar_not_found', request.url))

  const canonicalSlug = CANONICAL_SLUG.get(parsed.publicId)
  if (!canonicalSlug) return NextResponse.rewrite(new URL('/_gharbazaar_not_found', request.url))

  if (parsed.slug !== canonicalSlug || parsed.legacy) {
    const target = new URL(propertyPath(canonicalSlug, parsed.publicId), request.url)
    target.search = request.nextUrl.search
    return NextResponse.redirect(target, 301)
  }
  return undefined
}

async function accountGuard(request: NextRequest) {
  const isAccount = request.nextUrl.pathname.startsWith('/account') || request.nextUrl.pathname.startsWith('/dashboard')
  const access = request.cookies.get('gb-access')?.value
  const refresh = request.cookies.get('gb-refresh')?.value
  let verified = false
  let nextSession: AuthSession | null = null
  if (authConfig() && access) {
    const user = await authRequest<AuthUser>('/user', 'GET', undefined, access)
    verified = user.ok && typeof user.data?.id === 'string'
  }
  if (!verified && authConfig() && refresh) {
    const result = await authRequest<AuthSession>('/token?grant_type=refresh_token', 'POST', { refresh_token: refresh })
    if (result.ok && validSession(result.data)) {
      nextSession = result.data
      verified = true
      request.cookies.set('gb-access', nextSession.access_token)
      request.cookies.set('gb-refresh', nextSession.refresh_token)
    }
  }
  const response = isAccount && !verified
    ? NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(safeReturnPath(request.nextUrl.pathname + request.nextUrl.search))}`, request.url))
    : NextResponse.next({ request })
  if (nextSession) {
    // The same attributes sign-in uses, so a refresh replaces the session
    // cookies rather than adding second copies logout cannot clear.
    response.cookies.set('gb-access', nextSession.access_token, { ...cookieOptions, maxAge: Math.min(nextSession.expires_in, 3600) })
    response.cookies.set('gb-refresh', nextSession.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 })
    response.headers.set('Cache-Control', 'private, no-store')
  }
  return response
}

export async function proxy(request: NextRequest) {
  const [, first, second] = request.nextUrl.pathname.split('/')

  if (first === 'account' || first === 'dashboard' || first === 'login' || request.nextUrl.pathname === '/api/auth/state') return accountGuard(request)

  if (first === 'property') {
    return handleProperty(request) ?? NextResponse.next()
  }

  if (second && !CITY_SLUGS.has(second)) {
    return NextResponse.rewrite(new URL('/_gharbazaar_not_found', request.url))
  }
  return NextResponse.next()
}
