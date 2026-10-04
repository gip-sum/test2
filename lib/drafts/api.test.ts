import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ user: vi.fn(), get: vi.fn(), list: vi.fn(), create: vi.fn(), save: vi.fn() }))
vi.mock('@/lib/drafts/queries', () => ({
  DraftError: class extends Error { constructor(message: string, public status = 503) { super(message) } },
  draftUser: mocks.user, getDraft: mocks.get, listDrafts: mocks.list, createDraft: mocks.create, saveDraft: mocks.save,
}))
import { GET, POST, PATCH } from '@/app/api/posting/drafts/route'
import { DraftError } from '@/lib/drafts/queries'
const id = 'a9140f33-a429-46f3-9514-3e8f32f18189'
const body = { id, collection: id, revision: 1, snapshot: { path: '/post', input: { carpet: '1,' } } }
function req(data: unknown, method = 'PATCH', origin = 'https://example.test') {
  return new NextRequest('https://example.test/api/posting/drafts', { method, headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({id}); mocks.save.mockResolvedValue({id,revision:2}); mocks.create.mockResolvedValue({id,revision:1}) })
describe('draft API boundary', () => {
 it('requires a verified account and does not call persistence for guests', async () => {
  mocks.user.mockRejectedValue(new DraftError('Sign in',401))
  expect((await POST(req(body,'POST'))).status).toBe(401)
  expect(mocks.create).not.toHaveBeenCalled()
 })
 it('rejects foreign-origin writes before account or persistence access', async () => {
  expect((await PATCH(req(body,'PATCH','https://other.test'))).status).toBe(403)
  expect(mocks.user).not.toHaveBeenCalled()
 })
 it('persists bounded partial values with expected revision', async () => {
  const r=await PATCH(req(body)); expect(r.status).toBe(200)
  expect(mocks.save).toHaveBeenCalledWith({id},id,1,body.snapshot)
  expect(r.headers.get('cache-control')).toBe('private, no-store')
 })
 it('rejects unknown fields and invalid revisions', async () => {
  expect((await PATCH(req({...body,revision:-1}))).status).toBe(400)
  expect((await PATCH(req({...body,snapshot:{path:'/post',input:{owner_id:id}}}))).status).toBe(400)
  expect(mocks.save).not.toHaveBeenCalled()
 })
 it('bounds the actual stream even without content length', async () => {
  expect((await POST(req({...body,padding:'x'.repeat(17000)},'POST'))).status).toBe(413)
  expect(mocks.create).not.toHaveBeenCalled()
 })
 it('returns conflicts rather than success', async () => {
  mocks.save.mockRejectedValue(new DraftError('Changed elsewhere',409))
  expect((await PATCH(req(body))).status).toBe(409)
 })
 it('returns provider failures as errors rather than empty lists', async () => {
  mocks.list.mockRejectedValue(new DraftError('Unavailable'))
  expect((await GET(new NextRequest('https://example.test/api/posting/drafts'))).status).toBe(503)
 })
})
