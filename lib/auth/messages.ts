import { normalizeCode, normalizeEmail } from './validation'

/**
 * Every sentence the sign-in form can show, and the rules that choose one.
 *
 * Shared by the server actions (the authority, and the only path without
 * JavaScript) and the form's own check before it sends anything, so the
 * same mistake reads the same way on both paths.
 *
 * Nothing here repeats what the provider said. Supabase's own wording names
 * its internals ("otp_expired", "Signups not allowed for otp") and some of
 * it would reveal whether an address has an account, which the form
 * deliberately never does: a requested code is always "emailed if this
 * address can sign in".
 */
export const AUTH_MESSAGE = {
  emailMissing: 'Enter your email address.',
  emailInvalid: 'Enter a valid email address, like name@example.com.',
  emailRefused: 'This email address can’t be used to sign in. Check it for typos, or use another address.',
  codeSent: 'If this address can sign in, a six-digit code has been emailed to it.',
  codeResent: 'If this address can sign in, a new six-digit code has been emailed to it. Use the newest code.',
  codeMissing: 'Enter the six-digit code from your email.',
  codeInvalid: 'The code is six digits, like 123456.',
  codeRejected: 'That code is invalid or expired. Check your email, or send a new code.',
  rateLimited: 'Please wait a minute before requesting another code.',
  tooManyAttempts: 'Too many attempts. Please wait a minute, then try again.',
  serviceDown: 'We couldn’t reach the sign-in service. Please try again in a moment.',
  verifyDown: 'We couldn’t check the code right now. Please try again in a moment.',
  offline: 'You seem to be offline. Check your connection and try again — what you entered is still here.',
  unexpected: 'Something went wrong on our side. Please try again.',
  unavailable: 'Sign-in is unavailable right now. Please try again later.',
  googleCancelled: 'Google sign-in was cancelled. You can try again or use your email.',
  googleFailed: 'Google sign-in could not be completed. You can try again or use your email.',
} as const

export type AuthMessage = (typeof AUTH_MESSAGE)[keyof typeof AUTH_MESSAGE]

/** The problem with what was typed into the email field, or null. */
export function emailProblem(value: unknown): AuthMessage | null {
  if (typeof value !== 'string' || !value.trim()) return AUTH_MESSAGE.emailMissing
  return normalizeEmail(value) ? null : AUTH_MESSAGE.emailInvalid
}

/** The problem with what was typed into the code field, or null. */
export function codeProblem(value: unknown): AuthMessage | null {
  if (typeof value !== 'string' || !value.trim()) return AUTH_MESSAGE.codeMissing
  return normalizeCode(value) ? null : AUTH_MESSAGE.codeInvalid
}

/**
 * A failed code request. `field` says the address itself is the problem
 * (the message belongs beside the email field); otherwise the message is
 * about the attempt, and the form keeps the address as typed.
 *
 * Returns null where the answer must look like success: any other refusal
 * (an unknown address on "Log in", sign-ups closed) is reported exactly as a
 * sent code, so the form never confirms whether an account exists.
 */
export function requestProblem(status: number, code?: string): { message: AuthMessage; field: boolean } | null {
  if (status === 429) return { message: AUTH_MESSAGE.rateLimited, field: false }
  if (status >= 500) return { message: AUTH_MESSAGE.serviceDown, field: false }
  if (code === 'email_address_invalid') return { message: AUTH_MESSAGE.emailRefused, field: true }
  return null
}

/**
 * A failed verification. Supabase answers a wrong code and an expired one
 * identically (403 otp_expired), so the message names both.
 */
export function verifyProblem(status: number): AuthMessage {
  if (status === 429) return AUTH_MESSAGE.tooManyAttempts
  return status >= 500 ? AUTH_MESSAGE.verifyDown : AUTH_MESSAGE.codeRejected
}

/**
 * The `?error=` the Google routes send back to /login. Only these values
 * mean anything; anything else is ignored rather than echoed into the page.
 */
export const GOOGLE_ERROR = { cancelled: 'google-cancelled', failed: 'google' } as const

export function googleProblem(param: unknown): AuthMessage | null {
  if (param === GOOGLE_ERROR.cancelled) return AUTH_MESSAGE.googleCancelled
  if (param === GOOGLE_ERROR.failed) return AUTH_MESSAGE.googleFailed
  return null
}

/**
 * A failure the browser met before the server could answer. A fetch that
 * never left the device, or lost the connection, is an offline problem the
 * visitor can fix; anything else is ours.
 */
export function clientProblem(error: unknown, online: boolean): AuthMessage {
  return !online || error instanceof TypeError ? AUTH_MESSAGE.offline : AUTH_MESSAGE.unexpected
}
