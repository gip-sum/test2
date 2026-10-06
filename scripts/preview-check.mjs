import http from 'node:http'
import { chromium } from 'playwright-core'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
const BASE=process.env.BASE_URL??'http://localhost:3101',A='a9140f33-a429-46f3-9514-3e8f32f18189',B='b9140f33-a429-46f3-9514-3e8f32f18189',id='c9140f33-a429-46f3-9514-3e8f32f18189',collection='d9140f33-a429-46f3-9514-3e8f32f18189',photoId='e9140f33-a429-46f3-9514-3e8f32f18189'
let draft={id,owner_id:A,collection_id:collection,revision:1,created_at:'2026-10-06T12:00:00Z',updated_at:'2026-10-06T12:00:00Z',page_path:'/post',role:'OWNER',intent:'buy',type:'APARTMENT',bhk:'2',baths:'2',unit:'sqft',carpet:'1000',furnishing:'UNFURNISHED',floor:'3',floors:'8',status:'READY',age:'4',city:'kolkata',locality:'new-town',address:'Test building address',saleprice:'6000000',maintenance:'none',negotiable:'yes',edit:'1'}
let photos=[{id:photoId,collection_id:collection,original_name:'private.jpg',status:'ready',position:0,width:640,height:480,bytes:1000,sha256:'a'.repeat(64)}],review=null,name='Test Seller',outage=false
const binary=await sharp({create:{width:640,height:480,channels:3,background:'#557755'}}).jpeg().toBuffer()
const mock=http.createServer(async(req,res)=>{
 const chunks=[];for await(const x of req)chunks.push(x)
 const url=new URL(req.url,'http://localhost'),token=req.headers.authorization?.slice(7),owner=token==='a'.repeat(48)?A:token==='b'.repeat(48)?B:null
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))}
 if(url.pathname==='/auth/v1/user')return owner?send(200,{id:owner,email:'account@example.com'}):send(401,{})
 if(!owner)return send(401,{})
 if(url.pathname==='/rest/v1/saved_properties')return send(200,[])
 if(outage)return send(503,{})
 if(url.pathname==='/rest/v1/property_drafts'){
  if(owner!==A||url.searchParams.get('id')!==`eq.${id}`)return send(200,[])
  if(req.method==='PATCH'){
   if(url.searchParams.get('revision')!==`eq.${draft.revision}`)return send(200,[])
   draft={...draft,...JSON.parse(Buffer.concat(chunks)),revision:draft.revision+1}
  }
  return send(200,[draft])
 }
 if(url.pathname==='/rest/v1/buyer_profiles')return send(200,[{id:owner,full_name:name,contact_phone:'9999999999',preferred_intent:'both',preferred_locality:null,email_updates:false,updated_at:'2026-10-06'}])
 if(url.pathname==='/rest/v1/media_assets')return send(200,owner===A?photos:[])
 if(url.pathname==='/rest/v1/property_draft_reviews'){
  if(req.method==='POST'){const body=JSON.parse(Buffer.concat(chunks));if(owner!==A||body.owner_id!==owner||body.draft_revision!==draft.revision)return send(403,{});review=body}
  return send(200,owner===A&&review?[review]:[])
 }
 if(url.pathname.startsWith('/storage/v1/object/authenticated/property-photos/')&&owner===A){res.writeHead(200,{'Content-Type':'image/jpeg'});return res.end(binary)}
 send(404,{})
})
await new Promise(r=>mock.listen(3300,'127.0.0.1',r))
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??chromium.executablePath()});let passed=0
const check=(label,ok)=>{if(!ok)throw Error(label);passed++;console.log('ok',label)}
async function context(token){const c=await browser.newContext({viewport:{width:390,height:844}});if(token)await c.addCookies([{name:'gb-access',value:token.repeat(48),url:BASE}]);return c}
const path=`/post/drafts/${id}/preview`
try{
 const guest=await context(),gp=await guest.newPage();await gp.goto(BASE+path);check('guest redirected to sign in',new URL(gp.url()).pathname==='/login')
 const owner=await context('a'),page=await owner.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(BASE+`/post/drafts/${id}`);await page.locator('[name=carpet]').fill('1100');await page.getByRole('button',{name:'Preview property'}).click();await page.waitForURL('**/preview')
 check('preview waits for saved edits',draft.carpet==='1100')
 await page.getByRole('heading',{name:/2 BHK/}).waitFor();check('sale price shown',await page.getByText('₹60 L',{exact:true}).count()===1)
 check('seller name shown',await page.getByText('Test Seller',{exact:true}).count()===1)
 check('private profile phone not exposed',!(await page.locator('article').innerText()).includes('9999999999'))
 const imageResponse=await owner.request.get(BASE+`/api/posting/photos/${photoId}`);check('private image endpoint responds',imageResponse.status()===200);check('private image bytes decode',(await sharp(await imageResponse.body()).metadata()).width===640)
 console.log('preview image diagnostics',await page.locator('section[aria-label="Property photos"]').evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,images:[...e.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height,naturalWidth:i.naturalWidth})),text:e.textContent})))
 const img=page.locator(`img[src="/api/posting/photos/${photoId}"]`).first();await img.waitFor();await page.waitForFunction(id=>{const img=document.querySelector(`img[src="/api/posting/photos/${id}"]`);return img?.complete&&img.naturalWidth>0},photoId)
 check('private image loaded without optimizer',await img.evaluate(e=>e.naturalWidth===640))
 await page.getByRole('button',{name:'View full-screen gallery'}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});check('gallery closes',await page.getByRole('dialog').count()===0)
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Confirm review',exact:true}).click();await page.getByText('Review confirmed. Your property is still private and unpublished.').waitFor()
 check('confirmation persisted',review?.draft_revision===draft.revision)
 await page.reload();check('confirmed state survives refresh',await page.getByText('Review confirmed. Your property is still private and unpublished.').count()===1)
 draft={...draft,revision:draft.revision+1,saleprice:'7000000'};await page.reload();check('edit invalidates review',await page.getByRole('button',{name:'Confirm review',exact:true}).count()===1)
 await page.getByRole('checkbox').check();name='Changed Seller';await page.getByRole('button',{name:'Confirm review',exact:true}).click();await page.getByText(/changed. Reload the preview/).waitFor();check('stale seller preview rejected',review.draft_revision!==draft.revision)
 await page.reload();photos=[];draft={...draft,saleprice:'',revision:draft.revision+1};await page.reload();await page.getByRole('heading',{name:'Information to complete'}).waitFor();check('missing photos warning',await page.getByText('Add at least one property photo.',{exact:false}).count()>0);check('incomplete confirmation disabled',await page.getByRole('button',{name:'Confirm review',exact:true}).isDisabled())
 const foreign=await context('b'),fp=await foreign.newPage();await fp.goto(BASE+path);check('foreign preview has no property content',await fp.getByRole('heading',{name:/2 BHK/}).count()===0)
 check('guest confirmation denied',(await guest.request.post(BASE+'/api/posting/preview',{headers:{Origin:BASE},data:{id,signature:'a'.repeat(64),accepted:true}})).status()===401)
 check('cross-origin confirmation denied',(await owner.request.post(BASE+'/api/posting/preview',{headers:{Origin:'https://evil.test'},data:{id,signature:'a'.repeat(64),accepted:true}})).status()===403)
 mkdirSync('/tmp/phase17-shots',{recursive:true})
 for(const width of [390,412,768,1280]){await page.setViewportSize({width,height:900});check('no overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`/tmp/phase17-shots/preview-${width}.png`,fullPage:true})}
 outage=true;await page.reload();await page.getByRole('heading',{name:'Preview unavailable'}).waitFor();check('outage does not show empty success',await page.getByRole('button',{name:'Confirm review',exact:true}).count()===0)
 check('no runtime errors',errors.length===0)
 console.log(passed+' preview browser checks passed')
}finally{await browser.close();await new Promise(r=>mock.close(r))}
