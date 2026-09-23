'use server'

import { redirect } from 'next/navigation'
import { authConfig, authRequest, validSession, type AuthSession } from '@/lib/auth/provider'
import { clearSession, setSession, ACCESS_COOKIE } from '@/lib/auth/session'
import { normalizeCode, normalizeEmail, safeReturnPath } from '@/lib/auth/validation'
import { cookies } from 'next/headers'

export type CodeState = { status: 'idle' | 'sent' | 'error'; message: string; email: string }
export type VerifyState = { status: 'idle' | 'error'; message: string }

export async function requestCode(_state: CodeState, form: FormData): Promise<CodeState> {
  const email = normalizeEmail(form.get('email'))
  if (!email) return { status: 'error', message: 'Enter a valid email address.', email: '' }
  if (!authConfig()) return { status: 'error', message: 'Sign-in is unavailable until email authentication is configured.', email }
  const mode = form.get('mode') === 'register' ? 'register' : 'login'
  const result = await authRequest<unknown>('/otp', 'POST', { email, create_user: mode === 'register' })
  if (!result.ok && result.status === 429) return { status: 'error', message: 'Please wait before requesting another code.', email }
  if (!result.ok && result.status >= 500) return { status: 'error', message: 'We could not reach email authentication. Please try again.', email }
  // Login for an unregistered address intentionally has the same response.
  return { status: 'sent', message: 'If this address can sign in, a six-digit code has been emailed to it.', email }
}

export async function verifyCode(_state: VerifyState, form: FormData): Promise<VerifyState> {
  const email = normalizeEmail(form.get('email'))
  const token = normalizeCode(form.get('code'))
  if (!email || !token) return { status: 'error', message: 'Enter the six-digit code from your email.' }
  if (!authConfig()) return { status: 'error', message: 'Sign-in is unavailable right now.' }
  const result = await authRequest<AuthSession>('/verify', 'POST', { email, token, type: 'email' })
  if (!result.ok || !validSession(result.data)) {
    return { status: 'error', message: result.ok || result.status < 500
      ? 'That code is invalid or expired. Check your email or request another code.'
      : 'We could not verify the code right now. Please try again.' }
  }
  await setSession(result.data)
  redirect(safeReturnPath(form.get('next')))
}

export async function signOut() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value
  if (token && authConfig()) await authRequest('/logout', 'POST', undefined, token)
  await clearSession()
  redirect('/login')
}
