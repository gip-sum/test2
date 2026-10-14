import {beforeEach,it,expect,vi} from 'vitest'
import {NextRequest} from 'next/server'
const m=vi.hoisted(()=>({user:vi.fn(),save:vi.fn(),generate:vi.fn(),job:vi.fn()}))
vi.mock('@/lib/drafts/queries',()=>({draftUser:m.user,DraftError:class extends Error{constructor(message:string,public status=503){super(message)}}}))
vi.mock('@/lib/descriptions/queries',()=>({saveDescription:m.save,generateDescription:m.generate,getDescriptionJob:m.job}))
import {DraftError} from '@/lib/drafts/queries'
import {POST} from '@/app/api/posting/description/route'
import {GET} from '@/app/api/posting/description/jobs/[id]/route'
const id='a9140f33-a429-46f3-9514-3e8f32f18189',valid={id,revision:1,action:'save',description:'A paragraph.'}
const request=(body:unknown,origin='https://site.test')=>new NextRequest('https://site.test/api/posting/description',{method:'POST',headers:{Origin:origin},body:JSON.stringify(body)})
beforeEach(()=>{vi.clearAllMocks();m.user.mockResolvedValue({id:'owner'});m.save.mockResolvedValue({revision:2});m.generate.mockResolvedValue({id,status:'QUEUED'});m.job.mockResolvedValue({id,status:'RUNNING'})})
it('requires verified sessions for writes and reads',async()=>{m.user.mockRejectedValue(new DraftError('Sign in',401));expect((await POST(request(valid))).status).toBe(401);expect((await GET(new Request('https://site.test'),{params:Promise.resolve({id})})).status).toBe(401);expect(m.save).not.toHaveBeenCalled();expect(m.job).not.toHaveBeenCalled()})
it('same-origin mutations only',async()=>{expect((await POST(request(valid,'https://other.test'))).status).toBe(403);expect(m.user).not.toHaveBeenCalled()})
it('rejects malformed action, UUID, revision and signature',async()=>{for(const body of [{...valid,id:'other'},{...valid,revision:0},{...valid,revision:1.2},{...valid,action:'publish'},{...valid,action:'generate',signature:'bad'}])expect((await POST(request(body))).status).toBe(400);expect(m.save).not.toHaveBeenCalled();expect(m.generate).not.toHaveBeenCalled()})
it('bounds actual request bytes',async()=>expect((await POST(request({...valid,description:'a'.repeat(12001)}))).status).toBe(413))
it('manual save persists the current revision privately',async()=>{const r=await POST(request(valid));expect(r.status).toBe(200);expect(await r.json()).toEqual({revision:2});expect(r.headers.get('cache-control')).toContain('no-store')})
it('queued response is acceptance, with no publication',async()=>{const r=await POST(request({...valid,action:'generate',signature:'a'.repeat(64)}));expect(r.status).toBe(202);expect(await r.json()).toMatchObject({job:{status:'QUEUED'}});expect(m.save).not.toHaveBeenCalled()})
it('owner conflict and foreign lookup retain their status',async()=>{m.save.mockRejectedValue(new DraftError('Changed',409));expect((await POST(request(valid))).status).toBe(409);m.job.mockRejectedValue(new DraftError('Not found',404));expect((await GET(new Request('https://site.test'),{params:Promise.resolve({id})})).status).toBe(404)})
it('does not disclose unknown dependency failures',async()=>{m.generate.mockRejectedValue(Error('private-key'));const r=await POST(request({...valid,action:'generate',signature:'a'.repeat(64)}));expect(r.status).toBe(503);expect(JSON.stringify(await r.json())).not.toContain('private-key')})
