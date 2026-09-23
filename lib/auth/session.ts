import 'server-only'
import { cookies } from 'next/headers'
import { authRequest, validUser, type AuthUser, type AuthSession } from './provider'

export const ACCESS_COOKIE = 'gb-access'
export const REFRESH_COOKIE = 'gb-refresh'
export const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' }

export async function setSession(session: AuthSession) {
  const jar = await cookies()
  jar.set(ACCESS_COOKIE, session.access_token, { ...cookieOptions, maxAge: Math.max(60, Math.min(session.expires_in, 3600)) })
  jar.set(REFRESH_COOKIE, session.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 })
}

export async function clearSession() {
  const jar = await cookies()
  jar.delete(ACCESS_COOKIE)
  jar.delete(REFRESH_COOKIE)
}

/** Always ask the provider: client-controlled cookies alone never confer identity. */
export async function getVerifiedUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!token) return null
  const response = await authRequest<AuthUser>('/user', 'GET', undefined, token)
  return response.ok && validUser(response.data) ? response.data : null
}
