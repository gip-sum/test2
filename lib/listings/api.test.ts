import { beforeEach,it,expect,vi } from 'vitest'
import { NextRequest } from 'next/server'
const m=vi.hoisted(()=>({user:vi.fn(),submit:vi.fn(),change:vi.fn()}))
vi.mock('@/lib/drafts/queries',()=>({DraftError:class extends Error{constructor(message:string,public status=503){super(message)}},draftUser:m.user}))
vi.mock('@/lib/listings/queries',()=>({submitListing:m.submit,changeListing:m.change}))
import { POST } from '@/app/api/posting/lifecycle/route'
import { DraftError } from '@/lib/drafts/queries'
const id='a9140f33-a429-46f3-9514-3e8f32f18189',body={id,action:'submit',version:0,signature:'a'.repeat(64),accepted:true}
const req=(b:unknown=body,origin='https://test.invalid')=>new NextRequest('https://test.invalid/api/posting/lifecycle',{method:'POST',headers:{Origin:origin},body:JSON.stringify(b)})
beforeEach(()=>{vi.clearAllMocks();m.user.mockResolvedValue({id});m.submit.mockResolvedValue({status:'UNDER_REVIEW'});m.change.mockResolvedValue({status:'DELETED'})})
it('requires verified account',async()=>{m.user.mockRejectedValue(new DraftError('Sign in',401));expect((await POST(req())).status).toBe(401);expect(m.submit).not.toHaveBeenCalled()})
it('rejects foreign origin before privileged work',async()=>{expect((await POST(req(body,'https://evil.test'))).status).toBe(403);expect(m.user).not.toHaveBeenCalled()})
it('submits only explicit confirmed intent',async()=>{const r=await POST(req());expect(r.status).toBe(200);expect(m.submit).toHaveBeenCalledWith({id},id,body.signature,0);expect(r.headers.get('cache-control')).toBe('private, no-store')})
it('rejects approval, owner spoof and unbounded input',async()=>{for(const b of [{...body,action:'ACTIVE'},{...body,owner_id:'other'},{...body,version:-1},{...body,accepted:false}])expect((await POST(req(b))).status).toBe(400);expect((await POST(req({...body,padding:'x'.repeat(3000)}))).status).toBe(413);expect(m.submit).not.toHaveBeenCalled()})
it('requires a separate deletion acknowledgement',async()=>{expect((await POST(req({id,version:1,action:'delete'}))).status).toBe(400);expect((await POST(req({id,version:1,action:'delete',accepted:true}))).status).toBe(200);expect(m.change).toHaveBeenCalledWith({id},id,'delete',1)})
it('propagates conflict without pretending the action succeeded',async()=>{m.submit.mockRejectedValue(new DraftError('Changed',409));expect((await POST(req())).status).toBe(409)})
