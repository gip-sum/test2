// Human moderation against an isolated Auth/REST/storage simulator. All data SAMPLE.
import http from 'node:http'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { chromium } from 'playwright-core'
const BASE=process.env.BASE_URL??'http://localhost:3101', id=(k,n=1)=>`${k}9140f33-a429-46f3-9514-${String(n).padStart(12,'0')}`
const owner=id('a'),admin=id('b'),mod=id('b',2),foreign=id('b',3),listingId=id('d'),draftId=id('c'),sid=id('e'),photoId=id('8'),collection=id('9')
const at=()=>new Date().toISOString(), binary=await sharp({create:{width:640,height:480,channels:3,background:'#eeeeee'}}).jpeg().toBuffer(),hash=createHash('sha256').update(binary).digest('hex')
const draft={id:draftId,owner_id:owner,collection_id:collection,revision:1,page_path:'/post',created_at:at(),updated_at:at(),role:'OWNER',intent:'buy',type:'APARTMENT',bhk:'2',baths:'2',unit:'sqft',carpet:'1000',furnishing:'UNFURNISHED',floor:'3',floors:'8',status:'READY',age:'4',city:'kolkata',locality:'new-town',address:'SAMPLE building address',saleprice:'6000000',maintenance:'none',negotiable:'yes',description:'SAMPLE description from saved facts.'}
const original={id:sid,listing_id:listingId,draft_revision:1,preview_hash:'a'.repeat(64),title:'SAMPLE submitted home',seller_name:'SAMPLE seller',seller_type:'OWNER',intent:'buy',property_type:'APARTMENT',bedrooms:2,bathrooms:2,area_unit:'sqft',carpet_area:1000,built_up_area:null,super_area:null,furnishing:'UNFURNISHED',floor:3,total_floors:8,construction_status:'READY',age_years:4,possession_by:null,available_from:null,city_name:'Kolkata',locality_name:'New Town',city_id:'kolkata',locality_id:'new-town',sub_locality_id:null,society_name:null,address:draft.address,latitude:null,longitude:null,price:6000000,deposit:null,maintenance_status:'none',maintenance_monthly:null,negotiable:true,description:draft.description,created_at:at()}
const photos=[{id:photoId,collection_id:collection,original_name:'SAMPLE.jpg',status:'ready',position:0,width:640,height:480,bytes:binary.length,sha256:hash}],objects=new Map([[`${sid}/${photoId}.jpg`,binary]])
let listing,submission,manifest,actions,events,confirmed=null,down=false,fail=false,lose=false,revoked=false,delay=0,requests=[]
function reset(){listing={id:listingId,owner_id:owner,draft_id:draftId,current_submission_id:sid,status:'UNDER_REVIEW',version:1,created_at:at(),updated_at:at(),activated_at:null,expires_at:null,rejection_reason:null};submission={...original};manifest=[{...photos[0],submission_id:sid,source_id:photoId,object_path:`${sid}/${photoId}.jpg`}];actions=[];events=[];confirmed=null;requests=[]}
reset()
const mock=http.createServer(async(req,res)=>{
 const chunks=[];for await(const c of req)chunks.push(c)
 const body=Buffer.concat(chunks),url=new URL(req.url,'http://localhost'),token=req.headers.authorization?.slice(7),user={['a'.repeat(48)]:owner,['b'.repeat(48)]:admin,['c'.repeat(48)]:mod,['d'.repeat(48)]:foreign}[token],service=token==='test-service-key',reviewer=user===admin||user===mod&&!revoked
 const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value))},b=body.length&&req.headers['content-type']?.includes('application/json')?JSON.parse(body.toString()):{}
 if(url.pathname==='/auth/v1/user')return user?send(200,{id:user,email:'sample@example.com'}):send(401,{})
  if (url.pathname === '/rest/v1/rpc/my_account_access') return send(200, true)
 if(url.pathname==='/rest/v1/rpc/my_staff_role')return send(200,user===admin?'ADMIN':user===mod&&!revoked?'MODERATOR':null)
 if(url.pathname==='/rest/v1/rpc/moderation_queue')return reviewer?send(200,{total:listing.status==='UNDER_REVIEW'?1:0,rows:listing.status==='UNDER_REVIEW'?[{...submission,...listing,title:submission.title,submitted_at:submission.created_at,total:1}]:[]}):send(403,{code:'42501'})
 if(url.pathname==='/rest/v1/rpc/moderation_review'){if(!reviewer)return send(403,{code:'42501'});if(down)return send(503,{});if(b.p_listing!==listingId)return send(404,{code:'P0002'});return send(200,{listing,submission,photos:manifest,history:actions})}
 if(url.pathname==='/rest/v1/rpc/moderation_photo')return reviewer&&b.p_listing===listingId&&b.p_submission===submission.id&&b.p_photo===photoId?send(200,`${submission.id}/${photoId}.jpg`):send(404,{code:'P0002'})
 if(url.pathname==='/rest/v1/rpc/moderation_decide'){
  requests.push(b);if(!reviewer)return send(403,{code:'42501'});if(fail)return send(503,{})
  if(delay)await new Promise(r=>setTimeout(r,delay))
  const existing=actions.find(a=>a.id===b.p_request);if(existing)return send(200,existing)
  if(listing.status!=='UNDER_REVIEW'||listing.version!==b.p_version||submission.id!==b.p_submission)return send(409,{code:'40001'})
  const status=b.p_action==='APPROVE'?'ACTIVE':b.p_action==='REJECT'?'REJECTED':'CHANGES_REQUESTED',a={id:b.p_request,listing_id:listingId,submission_id:submission.id,actor_id:user,action:b.p_action,reason:b.p_reason,approval_days:b.p_days,expires_at:b.p_action==='APPROVE'?new Date(Date.now()+b.p_days*86400000).toISOString():null,version_before:listing.version,version_after:listing.version+1,created_at:at()}
  events.unshift({id:events.length+1,listing_id:listingId,from_status:'UNDER_REVIEW',to_status:status,actor_type:'OPERATOR',actor_id:user,reason:b.p_reason,created_at:at()});listing={...listing,status,version:listing.version+1,updated_at:at(),activated_at:status==='ACTIVE'?at():null,expires_at:a.expires_at,rejection_reason:status==='ACTIVE'?null:b.p_reason};actions.unshift(a);if(status!=='ACTIVE')confirmed=null
  if(lose){lose=false;return send(503,{})}return send(200,a)
 }
 if(url.pathname==='/rest/v1/property_drafts')return send(200,user===owner?[draft]:[])
 if(url.pathname==='/rest/v1/property_listings')return send(200,user===owner||!user&&listing.status==='ACTIVE'?[listing]:[])
 if(url.pathname==='/rest/v1/property_listing_submissions')return send(200,user===owner||!user&&listing.status==='ACTIVE'?[submission]:[])
 if(url.pathname==='/rest/v1/property_listing_photos')return send(200,user===owner||!user&&listing.status==='ACTIVE'?manifest:[])
 if(url.pathname==='/rest/v1/property_listing_events')return send(200,user===owner?events:[])
 if(url.pathname==='/rest/v1/media_assets')return send(200,user===owner?photos:[])
 if(url.pathname==='/rest/v1/buyer_profiles')return send(200,user===owner?[{id:owner,full_name:'SAMPLE seller',contact_phone:null,preferred_intent:'both',preferred_locality:null,email_updates:false,updated_at:at()}]:[])
 if(url.pathname==='/rest/v1/property_draft_reviews'){if(req.method==='POST'&&user===owner){confirmed=b;return send(201,[confirmed])}return send(200,user===owner&&confirmed?[confirmed]:[])}
 if(url.pathname==='/rest/v1/rpc/submit_property_listing'){
  if(!service||!confirmed)return send(409,{})
  submission={...b.p_snapshot,id:b.p_request,listing_id:listingId,created_at:at()};manifest=b.p_photos;listing={...listing,status:'UNDER_REVIEW',version:listing.version+1,current_submission_id:submission.id,rejection_reason:null,updated_at:at()};return send(200,[listing])
 }
 if(url.pathname.startsWith('/storage/v1/object/listing-photos/')&&service){const path=url.pathname.split('/listing-photos/')[1];if(objects.has(path))return send(409,{});objects.set(path,body);return send(200,{})}
 if(url.pathname.startsWith('/storage/v1/object/authenticated/property-photos/')&&user===owner){res.writeHead(200,{'Content-Type':'image/jpeg'});return res.end(binary)}
 if(url.pathname.startsWith('/storage/v1/object/authenticated/listing-photos/')){const path=url.pathname.split('/listing-photos/')[1],data=objects.get(path);if(data&&(reviewer||user===owner||service||!user&&listing.status==='ACTIVE')){res.writeHead(200,{'Content-Type':'image/jpeg'});return res.end(data)}return send(404,{})}
 if(['/rest/v1/saved_properties','/rest/v1/saved_listings','/rest/v1/rpc/owner_listing_enquiry_counts'].includes(url.pathname))return send(200,[])
 return send(404,{})
})
await new Promise(r=>mock.listen(3300,'127.0.0.1',r))
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??chromium.executablePath()})
let count=0;const check=(name,ok,detail='')=>{if(!ok)throw Error(name+' '+detail);count++;console.log('ok',name)}
async function context(token){const c=await browser.newContext({viewport:{width:1280,height:900}});if(token)await c.addCookies([{name:'gb-access',value:token.repeat(48),url:BASE}]);return c}
try{
 const guest=await context(),ordinary=await context('d'),staff=await context('c'),seller=await context('a'),page=await staff.newPage(),ownerPage=await seller.newPage()
 const url=`${BASE}/admin/moderation/${listingId}`,input={listing:listingId,submission:sid,version:1,action:'APPROVE',days:90,reason:null,request:id('f'),accepted:true}
 const guestPage=await guest.newPage();await guestPage.goto(url);check('guest review goes to login',guestPage.url().includes('/login?next='))
 check('guest mutation returns private JSON 401',(await guest.request.post(BASE+'/api/admin/moderation',{headers:{Origin:BASE},data:input})).status()===401)
 check('ordinary account cannot decide',(await ordinary.request.post(BASE+'/api/admin/moderation',{headers:{Origin:BASE},data:input})).status()===404)
 const privatePhoto=`${BASE}/api/admin/moderation/${listingId}/photos/${photoId}?submission=${sid}`
 check('ordinary account cannot see private staff photos',(await ordinary.request.get(privatePhoto)).status()===404)
 check('moderator cannot open admin overview',(await page.goto(BASE+'/admin')).status()===404)
 await page.goto(BASE+'/admin/moderation?page=2');check('pagination stays in URL',page.url().includes('page=2'))
 await page.getByRole('link',{name:'SAMPLE submitted home',exact:true}).filter({visible:true}).click();await page.getByRole('heading',{name:'Review submitted listing',exact:true}).waitFor()
 check('review shows the saved facts and description',await page.getByText(draft.description,{exact:true}).isVisible())
 const image=page.locator('section[aria-label="Property photos"] img').first();await image.evaluate(e=>e.decode())
// UI-22: the review gallery asks the staff route for the slot's width (`&w=`) instead of the original; it is never enlarged past the 640px fixture and stays private.
const shown=new URL(await image.evaluate(e=>e.currentSrc));const sizedPhoto=await page.request.get(shown.href)
check('private immutable JPEG loads, sized by the staff route',shown.pathname.startsWith('/api/admin/moderation/')&&Number(shown.searchParams.get('w'))>0&&await image.evaluate(e=>e.naturalWidth>0&&e.naturalWidth<=640)&&sizedPhoto.headers()['cache-control']==='private, no-store'&&sizedPhoto.headers()['content-type']==='image/jpeg',shown.href)
 // UI-20: the review workspace — jump links that work as plain anchors, the facts worth checking said in words, and each decision's consequence beside it.
 const jumps=await page.getByRole('navigation',{name:'Sections of this submission'}).getByRole('link').evaluateAll(l=>l.map(a=>a.getAttribute('href')))
 check('every section jump link has its target',JSON.stringify(jumps)===JSON.stringify(['#photos','#terms','#facts','#area','#location','#description','#history'])&&(await Promise.all(jumps.map(h=>page.locator(h).count()))).every(n=>n===1))
 const facts=(await page.getByRole('region',{name:'Before you decide'}).innerText()).replace(/\s+/g,' ')
 check('before you decide states facts, not a score',/\d+ photos?/.test(facts)&&/Description supplied|No description/.test(facts)&&/earlier decision/.test(facts)&&!/score|risk|recommend/i.test(facts),facts)
 const described=await page.getByRole('group',{name:'Choose a decision'}).getByRole('radio').evaluateAll(r=>r.map(e=>[e.value,document.getElementById(e.getAttribute('aria-describedby'))?.textContent]))
 check('each of the three decisions is described by its consequence',JSON.stringify(described.map(d=>d[0]))===JSON.stringify(['APPROVE','REQUEST_CORRECTION','REJECT'])&&described[0][1].startsWith('Publishes')&&described.slice(1).every(d=>d[1].startsWith('Not published')))
 // UI-11: the decision button is never disabled as a hint; a press checks the input, sends nothing, marks the field and focuses it.
 const sentBefore=requests.length,confirmBox=page.getByRole('checkbox')
 await page.getByRole('button',{name:'Approve listing',exact:true}).click()
 check('confirmation is required: nothing is sent, the box is marked and focused',requests.length===sentBefore&&await confirmBox.evaluate(e=>e===document.activeElement&&e.getAttribute('aria-invalid')==='true'&&e.getAttribute('aria-describedby')==='review-confirm-error')&&(await page.locator('#review-confirm-error').innerText()).includes('Confirm this decision'))
 await page.getByLabel('Public validity in days').fill('0');await confirmBox.check();await page.getByRole('button',{name:'Approve listing',exact:true}).click()
 check('an invalid validity period is marked on its field and focuses it',requests.length===sentBefore&&await page.getByLabel('Public validity in days').evaluate(e=>e===document.activeElement&&e.getAttribute('aria-invalid')==='true')&&(await page.locator('#review-days-error').innerText()).includes('1 to 180'))
 await page.getByLabel('Public validity in days').fill('90')
 check('editing a field asks for a fresh confirmation and clears that field\'s error',!await confirmBox.isChecked()&&await page.locator('#review-days-error').count()===0)
 await page.getByRole('radio',{name:'Reject',exact:true}).check();await confirmBox.check();await page.getByRole('button',{name:'Reject listing',exact:true}).click()
 check('Reject is the consequential act: a danger button, its consequence said beside it',/bg-danger-600/.test(await page.getByRole('button',{name:'Reject listing',exact:true}).getAttribute('class'))&&(await page.locator('.admin-decision-foot').innerText()).includes('stays private'))
 check('a rejection without a reason is marked on the reason and focuses it',requests.length===sentBefore&&await page.getByLabel('Reason for the seller (required)').evaluate(e=>e===document.activeElement&&e.getAttribute('aria-invalid')==='true'&&e.getAttribute('aria-describedby').split(' ').includes('review-reason-error')))
 check('decision fields use the shared 16px field frame',await page.getByLabel('Reason for the seller (required)').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16&&e.getBoundingClientRect().height>=44))
 for(const width of [320,360,375,390,412,430,768,1280]){await page.setViewportSize({width,height:900});check('review does not overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));check('decision labels have 44px targets '+width,await page.locator('form label').evaluateAll(labels=>labels.filter(e=>e.querySelector('input[type="radio"],input[type="checkbox"]')).every(e=>e.getBoundingClientRect().height>=44)))}
 await page.getByRole('radio',{name:'Request corrections',exact:true}).check();await page.getByLabel('Reason for the seller (required)').fill('Please replace the unclear photographs');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Request corrections',exact:true}).click();await page.getByRole('status').filter({hasText:/^Corrections requested$/}).waitFor()
 check('correction has its own status and recorded reason',await page.getByRole('heading',{name:'Corrections requested',exact:true}).isVisible())
 await ownerPage.goto(BASE+'/dashboard?status=corrections');check('seller correction filter and reason are real',await ownerPage.getByText('Please replace the unclear photographs',{exact:false}).isVisible())
 await ownerPage.goto(BASE+`/post/drafts/${draftId}/lifecycle`);check('correction requires fresh preview confirmation',await ownerPage.getByText('Confirm the current preview before submitting.').isVisible())
 await ownerPage.getByRole('link',{name:'Review preview',exact:true}).click();await ownerPage.getByText('Private preview · Not published',{exact:true}).waitFor();const confirm=ownerPage.getByRole('checkbox',{name:'I have checked the property details, pricing, seller name and photos.'});check('saved draft is ready for a fresh confirmation',await confirm.isEnabled());await confirm.check();await ownerPage.getByRole('button',{name:'Confirm review',exact:true}).click();await ownerPage.getByRole('status').filter({hasText:/Review confirmed/}).waitFor();await ownerPage.getByRole('link',{name:'Publishing status →',exact:true}).click();await ownerPage.getByRole('checkbox').filter({visible:true}).first().check();await ownerPage.getByRole('button',{name:'Re-submit for review',exact:true}).click();await ownerPage.getByRole('status').filter({hasText:/^Under review$/}).waitFor()
 check('seller correction re-submit creates a new immutable copy',submission.id!==sid&&listing.status==='UNDER_REVIEW')
 reset();await page.goto(url);await page.getByRole('radio',{name:'Reject',exact:true}).check();await page.getByLabel('Reason for the seller (required)').fill('The listing information needs correction');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Reject listing',exact:true}).click();await page.getByRole('status').filter({hasText:/^Rejected$/}).waitFor();check('rejection recorded with actor',actions[0].actor_id===mod&&actions[0].action==='REJECT')
 reset();await page.goto(url);const stale=await staff.newPage();await stale.goto(url);listing.version++
 await stale.getByRole('checkbox').check();const conflict=stale.waitForResponse(r=>r.url().endsWith('/api/admin/moderation')&&r.request().method()==='POST');await stale.getByRole('button',{name:'Approve listing',exact:true}).click();const conflictResponse=await conflict;check('stale decision returns conflict',conflictResponse.status()===409,await conflictResponse.text());const conflictMessage=stale.locator('form [role=alert]');await conflictMessage.waitFor();check('stale version asks for refresh',(await conflictMessage.innerText()).includes('This listing or decision changed'),await conflictMessage.innerText());await stale.close()
 reset();await page.goto(url);fail=true;await page.getByRole('checkbox').focus();await page.keyboard.press('Space');const failedResponse=page.waitForResponse(r=>r.url().endsWith('/api/admin/moderation')&&r.request().method()==='POST');await page.getByRole('button',{name:'Approve listing',exact:true}).focus();await page.keyboard.press('Enter');check('outage returns unavailable', (await failedResponse).status()===503);await page.locator('form [role=alert]').waitFor();check('keyboard confirmation works and outage preserves it for retry',await page.getByRole('checkbox').isChecked());fail=false;lose=true;delay=400
 const sentAtStart=requests.length
 await page.getByRole('button',{name:'Approve listing',exact:true}).click();await page.getByText('Saving the review decision.',{exact:true}).waitFor();check('busy state is announced',await page.locator('form').getAttribute('aria-busy')==='true')
 check('the busy button keeps focus and is marked unavailable, not disabled',await page.getByRole('button',{name:'Saving decision…',exact:true}).evaluate(e=>e===document.activeElement&&!e.disabled&&e.getAttribute('aria-disabled')==='true'&&e.getAttribute('aria-busy')==='true'))
 await page.keyboard.press('Enter');await page.keyboard.press('Space')
 check('fields stay focusable while saving; edits are refused',await page.getByLabel('Public validity in days').evaluate(e=>!e.disabled&&!e.closest('fieldset:disabled')))
 await page.locator('form [role=alert]').waitFor()
 check('a second press while busy sent nothing',requests.length===sentAtStart+1,String(requests.length-sentAtStart))
 check('after a failure focus is still on the decision button',await page.getByRole('button',{name:'Approve listing',exact:true}).evaluate(e=>e===document.activeElement))
 check('the alert offers the shared Refresh review button',await page.locator('form [role=alert]').getByRole('button',{name:'Refresh review',exact:true}).isVisible())
 await page.getByRole('button',{name:'Approve listing',exact:true}).click();await page.getByRole('status').filter({hasText:/^Active$/}).waitFor();check('lost response retries the same UUID once',actions.length===1&&requests.every(r=>r.p_request===requests[0].p_request))
 await page.waitForFunction(()=>document.activeElement?.id==='listing-status')
 check('after the refresh focus lands on the changed status, whose live region reads it',await page.locator('#listing-status [role=status]').innerText()==='Active'&&await page.getByRole('heading',{name:'Decision unavailable',exact:true}).isVisible())
 const publicPage=await guest.newPage();await publicPage.goto(BASE+`/listing/${listingId}`);await publicPage.getByRole('heading',{name:'SAMPLE submitted home',exact:true}).waitFor();check('approval makes the saved copy public',await publicPage.getByText(draft.description,{exact:true}).isVisible());await publicPage.close()
 down=true;await page.goto(url);check('failed review is an error, not an empty property',await page.getByRole('heading',{name:'Review unavailable',exact:true}).isVisible());down=false
 revoked=true;check('revocation blocks photo immediately',(await staff.request.get(privatePhoto)).status()===404);revoked=false
 check('foreign origin cannot decide',(await staff.request.post(BASE+'/api/admin/moderation',{headers:{Origin:'https://foreign.test'},data:input})).status()===403)
 await page.goto(BASE+'/admin/moderation');check('empty review queue is honest',await page.getByRole('heading',{name:'No listings awaiting review',exact:true}).isVisible()&&await page.getByText(/stays private until someone decides/).isVisible()&&await page.locator('main ol.admin-rows').count()===0)
 // UI-11: no admin code or admin data reaches public or seller pages.
 reset();const scriptsOn=async(pg,path)=>{await pg.goto(BASE+path);return pg.locator('script[src]').evaluateAll(list=>list.map(e=>e.src))}
 const adminChunks=[];for(const src of await scriptsOn(page,`/admin/moderation/${listingId}`))if((await(await staff.request.get(src)).text()).includes('/api/admin/moderation'))adminChunks.push(src)
 check('the review form code is found on the review page',adminChunks.length>0)
 const guestPeek=await guest.newPage()
 for(const [pg,path] of [[guestPeek,'/'],[guestPeek,'/buy/kolkata'],[guestPeek,'/login'],[guestPeek,'/this-page-does-not-exist'],[ownerPage,'/dashboard'],[ownerPage,'/dashboard/performance']]){const sources=await scriptsOn(pg,path);check('no admin code downloads on '+path,sources.length>0&&!sources.some(src=>adminChunks.includes(src)))}
 const sellerHtml=await(await seller.request.get(BASE+'/dashboard')).text()
 check('the seller dashboard carries no staff navigation, staff ids or decision history',!/Admin sections|Decision history|Your decision|Choose a decision/.test(sellerHtml)&&!sellerHtml.includes(mod))
 check('a seller asking for the review page gets the ordinary 404',(await ownerPage.goto(url)).status()===404&&await ownerPage.getByText('Your decision').count()===0)
 await guestPeek.close()
 console.log(`Phase 22 moderation browser checks: ${count} passed`)
}finally{await browser.close();await new Promise(r=>mock.close(r))}
