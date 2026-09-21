import { NextResponse, type NextRequest } from 'next/server'
import { KOLKATA_LOCATIONS } from '@/lib/location/kolkata'

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
  matcher: ['/buy/:path+', '/rent/:path+'],
}

export function middleware(request: NextRequest) {
  const [, , city] = request.nextUrl.pathname.split('/')
  if (city && !CITY_SLUGS.has(city)) {
    return NextResponse.rewrite(new URL('/_gharbazaar_not_found', request.url))
  }
  return NextResponse.next()
}
