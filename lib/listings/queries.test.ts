import { beforeEach,afterEach,it,expect,vi } from 'vitest'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { buildPreview } from '@/lib/preview/model'
import { getPostingLocations } from '@/lib/location/queries'
import type { Draft } from '@/lib/drafts/types'
vi.mock('server-only',()=>({}))
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>({value:'owner-token'})})}))
vi.mock('@/lib/auth/provider',()=>({authConfig:()=>m.config}))
const m=vi.hoisted(()=>({preview:vi.fn(),photos:vi.fn(),read:vi.fn(),config:{base:'https://test.invalid/auth/v1',key:'public-key'}}))
vi.mock('@/lib/preview/queries',()=>({getPreview:m.preview}))
vi.mock('@/lib/media/queries',()=>({listPhotos:m.photos,readPhoto:m.read}))
import {submitListing,changeListing,getPublishedListing,readSubmittedPhoto} from './queries'
const user={id:'owner',email:'account@example.com'},id='a9140f33-a429-46f3-9514-3e8f32f18189',hash='a'.repeat(64)
const draft:Draft={id,owner_id:user.id,collection_id:'collection',revision:1,created_at:'2026-10-13',updated_at:'2026-10-13',page_path:'/post',role:'OWNER',intent:'buy',type:'APARTMENT',bhk:'2',baths:'2',unit:'sqft',carpet:'1000',furnishing:'UNFURNISHED',floor:'3',floors:'8',status:'READY',age:'4',city:'kolkata',locality:'new-town',address:'Test building address',saleprice:'6000000',maintenance:'none',negotiable:'yes'}
const bytes=await sharp({create:{width:640,height:480,channels:3,background:'#557755'}}).jpeg().toBuffer()
const photo={id:'photo',status:'ready' as const,collection_id:'collection',original_name:'test.jpg',position:3,width:640,height:480,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}
function stableSubmissionId(){const h=createHash('sha256').update(`submission:owner:${id}:${hash}:0`).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`}
const preview={draft,model:buildPreview(draft,[photo],'Seller',getPostingLocations(),'2026-10-13'),confirmed:true,signature:hash}
let listing:Record<string,unknown>|null=null,copyFailure=false,rpcFailure=false
beforeEach(()=>{
 vi.clearAllMocks();m.config.key='public-key';vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','server-secret');listing=null;copyFailure=false;rpcFailure=false;m.preview.mockResolvedValue(preview);m.photos.mockResolvedValue([photo]);m.read.mockImplementation(()=>Promise.resolve(new Response(bytes)))
 vi.stubGlobal('fetch',vi.fn(async(url:string,init:RequestInit)=>{
  if(url.includes('/rest/v1/property_listings?'))return Response.json(listing?[listing]:[])
  if(url.includes('/storage/v1/object/listing-photos/'))return new Response(null,{status:copyFailure?503:200})
  if(url.includes('/rpc/submit_property_listing')){if(rpcFailure)return new Response(null,{status:503});const b=JSON.parse(init.body as string);return Response.json([{id:b.p_listing,owner_id:'owner',draft_id:id,status:'UNDER_REVIEW',version:1,current_submission_id:b.p_request}])}
  if(url.includes('/rpc/change_property_listing'))return Response.json({id:'listing',owner_id:'owner',draft_id:id,status:'DELETED',version:2})
  throw Error('Unexpected fetch '+url)
 }))
})
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})
it('validates bytes, copies immutable files and records a normalized submission',async()=>{
 const result=await submitListing(user,id,hash,0);expect(result.status).toBe('UNDER_REVIEW')
 const calls=vi.mocked(fetch).mock.calls,rpc=calls.find(([url])=>String(url).includes('/rpc/submit_property_listing'))!,payload=JSON.parse(rpc[1]!.body as string)
 expect(payload.p_photos[0].position).toBe(3);expect(payload.p_snapshot.price).toBe(6000000);expect(payload.p_snapshot.seller_name).toBe('Seller');expect(JSON.stringify(payload)).not.toContain('account@example.com')
 expect(calls.find(([url])=>String(url).includes('/storage/'))?.[1]?.headers).toMatchObject({Authorization:'Bearer server-secret'})
})
it('rejects stale or unconfirmed preview before copying',async()=>{m.preview.mockResolvedValue({...preview,confirmed:false});await expect(submitListing(user,id,hash,0)).rejects.toMatchObject({status:409});expect(m.read).not.toHaveBeenCalled()})
it('foreign draft failure never uses privileged credentials',async()=>{m.preview.mockRejectedValue(Error('Not found'));await expect(submitListing(user,id,hash,0)).rejects.toThrow();expect(vi.mocked(fetch).mock.calls.every(([,r])=>!JSON.stringify(r?.headers).includes('server-secret'))).toBe(true)})
it('corrupt stored photo stops before storage copy',async()=>{m.read.mockResolvedValue(new Response('broken'));await expect(submitListing(user,id,hash,0)).rejects.toMatchObject({status:422});expect(vi.mocked(fetch).mock.calls.some(([url])=>String(url).includes('/storage/'))).toBe(false)})
it('copy failure never writes a submission',async()=>{copyFailure=true;await expect(submitListing(user,id,hash,0)).rejects.toMatchObject({status:503});expect(vi.mocked(fetch).mock.calls.some(([url])=>String(url).includes('/rpc/'))).toBe(false)})
it('rechecks content after copying before committing',async()=>{m.preview.mockResolvedValueOnce(preview).mockResolvedValueOnce({...preview,signature:'b'.repeat(64)});await expect(submitListing(user,id,hash,0)).rejects.toMatchObject({status:409});expect(vi.mocked(fetch).mock.calls.some(([url])=>String(url).includes('/rpc/'))).toBe(false)})
it('unknown commit failure keeps the same retry identity',async()=>{rpcFailure=true;await expect(submitListing(user,id,hash,0)).rejects.toMatchObject({status:503});expect(vi.mocked(fetch).mock.calls.some(([,r])=>r?.method==='DELETE')).toBe(false)})
it('lost response retry retains a later rejection without touching photos',async()=>{listing={id:'listing',owner_id:user.id,draft_id:id,current_submission_id:stableSubmissionId(),status:'REJECTED',version:2};const r=await submitListing(user,id,hash,0);expect(r.status).toBe('REJECTED');expect(m.preview).not.toHaveBeenCalled();expect(m.read).not.toHaveBeenCalled()})
it('missing service configuration is honest and preserves draft',async()=>{vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','');await expect(submitListing(user,id,hash,0)).rejects.toMatchObject({status:503});expect(m.read).not.toHaveBeenCalled()})
it('owner change checks identity before service write',async()=>{await expect(changeListing(user,id,'delete',1)).rejects.toMatchObject({status:404});expect(vi.mocked(fetch).mock.calls).toHaveLength(1)})
it('public read never uses the privileged key and expired rows disappear',async()=>{listing={id,status:'ACTIVE',expires_at:'2026-01-01',current_submission_id:stableSubmissionId()};expect(await getPublishedListing(id)).toBeNull();expect(vi.mocked(fetch).mock.calls[0]?.[1]?.headers).toMatchObject({Authorization:'Bearer public-key'})})

it('modern server secret uses apikey without posing as a JWT',async()=>{vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','sb_secret_test');await submitListing(user,id,hash,0);const headers=vi.mocked(fetch).mock.calls.find(([url])=>String(url).includes('/rpc/'))?.[1]?.headers;expect(headers).toMatchObject({apikey:'sb_secret_test'});expect(headers).not.toHaveProperty('Authorization')})
it('modern public key uses apikey without the server credential',async()=>{m.config.key='sb_publishable_test';await getPublishedListing(id);const headers=vi.mocked(fetch).mock.calls[0]?.[1]?.headers;expect(headers).toMatchObject({apikey:'sb_publishable_test'});expect(headers).not.toHaveProperty('Authorization')})

it('foreign submitted photo never touches storage or privileged credentials',async()=>{await expect(readSubmittedPhoto(user,id,'photo')).rejects.toMatchObject({status:404});expect(vi.mocked(fetch).mock.calls).toHaveLength(1)})
