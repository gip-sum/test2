import { describe, expect, it } from 'vitest'
import { accountInput, parseUserQuery, usersHref, userHref, pageNumber } from './model'
const id = 'a9140f33-a429-46f3-9514-000000000001'
const input = { user: id, request: id, version: 0, status: 'SUSPENDED', role: 'AGENT', reason: ' A valid reason ', accepted: true }
describe('account management input', () => {
  it('requires explicit confirmation and normalizes the reason', () => {
    expect(accountInput(input)?.reason).toBe('A valid reason')
    expect(accountInput({ ...input, accepted: false })).toBeNull()
    expect(accountInput({ ...input, role: null })).not.toBeNull()
  })
  it.each([
    { user: 'wrong' }, { request: 'wrong' }, { version: -1 }, { version: 2147483647 }, { version: '1' },
    { status: null }, { status: 'DELETED' }, { role: 'ADMIN' }, { reason: 'bad' }, { reason: 'a'.repeat(2001) }, { reason: 'bad\u0000reason' },
  ])('rejects hostile or invalid input %j', change => { expect(accountInput({ ...input, ...change })).toBeNull() })
  it('counts Unicode characters consistently with PostgreSQL', () => {
    expect(accountInput({ ...input, reason: '🙂'.repeat(2000) })).not.toBeNull()
    expect(accountInput({ ...input, reason: '🙂'.repeat(2001) })).toBeNull()
  })
})
describe('account URLs', () => {
  it('drops duplicate or unrecognised parameters and bounds query text', () => {
    expect(parseUserQuery({ q: ['private', 'other'], status: 'BAN', role: 'ADMIN', page: 'Infinity' })).toEqual({ q: '', status: '', role: '', page: 1 })
    expect(parseUserQuery({ q: 'x'.repeat(200), status: 'SUSPENDED', role: 'unassigned', page: '2' }).q).toHaveLength(100)
    expect(pageNumber(['2'])).toBe(1); expect(pageNumber('100000')).toBe(1)
  })
  it('preserves literal search and independent pagination in links', () => {
    const q = { q: 'SAMPLE 100% _', status: 'ACTIVE', role: 'AGENT', page: 2 }
    const url = new URL(usersHref(q), 'https://sample.test')
    expect(parseUserQuery(Object.fromEntries(url.searchParams))).toEqual(q)
    expect(userHref(id, { listings: 2, leads: 3, changes: 1 })).toBe(`/admin/users/${id}?listings=2&leads=3`)
  })
})
