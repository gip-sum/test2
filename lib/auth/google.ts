import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { authConfig } from './provider'
import { GOOGLE_ERROR } from './messages'

export const OAUTH_VERIFIER_COOKIE = 'gb-google-verifier'
export const OAUTH_RETURN_COOKIE = 'gb-google-return'
export const oauthCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production' && process.env.AUTH_SITE_URL?.startsWith('https:') === true,
  path: '/',
  maxAge: 60 * 10,
}

/** A fixed origin avoids trusting a forwarded Host header for OAuth redirects. */
export function authSiteOrigin(): string | null {
  const raw = process.env.AUTH_SITE_URL
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return null
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null
    return url.origin
  } catch { return null }
}

export function googleAvailable(): boolean {
  return Boolean(authConfig() && authSiteOrigin())
}

export function googleChallenge() {
  const verifier = randomBytes(32).toString('base64url')
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') }
}

export function googleAuthorizeUrl(base: string, origin: string, challenge: string): string {
  const url = new URL(base + '/authorize')
  url.searchParams.set('provider', 'google')
  url.searchParams.set('redirect_to', origin + '/api/auth/google/callback')
  url.searchParams.set('scopes', 'email profile')
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 's256')
  return url.toString()
}

/**
 * Where a failed or cancelled Google attempt lands: back on /login with
 * what went wrong and, when it was not the default, the page the visitor
 * was heading for, so "try again" still ends up there. `returnPath` has
 * already been through safeReturnPath.
 */
export function googleErrorPath(kind: keyof typeof GOOGLE_ERROR, returnPath: string): string {
  const params = new URLSearchParams({ error: GOOGLE_ERROR[kind] })
  if (returnPath !== '/account') params.set('next', returnPath)
  return `/login?${params}`
}
