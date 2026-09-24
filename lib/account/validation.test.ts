import { describe, expect, it } from 'vitest'
import { validateProfile } from './validation'

function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}

const valid = { full_name: '  Ananya  Roy ', contact_phone: '+919876543210', preferred_intent: 'buy', preferred_locality: 'new-town', email_updates: 'on' }

describe('buyer account input', () => {
  it('normalizes optional fields and explicit consent', () => {
    expect(validateProfile(form(valid), ['new-town'])).toEqual({ ok: true, value: {
      full_name: 'Ananya Roy', contact_phone: '+919876543210', preferred_intent: 'buy', preferred_locality: 'new-town', email_updates: true,
    } })
    expect(validateProfile(form({ ...valid, contact_phone: '', preferred_locality: '', email_updates: 'off' }), ['new-town'])).toMatchObject({ ok: true, value: { contact_phone: null, preferred_locality: null, email_updates: false } })
  })
  it('rejects invalid phone, intent, locality and oversized names', () => {
    for (const changed of [
      { contact_phone: 'abc' }, { preferred_intent: 'seller' },
      { preferred_locality: 'nonexistent' }, { full_name: 'a'.repeat(101) },
    ]) expect(validateProfile(form({ ...valid, ...changed }), ['new-town']).ok).toBe(false)
  })
})
