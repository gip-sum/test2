import { describe, expect, it } from 'vitest'
import { isCanonicalEntryInput, parsePostingEntry, postingUrl } from './entry'

describe('seller entry URL state', () => {
  it('moves through all decisions and reproduces a review link', () => {
    expect(parsePostingEntry({}).stage).toBe('role')
    expect(parsePostingEntry({ role: 'AGENT' }).stage).toBe('intent')
    expect(parsePostingEntry({ role: 'AGENT', intent: 'rent' }).stage).toBe('type')
    const review = parsePostingEntry({ role: 'AGENT', intent: 'rent', type: 'VILLA' })
    expect(review.stage).toBe('details')
    expect(postingUrl(review)).toBe('/post?role=AGENT&intent=rent&type=VILLA')
  })

  it('rejects duplicates, missing prerequisites and hostile values without echoing them', () => {
    expect(parsePostingEntry({ role: ['OWNER', 'BUILDER'], intent: 'buy' })).toEqual({ stage: 'role' })
    expect(parsePostingEntry({ role: 'OWNER', intent: 'buy', type: 'SCRIPT' })).toEqual({ role: 'OWNER', intent: 'buy', stage: 'type' })
    expect(parsePostingEntry({ intent: 'buy', type: 'APARTMENT' })).toEqual({ stage: 'role' })
    expect(parsePostingEntry({ role: 'OWNER', intent: ['buy', 'rent'] })).toEqual({ role: 'OWNER', stage: 'intent' })
  })

  it('removes unrecognised parameters and discarded downstream answers', () => {
    const entry = parsePostingEntry({ role: 'OWNER', intent: 'not-valid', type: 'VILLA', extra: 'x' })
    expect(postingUrl(entry)).toBe('/post?role=OWNER')
    expect(isCanonicalEntryInput({ role: 'OWNER', intent: 'not-valid', type: 'VILLA', extra: 'x' }, entry)).toBe(false)
    expect(isCanonicalEntryInput({ role: 'OWNER', intent: 'buy', type: 'STUDIO' }, parsePostingEntry({ role: 'OWNER', intent: 'buy', type: 'STUDIO' }))).toBe(true)
  })
})
