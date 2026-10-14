import { describe, expect, it } from 'vitest'
import { decisionInput, canDecide, type Review } from './model'
const id = 'a9140f33-a429-46f3-9514-3e8f32f18189'
const input = { listing: id, submission: id, version: 3, action: 'APPROVE', days: 90, reason: null, request: id, accepted: true }
describe('review decisions', () => {
  it('validates approval bounds, nullable optional notes and integer versions', () => {
    expect(decisionInput(input)).toEqual(input)
    expect(decisionInput({ ...input, days: 1, reason: '  Review complete  ' })?.reason).toBe('Review complete')
    expect(decisionInput({ ...input, days: 180 })).not.toBeNull()
    for (const days of [null, 0, 181, 1.5, '90']) expect(decisionInput({ ...input, days })).toBeNull()
    for (const version of [-1, 2147483647, 0.5, '3']) expect(decisionInput({ ...input, version })).toBeNull()
  })
  it('requires confirmation, identities and supported fields', () => {
    for (const change of [{ accepted: false }, { actor: id }, { request: 'bad' }, { listing: null }, { submission: 'bad' }, { action: 'ACTIVE' }]) expect(decisionInput({ ...input, ...change })).toBeNull()
    expect(decisionInput(null)).toBeNull(); expect(decisionInput([])).toBeNull()
  })
  it('requires a reason for rejection or correction, without invented validity', () => {
    for (const action of ['REJECT', 'REQUEST_CORRECTION']) {
      expect(decisionInput({ ...input, action, days: null, reason: 'Photos need correction' })?.action).toBe(action)
      expect(decisionInput({ ...input, action, days: null })).toBeNull()
      expect(decisionInput({ ...input, action, days: 90, reason: 'Valid reason' })).toBeNull()
    }
  })
  it('counts Unicode code points, rejects controls and preserves plain paragraphs', () => {
    expect(decisionInput({ ...input, reason: '😀'.repeat(2000) })).not.toBeNull()
    for (const reason of ['abcd', '😀'.repeat(2001), 'hello\u0001world', 'hello\ud800world', 'hello\rworld']) expect(decisionInput({ ...input, reason })).toBeNull()
    expect(decisionInput({ ...input, reason: 'Check photos\n\tPlease re-submit' })).not.toBeNull()
  })
  it('decisions require an independent reviewer and a waiting copy', () => {
    const review = { listing: { owner_id: 'owner', status: 'UNDER_REVIEW' } } as Review
    expect(canDecide(review, 'staff')).toBe(true)
    expect(canDecide(review, 'owner')).toBe(false)
    expect(canDecide({ ...review, listing: { ...review.listing, status: 'CHANGES_REQUESTED' } }, 'staff')).toBe(false)
  })
})
