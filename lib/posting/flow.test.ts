import { describe, expect, it } from 'vitest'
import { resolvePosting } from './flow'

const TODAY = '2026-09-25'
const ENTRY = { role: 'OWNER', intent: 'buy', type: 'APARTMENT' }
const SUBMISSION = {
  ...ENTRY, bhk: '2', baths: '2', unit: 'sqft', carpet: '1,050', builtup: '', super: '',
  furnishing: 'UNFURNISHED', floor: '3', floors: '8', status: 'READY', age: '4', possession: '',
}
const REVIEW = '/post?role=OWNER&intent=buy&type=APARTMENT&bhk=2&baths=2&unit=sqft&carpet=1050&furnishing=UNFURNISHED&floor=3&floors=8&status=READY&age=4'

describe('posting flow', () => {
  it('opens an empty details form once the entry is complete', () => {
    const { view, canonicalUrl } = resolvePosting(ENTRY, TODAY)
    expect(view.stage).toBe('details')
    expect(view.stage === 'details' && view.errors).toEqual({})
    expect(canonicalUrl).toBe('/post?role=OWNER&intent=buy&type=APARTMENT')
  })

  it('canonicalises a valid submission to a normalised review link', () => {
    const { view, canonicalUrl } = resolvePosting(SUBMISSION, TODAY)
    expect(view.stage).toBe('review')
    expect(canonicalUrl).toBe(REVIEW)
    expect(resolvePosting(Object.fromEntries(new URL(REVIEW, 'http://x').searchParams), TODAY).canonicalUrl).toBe(REVIEW)
  })

  it('keeps typed values on an invalid submission and drops only unknown or inapplicable ones', () => {
    const { view, canonicalUrl } = resolvePosting({ ...SUBMISSION, carpet: '10.5', available: 'now', junk: '1' }, TODAY)
    expect(view.stage).toBe('details')
    if (view.stage !== 'details') throw new Error('expected details')
    expect(view.values.carpet).toBe('10.5')
    expect(Object.keys(view.errors)).toEqual(['carpet'])
    expect(canonicalUrl).toContain('carpet=10.5')
    expect(canonicalUrl).not.toContain('available')
    expect(canonicalUrl).not.toContain('junk')
  })

  it('opens a filled, unjudged form in edit mode', () => {
    const { view, canonicalUrl } = resolvePosting({ ...SUBMISSION, carpet: '', edit: '1' }, TODAY)
    expect(view.stage === 'details' && view.errors).toEqual({})
    expect(canonicalUrl.endsWith('&edit=1')).toBe(true)
  })

  it('carries details through earlier stages and drops the edit flag there', () => {
    const { view, canonicalUrl } = resolvePosting({ role: 'OWNER', intent: 'buy', carpet: '900', edit: '1' }, TODAY)
    expect(view.stage).toBe('type')
    expect(view.carried).toEqual({ carpet: '900' })
    expect(canonicalUrl).toBe('/post?role=OWNER&intent=buy&carpet=900')
  })

  it('drops a floor when the type becomes a villa, keeping everything else', () => {
    const villa = { ...Object.fromEntries(new URL(REVIEW, 'http://x').searchParams), type: 'VILLA', edit: '1' }
    const { view, canonicalUrl } = resolvePosting(villa, TODAY)
    expect(view.stage).toBe('details')
    expect(canonicalUrl).not.toContain('floor=3')
    expect(canonicalUrl).toContain('floors=8')
    expect(canonicalUrl).toContain('carpet=1050')
  })
})
