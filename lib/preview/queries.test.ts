import { beforeEach,describe,it,expect,vi } from 'vitest'
vi.mock('server-only',()=>({}))
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>({value:'test-token'})})}))
vi.mock('@/lib/auth/provider',()=>({authConfig:()=>({base:'https://test.invalid/auth/v1',key:'test-key'})}))
const m=vi.hoisted(()=>({draft:vi.fn(),photos:vi.fn(),profile:vi.fn()}))
vi.mock('@/lib/drafts/queries',()=>({getDraft:m.draft,DraftError:class extends Error{constructor(message:string,public status=503){super(message)}}}))
vi.mock('@/lib/media/queries',()=>({listPhotos:m.photos}))
vi.mock('@/lib/account/queries',()=>({getBuyerProfile:m.profile}))
import {getPreview,confirmPreview} from './queries'
const user={id:'owner',email:'owner@example.com'},draft={id:'draft',owner_id:'owner',collection_id:'collection',revision:1,page_path:'/post',role:'OWNER',intent:'buy',type:'APARTMENT',bhk:'2',baths:'2',unit:'sqft',carpet:'1000',furnishing:'UNFURNISHED',floor:'3',floors:'8',status:'READY',age:'4',city:'kolkata',locality:'new-town',address:'Test building address',saleprice:'6000000',maintenance:'none',negotiable:'yes'}
const photo={id:'photo',collection_id:'collection',status:'ready',position:0,sha256:'a'.repeat(64)}
let review:unknown[]=[]
beforeEach(()=>{
 vi.clearAllMocks();review=[];m.draft.mockResolvedValue({...draft});m.photos.mockResolvedValue([{...photo}]);m.profile.mockResolvedValue({ok:true,profile:{full_name:'Seller',contact_phone:'private-phone'}})
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>{if(init.method==='POST')review=[JSON.parse(init.body as string)];return Response.json(review)}))
})
describe('preview freshness and persistence',()=>{
 it('confirms the displayed snapshot and reads it back',async()=>{const p=await getPreview(user,'draft');await confirmPreview(user,'draft',p.signature);expect((await getPreview(user,'draft')).confirmed).toBe(true)})
 it('rejects changed draft before writing confirmation',async()=>{const p=await getPreview(user,'draft');m.draft.mockResolvedValue({...draft,revision:2});await expect(confirmPreview(user,'draft',p.signature)).rejects.toMatchObject({status:409});expect(review).toHaveLength(0)})
 it('photo bytes metadata and order invalidate reviews',async()=>{const p=await getPreview(user,'draft');m.photos.mockResolvedValue([{...photo,sha256:'b'.repeat(64)}]);expect((await getPreview(user,'draft')).signature).not.toBe(p.signature);m.photos.mockResolvedValue([{...photo,position:2}]);expect((await getPreview(user,'draft')).signature).not.toBe(p.signature)})
 it('seller name changes invalidate a view without exposing private profile fields',async()=>{const p=await getPreview(user,'draft');expect(JSON.stringify(p)).not.toContain('private-phone');m.profile.mockResolvedValue({ok:true,profile:{full_name:'Other'}});expect((await getPreview(user,'draft')).signature).not.toBe(p.signature)})
 it('incomplete content cannot be confirmed',async()=>{m.photos.mockResolvedValue([]);const p=await getPreview(user,'draft');await expect(confirmPreview(user,'draft',p.signature)).rejects.toMatchObject({status:422})})
 it('profile outage is not a missing-name fallback',async()=>{m.profile.mockResolvedValue({ok:false});await expect(getPreview(user,'draft')).rejects.toMatchObject({status:503})})
 it('owner lookup precedes media access',async()=>{m.draft.mockRejectedValue(Error('Not found'));await expect(getPreview(user,'draft')).rejects.toThrow();expect(m.photos).not.toHaveBeenCalled()})
})
