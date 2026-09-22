import { describe, it, expect } from 'vitest'
import { parsePropertyHandle, propertyPath, toUrlToken } from './public-id'

describe('toUrlToken', () => {
  it('normalises the stored prefix away and applies the grammar prefix', () => {
    expect(toUrlToken('p_c70il')).toBe('pc70il')
  })

  it('handles an id stored without a prefix', () => {
    expect(toUrlToken('c70il')).toBe('pc70il')
  })
})

describe('propertyPath', () => {
  it('builds the approved canonical shape', () => {
    expect(propertyPath('2-bhk-flat-for-sale-in-behala', 'p_c70il')).toBe(
      '/property/2-bhk-flat-for-sale-in-behala-pc70il',
    )
  })
})

describe('parsePropertyHandle', () => {
  it('round-trips a canonical path', () => {
    const handle = '2-bhk-flat-for-sale-in-behala-pc70il'
    expect(parsePropertyHandle(handle)).toEqual({
      publicId: 'p_c70il',
      slug: '2-bhk-flat-for-sale-in-behala',
      legacy: false,
    })
  })

  it('resolves a slug that itself ends in a word starting with p', () => {
    // The reason ids may not contain hyphens: this must split at the last
    // hyphen and nowhere else.
    expect(parsePropertyHandle('3-bhk-flat-in-park-street-pab12cd')).toEqual({
      publicId: 'p_ab12cd',
      slug: '3-bhk-flat-in-park-street',
      legacy: false,
    })
  })

  it('still resolves the legacy underscore form, and flags it', () => {
    expect(parsePropertyHandle('2-bhk-flat-for-sale-in-behala-p_c70il')).toEqual({
      publicId: 'p_c70il',
      slug: '2-bhk-flat-for-sale-in-behala',
      legacy: true,
    })
  })

  it.each([
    ['no token at all', 'just-a-slug-with-no-id'],
    ['token without the p prefix', 'some-slug-c70il'],
    ['empty id', 'some-slug-p'],
    ['id too short', 'some-slug-pab'],
    ['id too long', `some-slug-p${'a'.repeat(17)}`],
    ['uppercase id', 'some-slug-pC70IL'],
    ['no slug', '-pc70il'],
    ['no hyphen', 'pc70il'],
    ['trailing hyphen', 'some-slug-pc70il-'],
    ['empty string', ''],
  ])('returns null for %s', (_label, handle) => {
    expect(parsePropertyHandle(handle)).toBeNull()
  })

  it('round-trips every id shape the fixture generates', () => {
    for (const id of ['p_c70il', 'p_abc123', 'p_8f3c2a', 'p_0e88d1']) {
      const parsed = parsePropertyHandle(`some-slug-${toUrlToken(id)}`)
      expect(parsed?.publicId).toBe(id)
    }
  })
})
