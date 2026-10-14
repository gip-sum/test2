import { describe, it, expect } from 'vitest'
import { isAutomated, visitorKey, VISITOR_ID } from './views'

describe('what counts as a view', () => {
  it('ignores crawlers, link previews and clients without a user agent', () => {
    for (const ua of ['Googlebot/2.1', 'facebookexternalhit/1.1', 'WhatsApp/2.23', 'curl/8.0', 'Mozilla/5.0 (compatible; bingbot/2.0)', '', null]) expect(isAutomated(ua), String(ua)).toBe(true)
    expect(isAutomated('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36')).toBe(false)
  })
  it('hashes the browser with the listing and the day, so marks cannot be linked', () => {
    const visitor = crypto.randomUUID()
    expect(VISITOR_ID.test(visitor)).toBe(true)
    const a = visitorKey(visitor, 'listing-1', '2026-10-14')
    expect(a).toMatch(/^[a-f0-9]{64}$/)
    expect(a).not.toContain(visitor.replaceAll('-', ''))
    expect(visitorKey(visitor, 'listing-1', '2026-10-15')).not.toBe(a)
    expect(visitorKey(visitor, 'listing-2', '2026-10-14')).not.toBe(a)
    expect(visitorKey(visitor, 'listing-1', '2026-10-14')).toBe(a)
  })
})
