import { describe, expect, it } from 'vitest'
import { normalizeCode, normalizeEmail, safeReturnPath } from './validation'

describe('auth inputs', () => {
  it('normalizes an email and accepts exactly six digits', () => {
    expect(normalizeEmail('  Buyer@Example.COM ')).toBe('buyer@example.com')
    expect(normalizeEmail('buyer@localhost')).toBeNull()
    expect(normalizeCode(' 012345 ')).toBe('012345')
    expect(normalizeCode('12345a')).toBeNull()
    expect(normalizeCode('1234567')).toBeNull()
  })

  it('keeps internal routes and rejects open redirects and action targets', () => {
    expect(safeReturnPath('/account?tab=one')).toBe('/account?tab=one')
    for (const input of ['https://attacker.example/', '//attacker.example/', '/\\attacker.example', '/login', '/api/auth/state', '/account\nX']) {
      expect(safeReturnPath(input)).toBe('/account')
    }
  })
})
