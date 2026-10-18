'use server'

import { redirect } from 'next/navigation'
import { authConfig, authRequest, validSession, type AuthSession } from '@/lib/auth/provider'
import { clearSession, setSession, ACCESS_COOKIE } from '@/lib/auth/session'
import { normalizeCode, normalizeEmail, safeReturnPath } from '@/lib/auth/validation'
import { AUTH_MESSAGE, codeProblem, emailProblem, requestProblem, verifyProblem } from '@/lib/auth/messages'
import { cookies } from 'next/headers'

/**
 * The whole sign-in form's state, in one object.
 *
 * One state for every step, so a step survives a submission without
 * JavaScript: the page re-renders from the state the action returned, and
 * with two separate states (as before UI-07) a wrong code posted without
 * JavaScript came back as an empty email step with no error.
 *
 * `error.field` puts the message beside that field and marks it invalid;
 * without one the message is about the attempt (a busy provider, a lost
 * connection) and the fields stay as they were.
 */
export type AuthFormState = {
  step: 'email' | 'code'
  email: string
  notice?: string
  error?: { field?: 'email' | 'code'; message: string }
}

/**
 * Every sign-in form posts here; the submit button's `intent` says which
 * step. Only this and signOut are exported: each export of a 'use server'
 * file is a public endpoint.
 */
export async function submitAuth(state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const intent = form.get('intent')
  if (intent === 'verify') return verifyCode(state, form)
  return requestCode(form, intent === 'resend')
}

async function requestCode(form: FormData, resend: boolean): Promise<AuthFormState> {
  const typed = form.get('email')
  const email = normalizeEmail(typed)
  const back = resend ? 'code' : 'email'
  if (!email) {
    // The address came from a hidden field on a resend; if it is unusable
    // the only fix is to type it again.
    const message = emailProblem(typed) ?? AUTH_MESSAGE.emailInvalid
    return { step: 'email', email: typeof typed === 'string' ? typed.slice(0, 254) : '', error: { field: 'email', message } }
  }
  if (!authConfig()) return { step: back, email, error: { message: AUTH_MESSAGE.unavailable } }
  const mode = form.get('mode') === 'register' ? 'register' : 'login'
  const result = await authRequest<unknown>('/otp', 'POST', { email, create_user: mode === 'register' })
  const problem = result.ok ? null : requestProblem(result.status, result.code)
  if (problem) return { step: problem.field ? 'email' : back, email, error: { field: problem.field ? 'email' : undefined, message: problem.message } }
  // Login for an unregistered address intentionally has the same response.
  return { step: 'code', email, notice: resend ? AUTH_MESSAGE.codeResent : AUTH_MESSAGE.codeSent }
}

async function verifyCode(state: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = normalizeEmail(form.get('email'))
  if (!email) return { step: 'email', email: '', error: { field: 'email', message: AUTH_MESSAGE.emailMissing } }
  const keep = { step: 'code' as const, email, notice: state.notice }
  const typed = form.get('code')
  const token = normalizeCode(typed)
  if (!token) return { ...keep, error: { field: 'code', message: codeProblem(typed) ?? AUTH_MESSAGE.codeInvalid } }
  if (!authConfig()) return { ...keep, error: { message: AUTH_MESSAGE.unavailable } }
  const result = await authRequest<AuthSession>('/verify', 'POST', { email, token, type: 'email' })
  if (!result.ok || !validSession(result.data)) {
    const message = verifyProblem(result.ok ? 403 : result.status)
    return { ...keep, error: { field: message === AUTH_MESSAGE.codeRejected ? 'code' : undefined, message } }
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
