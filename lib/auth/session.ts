import 'server-only'
import { cookies } from 'next/headers'
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions } from './cookies'
import { authRequest, validUser, type AuthUser, type AuthSession } from './provider'

export { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions }

export async function setSession(session: AuthSession) {
  const jar = await cookies()
  jar.set(ACCESS_COOKIE, session.access_token, { ...cookieOptions, maxAge: Math.max(60, Math.min(session.expires_in, 3600)) })
  jar.set(REFRESH_COOKIE, session.refresh_token, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 })
}

export async function clearSession() {
  const jar = await cookies()
  // Expire them with the attributes they were set with. A bare delete is a
  // non-Secure write, which cannot clear a Secure cookie (see ./cookies).
  jar.set(ACCESS_COOKIE, '', { ...cookieOptions, maxAge: 0 })
  jar.set(REFRESH_COOKIE, '', { ...cookieOptions, maxAge: 0 })
}

/** Always ask the provider: client-controlled cookies alone never confer identity. */
export async function getVerifiedUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!token) return null
  const response = await authRequest<AuthUser>('/user', 'GET', undefined, token)
  return response.ok && validUser(response.data) ? response.data : null
}
