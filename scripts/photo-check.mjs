import http from 'node:http'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const BASE = process.env.BASE_URL ?? 'http://localhost:3101'
const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const A = 'a9140f33-a429-46f3-9514-3e8f32f18189', B = 'b9140f33-a429-46f3-9514-3e8f32f18189'
const rows = new Map(), objects = new Map()
let failUpload = false, unavailable = false, failReorder = false, reorderDelay = 0, passed = 0
const mock = http.createServer(async (request,response) => {
  const chunks=[]; for await (const chunk of request) chunks.push(chunk)
  const raw=Buffer.concat(chunks), url=new URL(request.url,'http://localhost:3300')
  const token=request.headers.authorization?.slice(7), owner=token==='a'.repeat(48)?A:token==='b'.repeat(48)?B:null
  const send=(status,data)=>{response.writeHead(status,{'Content-Type':'application/json'});response.end(JSON.stringify(data))}
  if(url.pathname==='/auth/v1/user')return owner?send(200,{id:owner,email:'seller@example.com'}):send(401,{})
  if (url.pathname === '/rest/v1/rpc/my_account_access') return send(200, true)
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
    if(reorderDelay)await new Promise(resolve=>setTimeout(resolve,reorderDelay))
    if(failReorder){failReorder=false;return send(503,{})}
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
const check=(name,ok,detail)=>{if(!ok)throw Error(detail?`${name} — ${detail}`:name);passed++;console.log('ok',name)}
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
  await page.getByText('No photos yet',{exact:true}).waitFor()
  check('the empty state says what to add first',await page.getByText('Start with a clear view of the home, then add rooms and amenities. The first photo becomes the cover.').isVisible())
  // UI-17: the labelled file input is drawn as a drop zone (Kokonut UI File
  // Upload technique); pressing the zone opens the same native input.
  check('the drop zone is the file input\'s label, and the input keeps its guidance',await page.locator('label[for="property-photos"]').isVisible()&&await page.getByLabel(/Add property photos/).evaluate(el=>el.id==='property-photos'&&el.getAttribute('aria-describedby')==='photo-guidance'))
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
  check('the cover is marked on the first photo, and only there',await page.locator('ol[aria-label="Property photos"] li').first().getByText('Cover photo').isVisible()&&await page.locator('ol[aria-label="Property photos"] li').getByText('Cover photo').count()===1)
  await page.reload();await page.getByText('Uploaded ·',{exact:false}).nth(1).waitFor()
  check('collection preserves saved order on refresh',(await page.locator('ol[aria-label="Property photos"] li').first().innerText()).includes('bedroom.png'))

  // UI-08: a moved photo travels to its new place, focus stays on the
  // control pressed, and a failed save puts the photo back and says so.
  // UI-17: the travel is Motion's layout animation (it was a WAAPI FLIP):
  // the list is in its final order at once, and the photos that changed
  // place are displaced by a transform for a few frames, then not at all.
  // An identity matrix left for a frame is not movement.
  const travelling=()=>new Promise(resolve=>{let most=0,frames=0;const tick=()=>{most=Math.max(most,[...document.querySelectorAll('[data-flip-key]')].filter(li=>{const t=getComputedStyle(li).transform;if(t==='none')return false;const m=new DOMMatrixReadOnly(t);return Math.abs(m.e)>0.5||Math.abs(m.f)>0.5||Math.abs(m.a-1)>0.005||Math.abs(m.d-1)>0.005}).length);if(++frames<12)requestAnimationFrame(tick);else resolve(most)};requestAnimationFrame(tick)})
  const names=()=>page.locator('ol[aria-label="Property photos"] li').evaluateAll(items=>items.map(item=>item.querySelector('p')?.textContent.replace(/^\d+\. /,'')))
  const focused=()=>page.evaluate(()=>document.activeElement?.getAttribute('aria-label'))
  reorderDelay=600
  await page.getByRole('button',{name:'Move bedroom.png later',exact:true}).focus()
  const moved=await page.getByRole('button',{name:'Move bedroom.png later',exact:true}).evaluate((el,travel)=>{
    el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));el.click()
    let first;requestAnimationFrame(()=>{first=document.querySelector('[data-flip-key] p')?.textContent})
    return new Function(`return (${travel})()`)().then(most=>({most,first}))
  },travelling.toString())
  check('a moved photo is in its new place at once and travels there (both photos move)',moved.most===2&&moved.first.includes('living-room.png'))
  check('while the order saves, the controls refuse presses but keep focus where it was',await focused()==='Move bedroom.png earlier'&&await page.getByRole('button',{name:'Move bedroom.png earlier',exact:true}).getAttribute('aria-disabled')==='true')
  await page.getByRole('status').filter({hasText:'bedroom.png moved to position 2'}).waitFor()
  // Throws on timeout: every photo must come to rest in its cell.
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-flip-key]')].every(li=>getComputedStyle(li).transform==='none'),null,{timeout:3000})
  check('at the end of the list, focus moves to the control that can still move it',await focused()==='Move bedroom.png earlier'&&[...rows.values()].find(row=>row.original_name==='bedroom.png').position===1)
  reorderDelay=0;failReorder=true
  await page.keyboard.press('Enter')
  await page.getByRole('status').filter({hasText:'The photo is back in position 2.'}).waitFor()
  check('a failed save puts the photo back where it was, says so, and keeps focus on it',JSON.stringify(await names())===JSON.stringify(['living-room.png','bedroom.png'])&&await focused()==='Move bedroom.png earlier'&&[...rows.values()].find(row=>row.original_name==='bedroom.png').position===1)
  await page.keyboard.press('Enter');await page.getByRole('status').filter({hasText:'bedroom.png moved to position 1'}).waitFor()
  check('the keyboard alone reorders: Enter moves it, focus follows it to the first place',JSON.stringify(await names())===JSON.stringify(['bedroom.png','living-room.png'])&&await focused()==='Move bedroom.png later')
  {
    // UI-17: drag by the handle. The photo follows the pointer, the other
    // makes room as it passes, the new order is saved on release — and put
    // back, with a message, if saving fails. Drag is an addition: the
    // buttons above remain the way to reorder from a keyboard.
    const items=page.locator('ol[aria-label="Property photos"] li')
    const drag=async(from,to)=>{
      await page.locator('ol[aria-label="Property photos"]').scrollIntoViewIfNeeded()
      // Measure only once every photo is at rest: a reorder just made is
      // still travelling, and its handle is not yet where it will stay.
      await page.waitForFunction(()=>[...document.querySelectorAll('[data-flip-key]')].every(li=>getComputedStyle(li).transform==='none'),null,{timeout:3000})
      const handle=items.nth(from).locator('.photo-handle'),h=await handle.boundingBox(),a=await items.nth(from).boundingBox(),b=await items.nth(to).boundingBox()
      await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down()
      for(let i=1;i<=12;i++){await page.mouse.move(h.x+h.width/2+(b.x-a.x)*i/12,h.y+h.height/2+(b.y-a.y)*i/12);await page.waitForTimeout(16)}
      await page.waitForTimeout(350)
      const during={lifted:await page.locator('ol[aria-label="Property photos"] li[data-dragging]').count(),order:await names()}
      await page.mouse.up();return during
    }
    check('the drag handle is a 44px target, for pointers only',await items.first().locator('.photo-handle').evaluate(el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44&&el.getAttribute('aria-hidden')==='true'}))
    const during=await drag(1,0)
    check('dragging lifts the photo and the other makes room before release',during.lifted===1&&JSON.stringify(during.order)===JSON.stringify(['living-room.png','bedroom.png']),JSON.stringify(during))
    await page.getByRole('status').filter({hasText:'living-room.png moved to position 1'}).waitFor()
    check('the dragged order is saved and announced',[...rows.values()].find(row=>row.original_name==='living-room.png').position===0&&await page.locator('ol[aria-label="Property photos"] li[data-dragging]').count()===0)
    check('the cover follows the order',await items.first().getByText('Cover photo').isVisible()&&(await items.first().innerText()).includes('living-room.png'))
    failReorder=true
    await drag(1,0)
    await page.getByRole('status').filter({hasText:'The photos are back in their previous order.'}).waitFor()
    check('a drag whose save fails puts the photos back and says so',JSON.stringify(await names())===JSON.stringify(['living-room.png','bedroom.png'])&&[...rows.values()].find(row=>row.original_name==='living-room.png').position===0)
    await page.getByRole('button',{name:'Make bedroom.png cover',exact:true}).click();await page.getByRole('status').filter({hasText:'bedroom.png moved to position 1'}).waitFor()
  }
  {
    const still=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'})
    await still.addCookies([{name:'gb-access',value:'a'.repeat(48),url:BASE}])
    const quiet=await still.newPage();await quiet.goto(BASE+path);await quiet.getByText('Uploaded ·',{exact:false}).nth(1).waitFor()
    const calm=await quiet.getByRole('button',{name:'Move bedroom.png later',exact:true}).evaluate((el,travel)=>{el.click();let first;requestAnimationFrame(()=>{first=document.querySelector('[data-flip-key] p')?.textContent});return new Function(`return (${travel})()`)().then(most=>({most,first}))},travelling.toString())
    check('reduced motion: the photo changes place at once, with no movement',calm.most===0&&calm.first.includes('living-room.png'))
    await quiet.getByRole('status').filter({hasText:'moved to position 2'}).waitFor()
    await quiet.getByRole('button',{name:'Make bedroom.png cover',exact:true}).click();await quiet.getByRole('status').filter({hasText:'moved to position 1'}).waitFor()
    check('"Make cover" leaves the first photo without its button; focus moves to the one that remains',await quiet.evaluate(()=>document.activeElement?.getAttribute('aria-label'))==='Move bedroom.png later')
    await still.close()
  }
  {
    // A preview that fails to load is the shared PhotoFallback (UI-16): the
    // box keeps its size, the browser's broken image is gone, and the
    // problem is said in words beside it.
    const broken=await context.newPage()
    await broken.route('**/api/posting/photos/*',route=>route.request().resourceType()==='image'?route.fulfill({status:500,body:''}):route.continue())
    await broken.goto(BASE+path)
    const fb=broken.getByRole('img',{name:/^Preview of .+ — image could not load$/}).first()
    await fb.waitFor({timeout:8000})
    const box=await fb.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return{fills:Math.abs(r.width-p.width)<1&&Math.abs(r.height-p.height)<1&&p.height>100,img:el.parentElement.querySelector('img')===null}})
    check('a failed preview shows the designed fallback in its box, no broken image, and says so',box.fills&&box.img&&await broken.getByText('Preview unavailable. Reload photos to try again.').first().isVisible(),JSON.stringify(box))
    await broken.close()
  }
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
  check('after a removal focus moves to the photo that took its place, not the top of the page',/^Remove (bedroom|balcony)\.png$/.test(await focused()))
  await page.locator('#property-photos').setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')})
  await page.getByRole('status').filter({hasText:'Choose a JPEG'}).waitFor();check('unsupported original rejected before upload',rows.size===2)
  {
    // UI-17: files dropped on the zone or pasted into it go through the same
    // checks and upload as chosen files, and arrive at the end of the list.
    const terrace=(await sharp({create:{width:1200,height:900,channels:3,background:'#8a5a2b'}}).png().toBuffer()).toString('base64')
    const states=await page.evaluate(async(b64)=>{
      const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))
      const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'terrace.png',{type:'image/png'}))
      const zone=document.querySelector('label[for="property-photos"]')
      window.dispatchEvent(new DragEvent('dragenter',{dataTransfer:dt,bubbles:true}));await frame()
      const armed=zone.hasAttribute('data-armed')
      zone.dispatchEvent(new DragEvent('dragover',{dataTransfer:dt,bubbles:true,cancelable:true}));await frame()
      const over=zone.hasAttribute('data-over')&&zone.textContent.includes('Drop to add these photos')
      zone.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));await frame()
      return{armed,over,after:!zone.hasAttribute('data-armed')&&!zone.hasAttribute('data-over')}
    },terrace)
    check('a file dragged over the window arms the zone; over the zone it is ready to drop',states.armed&&states.over&&states.after)
    await page.getByText('Uploaded ·',{exact:false}).nth(2).waitFor()
    check('a dropped photo is uploaded and added at the end',rows.size===3&&(await names()).at(-1)==='terrace.png')
    const study=(await sharp({create:{width:1200,height:900,channels:3,background:'#5b4a8a'}}).png().toBuffer()).toString('base64')
    await page.evaluate(b64=>{const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(b64),c=>c.charCodeAt(0))],'study.png',{type:'image/png'}));document.querySelector('label[for="property-photos"]').dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))},study)
    await page.getByText('Uploaded ·',{exact:false}).nth(3).waitFor()
    check('a pasted photo is uploaded and added at the end',rows.size===4&&(await names()).at(-1)==='study.png')
    // Rows on a phone, cards from 640px.
    const shape=async()=>page.locator('ol[aria-label="Property photos"] li').first().evaluate(li=>{const img=li.firstElementChild.getBoundingClientRect(),text=li.lastElementChild.getBoundingClientRect();return img.right<=text.left+1?'row':img.bottom<=text.top+1?'card':'?'})
    check('390: each photo is a row, the picture beside its tools',await shape()==='row')
    await page.setViewportSize({width:768,height:844});check('768: each photo is a card, the picture above its tools',await shape()==='card')
  }
  for(const width of [320,360,375,390,412,430,768,1280]) {
    await page.setViewportSize({width,height:844});check(`${width}: no overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
    if(width===320){
      // Mid-move, the travelling photo is drawn between cells: still no
      // sideways scroll (UI-08).
      const during=await page.locator('ol[aria-label="Property photos"] li').first().getByRole('button',{name:/later$/}).evaluate((el,travel)=>{el.click();let fits=true;const watch=()=>{fits=fits&&document.documentElement.scrollWidth<=innerWidth+1;if(!done)requestAnimationFrame(watch)};let done=false;requestAnimationFrame(watch);return new Function(`return (${travel})()`)().then(moving=>{done=true;return{moving,fits}})},travelling.toString())
      check('320: no overflow while a photo travels',during.moving>0&&during.fits)
      await page.getByRole('status').filter({hasText:'moved to position 2'}).waitFor()
      // Sizes are read at rest: in flight Motion may scale a tile whose
      // height differs from the cell it is entering.
      await page.waitForFunction(()=>[...document.querySelectorAll('[data-flip-key]')].every(li=>getComputedStyle(li).transform==='none'),null,{timeout:3000})
    }
    check(`${width}: action targets at least 44px`,await page.locator('ol[aria-label="Property photos"] button, ol[aria-label="Property photos"] .photo-handle').evaluateAll(nodes=>nodes.every(node=>{const r=node.getBoundingClientRect();return r.height>=44&&r.width>=44})))
    await page.evaluate(()=>window.scrollTo(0,0))
    await page.screenshot({path:`/tmp/phase15-shots/photos-${width}.png`,fullPage:true})
  }
  unavailable=true;await page.reload();await page.getByRole('button',{name:'Reload photos'}).waitFor();check('outage blocks uploads without claiming an empty collection',await page.locator('#property-photos').isDisabled())
  console.log(`${passed} photo checks passed`)
}finally{await browser.close();await new Promise(resolve=>mock.close(resolve))}
