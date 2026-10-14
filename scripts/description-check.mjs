// Real browser -> Next routes -> simulated owner REST storage. No paid AI calls.
// Background states are deliberately injected through the simulator; deployment
// delivery and actual model quality are separate activation checks.
import http from 'node:http'
import {chromium} from 'playwright-core'
import sharp from 'sharp'
import {mkdirSync} from 'node:fs'
const BASE=process.env.BASE_URL??'http://localhost:3101',A='a9140f33-a429-46f3-9514-3e8f32f18189',B='b9140f33-a429-46f3-9514-3e8f32f18189',id='c9140f33-a429-46f3-9514-3e8f32f18189',collection='d9140f33-a429-46f3-9514-3e8f32f18189',photoId='e9140f33-a429-46f3-9514-3e8f32f18189',jobId='f9140f33-a429-46f3-9514-3e8f32f18189'
let draft={id,owner_id:A,collection_id:collection,revision:1,created_at:'2026-10-14T06:00:00Z',updated_at:'2026-10-14T06:00:00Z',page_path:'/post',role:'OWNER',intent:'buy',type:'APARTMENT',bhk:'2',baths:'2',unit:'sqft',carpet:'1000',furnishing:'UNFURNISHED',floor:'3',floors:'8',status:'READY',age:'4',city:'kolkata',locality:'new-town',address:'SAMPLE building address',saleprice:'6000000',maintenance:'none',negotiable:'yes',description:null}
const photos=[{id:photoId,collection_id:collection,original_name:'sample.jpg',status:'ready',position:0,width:640,height:480,bytes:1000,sha256:'a'.repeat(64)}]
let review=null,job=null,advance=false,polls=0,jobDown=false,saveDown=false
const binary=await sharp({create:{width:640,height:480,channels:3,background:'#557755'}}).jpeg().toBuffer()
const mock=http.createServer(async(req,res)=>{
 const chunks=[];for await(const x of req)chunks.push(x)
 const url=new URL(req.url,'http://localhost'),token=req.headers.authorization?.slice(7),owner=token==='a'.repeat(48)?A:token==='b'.repeat(48)?B:null
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))}
 if(url.pathname==='/auth/v1/user')return owner?send(200,{id:owner,email:'sample@example.com'}):send(401,{})
 if(!owner)return send(401,{})
 if(url.pathname==='/rest/v1/property_drafts'){
  if(owner!==A||url.searchParams.get('id')!==`eq.${id}`)return send(200,[])
  if(req.method==='PATCH'){
   if(saveDown)return send(503,{})
   if(url.searchParams.get('revision')!==`eq.${draft.revision}`)return send(200,[])
   draft={...draft,...JSON.parse(Buffer.concat(chunks)),revision:draft.revision+1}
  }
  return send(200,[draft])
 }
 if(url.pathname==='/rest/v1/property_description_jobs'){
  if(jobDown)return send(503,{})
  if(owner!==A||!job)return send(200,[])
  if(advance&&url.searchParams.has('id')){polls++;job={...job,status:polls===1?'RUNNING':'SUCCEEDED',result:polls===1?null:'SAMPLE AI suggestion from test facts.'}}
  return send(200,[job])
 }
 if(url.pathname==='/rest/v1/buyer_profiles')return send(200,[{id:owner,full_name:'SAMPLE seller',contact_phone:'9999999999'}])
 if(url.pathname==='/rest/v1/media_assets')return send(200,owner===A?photos:[])
 if(url.pathname==='/rest/v1/saved_properties')return send(200,[])
 if(url.pathname==='/rest/v1/property_draft_reviews'){
  if(req.method==='POST'){const body=JSON.parse(Buffer.concat(chunks));if(owner!==A||body.draft_revision!==draft.revision)return send(403,{});review=body}
  return send(200,owner===A&&review?[review]:[])
 }
 if(url.pathname.startsWith('/storage/v1/object/authenticated/property-photos/')&&owner===A){res.writeHead(200,{'Content-Type':'image/jpeg'});return res.end(binary)}
 send(404,{})
})
await new Promise(r=>mock.listen(3300,'127.0.0.1',r))
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??chromium.executablePath()});let count=0
const check=(label,ok)=>{if(!ok)throw Error(label);count++;console.log('ok',label)}
async function context(token){const c=await browser.newContext({viewport:{width:390,height:844}});if(token)await c.addCookies([{name:'gb-access',value:token.repeat(48),url:BASE}]);return c}
const path=`/post/drafts/${id}/preview`,api='/api/posting/description'
try{
 const owner=await context('a'),page=await owner.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(BASE+path)
 await page.getByRole('heading',{name:'About this property'}).waitFor()
 check('honest disabled AI state',await page.getByRole('button',{name:'Generate with AI'}).isDisabled())
 const editor=page.getByLabel('Property description'),save=page.getByRole('button',{name:'Save description'})
 await editor.fill('SAMPLE seller description.');const firstSave=page.waitForResponse(r=>r.url().endsWith(api)&&r.request().method()==='POST');await save.click();await firstSave
 await page.reload();check('manual description persists',await editor.inputValue()==='SAMPLE seller description.')
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Confirm review',exact:true}).click();await page.getByText('Review confirmed. Your property is still private and unpublished.').waitFor()
 await editor.fill('SAMPLE edited description.');await save.click();await page.getByRole('button',{name:'Confirm review',exact:true}).waitFor()
 check('saving invalidates earlier confirmation',review.draft_revision!==draft.revision)
 job={id:jobId,draft_id:id,draft_revision:draft.revision,status:'QUEUED',dispatched:true,attempts:0,result:null,error_code:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};advance=true
 await page.reload();await page.getByText('Waiting for the background worker…').waitFor();await page.getByText('The background worker is drafting your description…').waitFor();await page.getByRole('button',{name:'Use suggestion in editor'}).waitFor()
 check('persisted job progresses through owner status API',polls===2)
 check('completion does not auto-save',draft.description==='SAMPLE edited description.')
 await page.getByRole('button',{name:'Use suggestion in editor'}).click();check('suggestion can be edited',await editor.inputValue()==='SAMPLE AI suggestion from test facts.')
 await editor.fill('SAMPLE reviewed AI description.');const reviewedSave=page.waitForResponse(r=>r.url().endsWith(api)&&r.request().method()==='POST');await save.click();await reviewedSave;await page.reload();check('reviewed result saved explicitly',draft.description==='SAMPLE reviewed AI description.')
 check('older result cannot replace changed draft',await page.getByRole('button',{name:'Use suggestion in editor'}).isDisabled())
 job={...job,draft_revision:draft.revision,status:'FAILED',error_code:'PROVIDER_REJECTED',result:null};advance=false;await page.reload();await page.getByText(/Generation did not finish/).waitFor();check('failure has a manual editing path',await editor.isEditable())
 saveDown=true;await editor.fill('SAMPLE failed save.');await save.click();await page.getByRole('alert').filter({hasText:/could not be saved/}).waitFor();check('failed save preserves prior data',draft.description==='SAMPLE reviewed AI description.');saveDown=false
 job={...job,status:'QUEUED'};await page.reload();jobDown=true;await page.getByRole('alert').filter({hasText:/status could not be loaded/}).waitFor();check('poll error announced',await page.getByRole('alert').count()>0);jobDown=false
 const foreign=await context('b'),guest=await context(),payload={action:'save',id,revision:draft.revision,description:'Foreign edit'}
 check('foreign description denied',(await foreign.request.post(BASE+api,{headers:{Origin:BASE},data:payload})).status()===404)
 check('guest description denied',(await guest.request.post(BASE+api,{headers:{Origin:BASE},data:payload})).status()===401)
 check('foreign job hidden',(await foreign.request.get(BASE+api+'/jobs/'+jobId)).status()===404)
 check('guest job denied',(await guest.request.get(BASE+api+'/jobs/'+jobId)).status()===401)
 check('cross-origin denied',(await owner.request.post(BASE+api,{headers:{Origin:'https://other.test'},data:payload})).status()===403)
 check('oversized body rejected',(await owner.request.post(BASE+api,{headers:{Origin:BASE},data:{...payload,description:'a'.repeat(12001)}})).status()===413)
 job=null;await page.reload();await editor.fill('a'.repeat(2001));check('overlong text cannot save',await save.isDisabled());await editor.fill('SAMPLE final text.')
 mkdirSync('/tmp/description-shots',{recursive:true})
 for(const width of [390,412,768,1280]){await page.setViewportSize({width,height:900});check('no page overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));check('44px editor actions '+width,await page.locator('section[aria-labelledby="description-heading"] button').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().height>=44)));await page.screenshot({path:`/tmp/description-shots/editor-${width}.png`,fullPage:true})}
 await editor.focus();await page.keyboard.press('Tab');check('keyboard reaches save',await save.evaluate(e=>e===document.activeElement))
 check('no client runtime errors',errors.length===0)
 console.log(count+' description browser checks passed')
}finally{await browser.close();await new Promise(r=>mock.close(r))}
