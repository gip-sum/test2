import { describe, it, expect, beforeEach } from 'vitest'
import { normalisePhone, validateEnquiry, NAME_MAX, MESSAGE_MAX } from './validate'
import { createEnquiry, getEnquiriesForListing, __resetEnquiries } from './commands'
import { DEMO_PROPERTIES } from '@/lib/property/demo-data'

const LISTING = DEMO_PROPERTIES[0]!.publicId

describe('normalisePhone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['+919876543210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['09876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['98765-43210', '+919876543210'],
    ['(98765) 43210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
  ])('normalises %s', (input, expected) => {
    expect(normalisePhone(input)).toBe(expected)
  })

  it.each([
    ['too short', '987654321'],
    ['too long', '98765432100'],
    ['starts below 6', '5876543210'],
    ['landline', '03312345678'],
    ['letters', '98765abcde'],
    ['empty', ''],
    ['wrong country code', '+449876543210'],
  ])('rejects %s', (_label, input) => {
    expect(normalisePhone(input)).toBeNull()
  })
})

describe('validateEnquiry', () => {
  const valid = { listingPublicId: LISTING, name: 'Riya Sen', phone: '9876543210' }

  it('accepts a minimal valid enquiry', () => {
    expect(validateEnquiry(valid).errors).toEqual({})
  })

  it('requires a name', () => {
    expect(validateEnquiry({ ...valid, name: '   ' }).errors.name).toBeDefined()
  })

  it('requires a phone and explains which kind', () => {
    expect(validateEnquiry({ ...valid, phone: '' }).errors.phone).toMatch(/mobile number/i)
    expect(validateEnquiry({ ...valid, phone: '12345' }).errors.phone).toMatch(/10-digit/i)
  })

  it('caps name and message length', () => {
    expect(validateEnquiry({ ...valid, name: 'a'.repeat(NAME_MAX + 1) }).errors.name).toBeDefined()
    expect(
      validateEnquiry({ ...valid, message: 'a'.repeat(MESSAGE_MAX + 1) }).errors.message,
    ).toBeDefined()
  })

  it('treats a message as optional and trims it away when blank', () => {
    expect(validateEnquiry({ ...valid, message: '   ' }).message).toBeUndefined()
    expect(validateEnquiry({ ...valid, message: '   ' }).errors).toEqual({})
  })

  it('reports several field errors at once rather than one at a time', () => {
    const errors = validateEnquiry({ listingPublicId: '', name: '', phone: 'x' }).errors
    expect(Object.keys(errors).sort()).toEqual(['listing', 'name', 'phone'])
  })
})

describe('createEnquiry', () => {
  beforeEach(() => __resetEnquiries())

  it('records a valid enquiry against the listing', () => {
    const result = createEnquiry({ listingPublicId: LISTING, name: 'Riya Sen', phone: '9876543210' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.enquiry.listingPublicId).toBe(LISTING)
    expect(result.enquiry.source).toBe('property_page')
    expect(getEnquiriesForListing(LISTING)).toHaveLength(1)
  })

  it('stores the phone normalised, never as typed', () => {
    const result = createEnquiry({ listingPublicId: LISTING, name: 'Riya', phone: '98765 43210' })
    expect(result.ok && result.enquiry.phone).toBe('+919876543210')
  })

  it('rejects an unknown listing without writing anything', () => {
    const result = createEnquiry({ listingPublicId: 'p_nope', name: 'Riya', phone: '9876543210' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.listing).toBeDefined()
    expect(getEnquiriesForListing('p_nope')).toHaveLength(0)
  })

  it('writes nothing when validation fails', () => {
    createEnquiry({ listingPublicId: LISTING, name: '', phone: 'nope' })
    expect(getEnquiriesForListing(LISTING)).toHaveLength(0)
  })

  it('records a repeat enquiry rather than swallowing it, and flags it', () => {
    const first = createEnquiry({ listingPublicId: LISTING, name: 'Riya', phone: '9876543210' })
    const second = createEnquiry({ listingPublicId: LISTING, name: 'Riya', phone: '+91 98765 43210' })
    expect(first.ok && first.duplicate).toBe(false)
    expect(second.ok && second.duplicate).toBe(true)
    // Both are kept: a second ask usually means the first went unanswered.
    expect(getEnquiriesForListing(LISTING)).toHaveLength(2)
  })

  it('does not treat a different number on the same listing as a duplicate', () => {
    createEnquiry({ listingPublicId: LISTING, name: 'Riya', phone: '9876543210' })
    const other = createEnquiry({ listingPublicId: LISTING, name: 'Arjun', phone: '9123456780' })
    expect(other.ok && other.duplicate).toBe(false)
  })

  it('scopes enquiries to their own listing', () => {
    const otherListing = DEMO_PROPERTIES[1]!.publicId
    createEnquiry({ listingPublicId: LISTING, name: 'Riya', phone: '9876543210' })
    expect(getEnquiriesForListing(otherListing)).toHaveLength(0)
  })
})
