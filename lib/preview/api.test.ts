import { beforeEach,describe,it,expect,vi } from 'vitest'
import { NextRequest } from 'next/server'
const m=vi.hoisted(()=>({user:vi.fn(),confirm:vi.fn()}))
vi.mock('@/lib/drafts/queries',()=>({DraftError:class extends Error{constructor(message:string,public status=503){super(message)}},draftUser:m.user}))
vi.mock('@/lib/preview/queries',()=>({confirmPreview:m.confirm}))
import { POST } from '@/app/api/posting/preview/route'
import { DraftError } from '@/lib/drafts/queries'
const valid={id:'a9140f33-a429-46f3-9514-3e8f32f18189',signature:'a'.repeat(64),accepted:true}
const req=(body:unknown,origin='https://site.test')=>new NextRequest('https://site.test/api/posting/preview',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
beforeEach(()=>{vi.clearAllMocks();m.user.mockResolvedValue({id:'owner'});m.confirm.mockResolvedValue({draft_id:valid.id})})
describe('preview confirmation boundary',()=>{
 it('requires a verified account',async()=>{m.user.mockRejectedValue(new DraftError('Sign in',401));expect((await POST(req(valid))).status).toBe(401);expect(m.confirm).not.toHaveBeenCalled()})
 it('rejects cross origin',async()=>expect((await POST(req(valid,'https://other.test'))).status).toBe(403))
 it('requires explicit acknowledgement and valid signature',async()=>{expect((await POST(req({...valid,accepted:false}))).status).toBe(400);expect((await POST(req({...valid,signature:'bad'}))).status).toBe(400)})
 it('bounds request bytes',async()=>expect((await POST(req({...valid,pad:'x'.repeat(1100)}))).status).toBe(413))
 it('returns stale preview conflicts',async()=>{m.confirm.mockRejectedValue(new DraftError('Changed',409));expect((await POST(req(valid))).status).toBe(409)})
 it('does not cache confirmation',async()=>{const r=await POST(req(valid));expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toContain('no-store')})
})
