import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const BASE=process.env.BASE_URL??'http://localhost:3101'
const A='a9140f33-a429-46f3-9514-3e8f32f18189', B='b9140f33-a429-46f3-9514-3e8f32f18189'
const rows=new Map();let fail=false,passed=0
const mock=http.createServer(async(req,res)=>{
 const chunks=[];for await(const c of req)chunks.push(c)
 const u=new URL(req.url,'http://localhost'), token=req.headers.authorization?.slice(7),owner=token==='a'.repeat(48)?A:token==='b'.repeat(48)?B:null
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))}
 if(u.pathname==='/auth/v1/user')return owner?send(200,{id:owner,email:'seller@example.com'}):send(401,{})
 if(!owner)return send(401,{})
 if(u.pathname==='/rest/v1/saved_properties'||u.pathname==='/rest/v1/media_assets')return send(200,[])
 if(u.pathname!=='/rest/v1/property_drafts')return send(404,{})
 if(fail)return send(503,{})
 const selected=[...rows.values()].filter(x=>x.owner_id===owner&&(!u.searchParams.has('id')||u.searchParams.get('id')===`eq.${x.id}`)&&(!u.searchParams.has('revision')||u.searchParams.get('revision')===`eq.${x.revision}`))
 if(req.method==='GET')return send(200,selected)
 const body=JSON.parse(Buffer.concat(chunks))
 if(req.method==='POST'){
  if(rows.has(body.id)||[...rows.values()].some(x=>x.owner_id===owner&&x.collection_id===body.collection_id))return send(409,{})
  if(body.owner_id!==owner)return send(403,{})
  const row={...body,revision:1,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};rows.set(row.id,row);return send(201,[row])
 }
 if(req.method==='PATCH'){selected.forEach(x=>Object.assign(x,body,{revision:x.revision+1,updated_at:new Date().toISOString()}));return send(200,selected)}
 send(400,{})
})
await new Promise(r=>mock.listen(3300,'127.0.0.1',r))
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??chromium.executablePath()})
const check=(label,ok)=>{if(!ok)throw Error(label);passed++;console.log('ok',label)}
const waitSaved=page=>page.getByRole('status').filter({hasText:'Saved to your account'}).waitFor()
async function account(token='a') {const c=await browser.newContext({viewport:{width:390,height:844}});await c.addCookies([{name:'gb-access',value:token.repeat(48),url:BASE}]);return c}
const query='role=OWNER&intent=buy&type=APARTMENT'
try {
 const guest=await browser.newContext(),gp=await guest.newPage();await gp.goto(BASE+'/post/drafts');check('guest list requires login',new URL(gp.url()).pathname==='/login')
 check('guest API denied',(await guest.request.get(BASE+'/api/posting/drafts')).status()===401)
 const c=await account(),page=await c.newPage();const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));await page.goto(BASE+'/post?'+query)
 await page.locator('[name=carpet]').fill('12,')
 await page.getByRole('button',{name:'Save as draft',exact:true}).click();await page.waitForURL('**/post/drafts/*')
 const id=new URL(page.url()).pathname.split('/').at(-1)
 check('creation retains partial form',await page.locator('[name=carpet]').inputValue()==='12,')
 await page.locator('[name=carpet]').fill('1234');await page.getByRole('status').filter({hasText:'Unsaved changes'}).waitFor();await waitSaved(page)
 check('typing autosaves',rows.get(id).carpet==='1234')
 await page.reload();check('refresh retains partial draft',await page.locator('[name=carpet]').inputValue()==='1234')
 const otherContext=await account(),other=await otherContext.newPage();await other.goto(BASE+'/post/drafts');await other.getByRole('link',{name:/Resume draft/}).click()
 check('another device resumes confirmed fields',await other.locator('[name=carpet]').inputValue()==='1234')
 await page.locator('[name=carpet]').fill('');await waitSavedAfterEdit(page)
 check('clearing field saved',rows.get(id).carpet==='')
 await other.locator('[name=carpet]').fill('999');await other.getByText(/This draft changed in another tab/).waitFor()
 check('stale tab cannot overwrite',rows.get(id).carpet==='')
 await other.getByRole('button',{name:'Discard unsent edits and load latest'}).click();await other.waitForLoadState();await other.locator('[name=carpet]').waitFor()
 check('conflict reload gets latest',await other.locator('[name=carpet]').inputValue()==='')
 fail=true;await page.locator('[name=carpet]').fill('765');await page.getByText('Not saved to your account',{exact:true}).waitFor()
 check('failed save is honest',rows.get(id).carpet==='')
 fail=false;await page.getByRole('button',{name:'Retry save'}).click();await waitSaved(page);check('retry saves pending values',rows.get(id).carpet==='765')
 fail=true;await page.locator('[name=carpet]').fill('876');await page.getByText('Not saved to your account',{exact:true}).waitFor();fail=false
 page.on('dialog',d=>d.accept());await page.reload();await page.getByText(/Unsent changes were recovered/).waitFor()
 await page.getByRole('button',{name:'Restore unsent changes'}).click();await page.locator('[name=carpet]').waitFor();await waitSaved(page)
 check('unsent recovery saved',rows.get(id).carpet==='876')
 await page.getByRole('link',{name:'Return to Your plan'}).click();await page.getByRole('heading',{name:'What would you like to do?'}).waitFor()
 check('step navigation stays in draft',new URL(page.url()).pathname===`/post/drafts/${id}`)
 await page.getByRole('link',{name:'Rent out a property'}).click();await page.getByRole('heading',{name:'What kind of place is it?'}).waitFor()
 check('choice persisted',rows.get(id).intent==='rent')
 await page.getByRole('button',{name:'Save & exit'}).click();await page.waitForURL('**/post/drafts')
 check('draft listed',await page.getByRole('link',{name:/Resume draft/}).count()===1)
 const foreign=await account('b');check('foreign API hides draft',(await foreign.request.get(BASE+`/api/posting/drafts?id=${id}`)).status()===404)
 const mutation={id,revision:rows.get(id).revision,snapshot:{path:'/post',input:{role:'OWNER'}}}
 check('cross origin denied',(await c.request.patch(BASE+'/api/posting/drafts',{headers:{Origin:'https://evil.test'},data:mutation})).status()===403)
 check('foreign update denied',(await foreign.request.patch(BASE+'/api/posting/drafts',{headers:{Origin:BASE},data:mutation})).status()===404)
 check('oversized body denied',(await c.request.patch(BASE+'/api/posting/drafts',{headers:{Origin:BASE},data:{...mutation,padding:'x'.repeat(17000)}})).status()===413)
 check('unknown fields rejected',(await c.request.patch(BASE+'/api/posting/drafts',{headers:{Origin:BASE},data:{...mutation,snapshot:{path:'/post',input:{owner_id:B}}}})).status()===400)
 const create={id:randomUUID(),collection:randomUUID(),snapshot:{path:'/post',input:{}}}
 const one=await c.request.post(BASE+'/api/posting/drafts',{headers:{Origin:BASE},data:create});const two=await c.request.post(BASE+'/api/posting/drafts',{headers:{Origin:BASE},data:create})
 check('create retry idempotent',one.ok()&&two.ok()&&rows.size===2)
 mkdirSync('/tmp/phase16-shots',{recursive:true})
 for(const width of [390,412,768,1280]) {await page.setViewportSize({width,height:900});await page.goto(BASE+`/post/drafts/${id}`);check('no overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`/tmp/phase16-shots/draft-${width}.png`,fullPage:true})}
 check('no browser runtime errors',pageErrors.length===0)
 fail=true;await page.goto(BASE+'/post/drafts');await page.getByText('Your drafts could not be loaded.').waitFor();check('list outage not empty success',await page.getByText(/No drafts yet/).count()===0)
 console.log(passed+' draft browser checks passed')
} finally {await browser.close();await new Promise(r=>mock.close(r))}
async function waitSavedAfterEdit(page){await page.getByRole('status').filter({hasText:'Unsaved changes'}).waitFor();await waitSaved(page)}
