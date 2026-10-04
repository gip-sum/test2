import http from 'node:http'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const BASE = process.env.BASE_URL ?? 'http://localhost:3101'
const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const A = 'a9140f33-a429-46f3-9514-3e8f32f18189', B = 'b9140f33-a429-46f3-9514-3e8f32f18189'
const rows = new Map(), objects = new Map()
let failUpload = false, unavailable = false, passed = 0
const mock = http.createServer(async (request,response) => {
  const chunks=[]; for await (const chunk of request) chunks.push(chunk)
  const raw=Buffer.concat(chunks), url=new URL(request.url,'http://localhost:3300')
  const token=request.headers.authorization?.slice(7), owner=token==='a'.repeat(48)?A:token==='b'.repeat(48)?B:null
  const send=(status,data)=>{response.writeHead(status,{'Content-Type':'application/json'});response.end(JSON.stringify(data))}
  if(url.pathname==='/auth/v1/user')return owner?send(200,{id:owner,email:'seller@example.com'}):send(401,{})
  if(!owner)return send(401,{})
  if(url.pathname==='/rest/v1/saved_properties'&&request.method==='GET')return send(200,[])
  if(unavailable)return send(503,{})
  if(url.pathname==='/rest/v1/media_assets') {
    const selected=[...rows.values()].filter(row=>row.owner_id===owner && (!url.searchParams.has('id')||url.searchParams.get('id')===`eq.${row.id}`) && (!url.searchParams.has('collection_id')||url.searchParams.get('collection_id')===`eq.${row.collection_id}`))
    if(request.method==='GET')return send(200,selected.sort((a,b)=>a.position-b.position))
    const body=JSON.parse(raw.toString()||'{}')
    if(request.method==='POST') {
      if(body.owner_id!==owner)return send(403,{})
      if(rows.has(body.id)||[...rows.values()].some(row=>row.owner_id===owner&&row.collection_id===body.collection_id&&row.sha256===body.sha256))return send(409,{})
      rows.set(body.id,body);return send(201,[body])
    }
    if(request.method==='PATCH'){selected.forEach(row=>Object.assign(row,body));return send(200,selected)}
    if(request.method==='DELETE'){selected.forEach(row=>rows.delete(row.id));return send(200,[])}
  }
  if(url.pathname==='/rest/v1/rpc/reorder_media_photos') {
    const body=JSON.parse(raw); const actual=[...rows.values()].filter(row=>row.owner_id===owner&&row.collection_id===body.collection)
    if(actual.length!==body.photo_ids.length||new Set(body.photo_ids).size!==actual.length||!actual.every(row=>body.photo_ids.includes(row.id)))return send(400,{})
    body.photo_ids.forEach((id,index)=>rows.get(id).position=index);return send(200,null)
  }
  if(url.pathname.startsWith('/storage/v1/object/')) {
    if(request.method==='DELETE') {const body=JSON.parse(raw); for(const path of body.prefixes) {if(!path.startsWith(owner+'/'))return send(403,{});objects.delete(path)}return send(200,[])}
    const path=url.pathname.replace('/storage/v1/object/authenticated/property-photos/','').replace('/storage/v1/object/property-photos/','')
    if(!path.startsWith(owner+'/'))return send(403,{})
    if(request.method==='POST') {if(failUpload){failUpload=false;return send(503,{})} objects.set(path,raw);await new Promise(resolve=>setTimeout(resolve,500));return send(200,{Key:path})}
    if(request.method==='GET'&&objects.has(path)){response.writeHead(200,{'Content-Type':'image/jpeg'});return response.end(objects.get(path))}
    return send(404,{})
  }
  send(404,{})
})
await new Promise(resolve=>mock.listen(3300,'127.0.0.1',resolve))
const browser=await chromium.launch({executablePath:CHROME})
const check=(name,ok)=>{if(!ok)throw Error(name);passed++;console.log('ok',name)}
const origin=new URL(BASE).origin, collection=randomUUID()
const query='role=OWNER&intent=buy&type=APARTMENT&bhk=2&baths=2&unit=sqft&carpet=1000&furnishing=UNFURNISHED&floor=3&floors=8&status=READY&age=4&city=kolkata&locality=new-town&address=Test+building+address&saleprice=6000000&maintenance=none&negotiable=yes&step=pricing-review'
const path=`/post/photos?${query}&collection=${collection}`
mkdirSync('/tmp/phase15-shots',{recursive:true})
try {
  const guest=await browser.newContext(); const gp=await guest.newPage()
  await gp.goto(BASE+path);check('guest sees sign-in gate',await gp.getByRole('heading',{name:'Sign in to upload photos'}).isVisible())
  check('guest upload rejected',(await guest.request.post(BASE+`/api/posting/photos?collection=${collection}&id=${randomUUID()}`,{headers:{Origin:origin,'Content-Type':'image/jpeg'},data:Buffer.from('bad')})).status()===401)
  await gp.goto(BASE+'/post/photos');check('incomplete posting returns to entry',new URL(gp.url()).pathname==='/post')
  const context=await browser.newContext({viewport:{width:390,height:844}})
  await context.addCookies([{name:'gb-access',value:'a'.repeat(48),url:BASE}])
  const page=await context.newPage();await page.goto(BASE+path)
  await page.getByText('No photos yet.',{exact:false}).waitFor()
  const red=await sharp({create:{width:2400,height:1600,channels:3,background:'#c14d39'}}).png().withMetadata().toBuffer()
  const blue=await sharp({create:{width:1600,height:1200,channels:3,background:'#276a9c'}}).png().toBuffer()
  const file=(name,buffer)=>({name,mimeType:'image/png',buffer})
  await page.locator('#property-photos').setInputFiles([file('living-room.png',red),file('bedroom.png',blue)])
  await page.getByText('Checking and storing photo…',{exact:true}).first().waitFor()
  check('real server-processing state visible',await page.locator('#property-photos').isDisabled())
  await page.getByText('Uploaded ·',{exact:false}).nth(1).waitFor()
  check('multiple images stored',objects.size===2&&rows.size===2)
  for(const bytes of objects.values()){const m=await sharp(bytes).metadata();check('stored photo is compressed JPEG without EXIF',m.format==='jpeg'&&!m.exif&&m.width<=1920&&bytes.length<=2097152)}
  await page.getByRole('button',{name:'Make bedroom.png cover',exact:true}).click()
  await page.getByRole('status').filter({hasText:'moved to position 1'}).waitFor()
  check('reorder persisted', [...rows.values()].find(row=>row.original_name==='bedroom.png').position===0)
  await page.reload();await page.getByText('Uploaded ·',{exact:false}).nth(1).waitFor()
  check('collection preserves saved order on refresh',(await page.locator('ol[aria-label="Property photos"] li').first().innerText()).includes('bedroom.png'))
  const first=[...rows.values()][0]
  const ownImage=await context.request.get(BASE+`/api/posting/photos/${first.id}`);check('owner preview available',ownImage.status()===200&&ownImage.headers()['cache-control'].includes('no-store'))
  const other=await browser.newContext();await other.addCookies([{name:'gb-access',value:'b'.repeat(48),url:BASE}])
  check('other account cannot read image',(await other.request.get(BASE+`/api/posting/photos/${first.id}`)).status()===404)
  check('other account cannot list collection',(await (await other.request.get(BASE+`/api/posting/photos?collection=${collection}`)).json()).photos.length===0)
  await other.request.delete(BASE+'/api/posting/photos',{headers:{Origin:origin},data:{id:first.id}})
  check('foreign delete leaves photo intact',rows.has(first.id))
  check('cross-origin mutation rejected',(await context.request.delete(BASE+'/api/posting/photos',{headers:{Origin:'https://untrusted.example'},data:{id:first.id}})).status()===403)
  check('duplicate reorder rejected',(await context.request.patch(BASE+'/api/posting/photos',{headers:{Origin:origin},data:{collection,ids:[first.id,first.id]}})).status()===400)
  check('corrupt upload rejected',(await context.request.post(BASE+`/api/posting/photos?collection=${collection}&id=${randomUUID()}`,{headers:{Origin:origin,'Content-Type':'image/jpeg'},data:Buffer.from('not JPEG')})).status()===400)
  check('oversized compressed upload rejected',(await context.request.post(BASE+`/api/posting/photos?collection=${collection}&id=${randomUUID()}`,{headers:{Origin:origin,'Content-Type':'image/jpeg'},data:Buffer.alloc(2097153)})).status()===413)
  failUpload=true
  const green=await sharp({create:{width:1000,height:800,channels:3,background:'#34784f'}}).png().toBuffer()
  await page.locator('#property-photos').setInputFiles(file('balcony.png',green));await page.getByRole('button',{name:'Retry upload'}).waitFor()
  check('failed upload is retryable',await page.getByText('The photo was not uploaded. Retry or remove it.').isVisible())
  await page.getByRole('button',{name:'Retry upload'}).click();await page.getByText('Uploaded ·',{exact:false}).nth(2).waitFor()
  check('retry reuses reservation',rows.size===3&&objects.size===3)
  const uploaded=[...rows.values()].find(row=>row.original_name==='balcony.png')
  const retry=await context.request.post(BASE+`/api/posting/photos?collection=${collection}&id=${uploaded.id}`,{headers:{Origin:origin,'Content-Type':'image/jpeg'},data:Buffer.from('already finished')})
  check('lost success response is idempotent',retry.status()===200&&rows.size===3)
  await page.getByRole('button',{name:'Remove living-room.png',exact:true}).click();await page.getByRole('status').filter({hasText:'removed.'}).waitFor()
  check('delete clears object and record',rows.size===2&&objects.size===2)
  await page.locator('#property-photos').setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')})
  await page.getByRole('status').filter({hasText:'Choose a JPEG'}).waitFor();check('unsupported original rejected before upload',rows.size===2)
  for(const width of [390,412,768,1280]) {
    await page.setViewportSize({width,height:844});check(`${width}: no overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
    check(`${width}: action targets at least 44px`,await page.locator('ol[aria-label="Property photos"] button').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44)))
    await page.evaluate(()=>window.scrollTo(0,0))
    await page.screenshot({path:`/tmp/phase15-shots/photos-${width}.png`,fullPage:true})
  }
  unavailable=true;await page.reload();await page.getByRole('button',{name:'Reload photos'}).waitFor();check('outage blocks uploads without claiming an empty collection',await page.locator('#property-photos').isDisabled())
  console.log(`${passed} photo checks passed`)
}finally{await browser.close();await new Promise(resolve=>mock.close(resolve))}
