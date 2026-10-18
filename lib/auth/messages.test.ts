import { describe, expect, it } from 'vitest'
import { AUTH_MESSAGE, clientProblem, codeProblem, emailProblem, googleProblem, requestProblem, verifyProblem } from './messages'

describe('sign-in messages', () => {
  it('names the problem with a typed address, and accepts what the server accepts', () => {
    expect(emailProblem('')).toBe(AUTH_MESSAGE.emailMissing)
    expect(emailProblem('   ')).toBe(AUTH_MESSAGE.emailMissing)
    expect(emailProblem(null)).toBe(AUTH_MESSAGE.emailMissing)
    expect(emailProblem('buyer@')).toBe(AUTH_MESSAGE.emailInvalid)
    expect(emailProblem(' Buyer@Example.com ')).toBeNull()
    // No stricter than the server: a plus address or a long TLD is fine.
    expect(emailProblem('a.b+homes@sub.example.photography')).toBeNull()
  })

  it('names the problem with a typed code', () => {
    expect(codeProblem('')).toBe(AUTH_MESSAGE.codeMissing)
    expect(codeProblem('12345')).toBe(AUTH_MESSAGE.codeInvalid)
    expect(codeProblem('12345a')).toBe(AUTH_MESSAGE.codeInvalid)
    expect(codeProblem(' 123 456 ')).toBeNull()
  })

  it('maps provider refusals without revealing whether an account exists', () => {
    expect(requestProblem(429)).toEqual({ message: AUTH_MESSAGE.rateLimited, field: false })
    expect(requestProblem(503)).toEqual({ message: AUTH_MESSAGE.serviceDown, field: false })
    expect(requestProblem(400, 'email_address_invalid')).toEqual({ message: AUTH_MESSAGE.emailRefused, field: true })
    // An unknown address on "Log in", or sign-ups switched off, must read
    // exactly like a sent code.
    expect(requestProblem(422, 'otp_disabled')).toBeNull()
    expect(requestProblem(400)).toBeNull()
    expect(verifyProblem(403)).toBe(AUTH_MESSAGE.codeRejected)
    expect(verifyProblem(429)).toBe(AUTH_MESSAGE.tooManyAttempts)
    expect(verifyProblem(502)).toBe(AUTH_MESSAGE.verifyDown)
  })

  it('reads only known Google error values', () => {
    expect(googleProblem('google-cancelled')).toBe(AUTH_MESSAGE.googleCancelled)
    expect(googleProblem('google')).toBe(AUTH_MESSAGE.googleFailed)
    expect(googleProblem('<script>')).toBeNull()
    expect(googleProblem(undefined)).toBeNull()
  })

  it('tells a lost connection from a failure of ours', () => {
    expect(clientProblem(new TypeError('Failed to fetch'), true)).toBe(AUTH_MESSAGE.offline)
    expect(clientProblem(new Error('boom'), false)).toBe(AUTH_MESSAGE.offline)
    expect(clientProblem(new Error('boom'), true)).toBe(AUTH_MESSAGE.unexpected)
  })

  it('never shows provider or technical wording', () => {
    for (const message of Object.values(AUTH_MESSAGE)) {
      expect(message).not.toMatch(/supabase|otp|token|\bapi\b|http|status|error_code|\b[45]\d\d\b/i)
    }
  })
})
