import http from 'node:http'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const BASE=process.env.BASE_URL??'http://localhost:3101',owner='a9140f33-a429-46f3-9514-3e8f32f18189',foreign='b9140f33-a429-46f3-9514-3e8f32f18189',id='c9140f33-a429-46f3-9514-3e8f32f18189',collection='d9140f33-a429-46f3-9514-3e8f32f18189',photoId='e9140f33-a429-46f3-9514-3e8f32f18189'
let draft={id,owner_id:owner,collection_id:collection,revision:1,created_at:'2026-10-13',updated_at:'2026-10-13',page_path:'/post',role:'OWNER',intent:'buy',type:'APARTMENT',bhk:'2',baths:'2',unit:'sqft',carpet:'1000',furnishing:'UNFURNISHED',floor:'3',floors:'8',status:'READY',age:'4',city:'kolkata',locality:'new-town',address:'Test building address',saleprice:'6000000',maintenance:'none',negotiable:'yes'}
const binary=await sharp({create:{width:640,height:480,channels:3,background:'#557755'}}).jpeg().toBuffer(),hash=createHash('sha256').update(binary).digest('hex')
const photos=[{id:photoId,collection_id:collection,original_name:'private.jpg',status:'ready',position:0,width:640,height:480,bytes:binary.length,sha256:hash}],objects=new Map(),history=[]
let review=null,listing=null,submission=null,manifest=[],unavailable=false,failCopy=false
const event=(next,reason=null)=>{history.unshift({id:history.length+1,listing_id:listing.id,from_status:listing.status,to_status:next,reason,actor_type:next==='ACTIVE'||next==='REJECTED'?'OPERATOR':'OWNER',actor_id:owner,created_at:new Date().toISOString()});listing={...listing,status:next,version:listing.version+1,rejection_reason:reason}}
const active=()=>listing?.status==='ACTIVE'&&Date.parse(listing.expires_at)>Date.now()
const mock=http.createServer(async(req,res)=>{
 const chunks=[];for await(const c of req)chunks.push(c)
 const url=new URL(req.url,'http://localhost'),token=req.headers.authorization?.slice(7),user=token==='a'.repeat(48)?owner:token==='b'.repeat(48)?foreign:null,service=token==='test-service-key',publicRead=token==='test-public-key',body=Buffer.concat(chunks)
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))}
 if(url.pathname==='/auth/v1/user')return user?send(200,{id:user,email:'private@example.com'}):send(401,{})
  if (url.pathname === '/rest/v1/rpc/my_account_access') return send(200, true)
 if(!user&&!service&&!publicRead)return send(401,{})
 if(unavailable)return send(503,{})
 if(url.pathname==='/rest/v1/saved_properties')return send(200,[])
 if(url.pathname==='/rest/v1/property_drafts')return send(200,user===owner?[draft]:[])
 if(url.pathname==='/rest/v1/buyer_profiles')return send(200,user===owner?[{id:owner,full_name:'Test Seller',contact_phone:'9999999999',preferred_intent:'both',preferred_locality:null,email_updates:false,updated_at:'2026-10-13T12:00:00Z'}]:[])
 if(url.pathname==='/rest/v1/media_assets')return send(200,user===owner?photos:[])
 if(url.pathname==='/rest/v1/property_draft_reviews'){if(req.method==='POST'&&user===owner)review=JSON.parse(body);return send(200,user===owner&&review?[review]:[])}
 if(url.pathname==='/rest/v1/property_listings')return send(200,listing&&(user===owner||publicRead&&active())?[listing]:[])
 if(url.pathname==='/rest/v1/property_listing_events')return send(200,user===owner?history:[])
 if(url.pathname==='/rest/v1/property_listing_submissions')return send(200,submission&&(user===owner||publicRead&&active())?[submission]:[])
 if(url.pathname==='/rest/v1/property_listing_photos')return send(200,user===owner||publicRead&&active()?manifest:[])
 if(url.pathname==='/rest/v1/rpc/submit_property_listing'){
  if(!service)return send(403,{})
  const b=JSON.parse(body);if(b.p_owner!==owner||(listing?.version??0)!==b.p_version||listing?.status==='DELETED')return send(400,{})
  listing??={id:b.p_listing,owner_id:owner,draft_id:id,version:0,status:'DRAFT',created_at:new Date().toISOString()}
  submission={...b.p_snapshot,id:b.p_request,listing_id:listing.id,created_at:new Date().toISOString()};manifest=b.p_photos
  listing={...listing,current_submission_id:b.p_request,activated_at:null,expires_at:null};event('UNDER_REVIEW');return send(200,[listing])
 }
 if(url.pathname==='/rest/v1/rpc/change_property_listing'){
  if(!service)return send(403,{})
  const b=JSON.parse(body);if(b.p_owner!==owner||!listing||listing.version!==b.p_version||listing.status==='DELETED')return send(400,{})
  event(b.p_action==='delete'?'DELETED':'DRAFT');return send(200,[listing])
 }
 if(url.pathname.startsWith('/storage/v1/object/authenticated/property-photos/')&&user===owner){res.writeHead(200,{'Content-Type':'image/jpeg'});return res.end(binary)}
 if(url.pathname.startsWith('/storage/v1/object/listing-photos/')&&service){if(failCopy)return send(503,{});const path=url.pathname.split('/listing-photos/')[1];if(objects.has(path))return send(409,{});objects.set(path,body);return send(200,{})}
 if(url.pathname.startsWith('/storage/v1/object/authenticated/listing-photos/')){
  const path=url.pathname.split('/listing-photos/')[1],data=objects.get(path)
  if(data&&(service||user===owner||publicRead&&active()&&manifest.some(p=>p.object_path===path))){res.writeHead(200,{'Content-Type':'image/jpeg'});return res.end(data)}return send(404,{})
 }
 return send(404,{})
})
await new Promise(r=>mock.listen(3300,'127.0.0.1',r))
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??chromium.executablePath()});let count=0
const check=(name,ok)=>{if(!ok)throw Error(name);count++;console.log('ok',name)}
async function context(token){const c=await browser.newContext({viewport:{width:390,height:844}});if(token)await c.addCookies([{name:'gb-access',value:token.repeat(48),url:BASE}]);return c}
try{
 const guest=await context(),g=await guest.newPage();await g.goto(BASE+`/post/drafts/${id}/lifecycle`);check('guest routed to login',new URL(g.url()).pathname==='/login')
 const c=await context('a'),page=await c.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(BASE+`/post/drafts/${id}/preview`);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Confirm review',exact:true}).click();await page.getByText('Review confirmed. Your property is still private and unpublished.').waitFor()
 await page.getByRole('link',{name:'Publishing status →'}).click();await page.getByRole('heading',{name:'Property publishing',exact:true}).waitFor();check('submission requires explicit acknowledgement',await page.getByRole('button',{name:'Submit for review',exact:true}).isEnabled()===false)
 await page.getByRole('checkbox').first().check();failCopy=true;await page.getByRole('button',{name:'Submit for review',exact:true}).click();await page.getByRole('alert').getByText(/Could not copy/).waitFor();check('failed copy does not submit',listing===null)
 failCopy=false;await page.getByRole('button',{name:'Submit for review',exact:true}).click();await page.getByRole('status').filter({hasText:/^Under review$/}).waitFor();check('submission stores actual byte copy',objects.size===1&&manifest[0].sha256===hash)
 const submittedPage=await c.newPage();await submittedPage.goto(BASE+`/post/drafts/${id}/submitted`);await submittedPage.getByRole('heading',{name:/2 BHK/}).waitFor();const submittedImage=submittedPage.locator('section[aria-label="Property photos"] img').first();await submittedImage.waitFor();await submittedImage.evaluate(e=>e.decode());check('owner can inspect private submitted copy',await submittedImage.evaluate(e=>e.naturalWidth===640))
 const publicPath=`/listing/${listing.id}`,publicPage=await guest.newPage();await publicPage.goto(BASE+publicPath);check('under review details hidden',await publicPage.getByRole('heading',{name:/2 BHK/}).count()===0)
 event('REJECTED','Please supply a clearer entrance photo');await page.reload();await page.getByText('Please supply a clearer entrance photo',{exact:false}).first().waitFor();check('rejection reason visible',await page.getByRole('button',{name:'Re-submit for review',exact:true}).count()===1)
 await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:'Re-submit for review',exact:true}).click();await page.getByRole('status').filter({hasText:/^Under review$/}).waitFor()
 event('ACTIVE');listing={...listing,activated_at:new Date().toISOString(),expires_at:new Date(Date.now()+86400000).toISOString()};await page.reload();await page.getByRole('link',{name:'View public listing →'}).waitFor()
 await publicPage.goto(BASE+publicPath);await publicPage.getByRole('heading',{name:/2 BHK/}).waitFor();const img=publicPage.locator('section[aria-label="Property photos"] img').first();await img.waitFor();await img.evaluate(e=>e.decode());check('public copied JPEG loads',await img.evaluate(e=>e.naturalWidth===640));check('private phone omitted',!(await publicPage.locator('article').innerText()).includes('9999999999'))
 draft={...draft,revision:2,saleprice:'7000000'};await publicPage.reload();check('working draft edit does not change submitted price',await publicPage.getByText('₹70 L',{exact:true}).count()===0&&await publicPage.getByText('₹60 L',{exact:true}).first().isVisible())
 await page.getByRole('button',{name:'Withdraw to draft',exact:true}).click();await page.getByRole('status').filter({hasText:/^Draft$/}).waitFor();await publicPage.reload();check('withdraw hides buyer details',await publicPage.getByRole('heading',{name:/2 BHK/}).count()===0);check('withdraw hides public copies',(await guest.request.get(BASE+`/api/listings/${listing.id}/photos/${photoId}`)).status()===404)
 await page.goto(BASE+`/post/drafts/${id}/preview`);await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Confirm review',exact:true}).click();await page.getByText('Review confirmed. Your property is still private and unpublished.').waitFor();await page.getByRole('link',{name:'Publishing status →'}).click();await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:'Submit for review',exact:true}).click();await page.getByRole('status').filter({hasText:/^Under review$/}).waitFor()
 check('delete requires separate acknowledgement',await page.getByRole('button',{name:'Delete listing',exact:true}).isDisabled());await page.getByRole('checkbox').last().check();await page.getByRole('button',{name:'Delete listing',exact:true}).click();await page.getByRole('status').filter({hasText:/^Deleted$/}).waitFor();check('deleted has no resubmit action',await page.getByRole('button',{name:/Submit for review|Re-submit for review/i}).count()===0)
 const other=await context('b'),op=await other.newPage();await op.goto(BASE+`/post/drafts/${id}/lifecycle`);check('foreign lifecycle hidden',await op.getByRole('heading',{name:'Property publishing',exact:true}).count()===0)
 check('guest mutation denied',(await guest.request.post(BASE+'/api/posting/lifecycle',{headers:{Origin:BASE},data:{id,version:0,action:'delete',accepted:true}})).status()===401)
 check('cross-origin mutation denied',(await c.request.post(BASE+'/api/posting/lifecycle',{headers:{Origin:'https://evil.test'},data:{id,version:0,action:'delete',accepted:true}})).status()===403)
 mkdirSync('/tmp/phase18-shots',{recursive:true});for(const width of [390,412,768,1280]){await page.setViewportSize({width,height:900});check('no overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`/tmp/phase18-shots/status-${width}.png`,fullPage:true})}
 unavailable=true;await page.reload();await page.getByRole('heading',{name:'Publishing status unavailable'}).waitFor();check('outage not empty success',await page.getByRole('button',{name:'Submit for review',exact:true}).count()===0);check('no client runtime errors',errors.length===0)
 console.log(count+' listing lifecycle browser checks passed')
}finally{await browser.close();await new Promise(r=>mock.close(r))}
