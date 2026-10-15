// Phase 23 against a private local Auth/REST simulator. Every account is SAMPLE.
import http from 'node:http'
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const BASE=process.env.BASE_URL??'http://localhost:3101',id=(k,n=1)=>`${k}9140f33-a429-46f3-9514-${String(n).padStart(12,'0')}`
const admin=id('b'),seller=id('a'),moderator=id('b',2),at=()=>new Date().toISOString()
const accounts=Array.from({length:30},(_,i)=>({id:i===0?seller:id('7',i),email:`sample${i}@example.test`,full_name:i===0?'SAMPLE Seller':null,created_at:at(),last_sign_in_at:null,status:'ACTIVE',seller_role:null,version:0,staff_role:null}))
accounts.push({id:admin,email:'sample_admin@example.test',full_name:'SAMPLE Admin',created_at:at(),last_sign_in_at:null,status:'ACTIVE',seller_role:null,version:0,staff_role:'ADMIN'})
const subject=accounts[0],changes=[],requests=[]
let down=false,fail=false,lose=false,stale=false,delay=0,accessDown=false
const mock=http.createServer(async(req,res)=>{
 const chunks=[];for await(const c of req)chunks.push(c)
 const url=new URL(req.url,'http://localhost'),body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):{},token=req.headers.authorization?.slice(7),user={['a'.repeat(48)]:seller,['b'.repeat(48)]:admin,['c'.repeat(48)]:moderator}[token]
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))}
 if(url.pathname==='/auth/v1/user')return user?send(200,{id:user,email:'sample@example.test'}):send(401,{})
 if(url.pathname==='/rest/v1/rpc/my_account_access')return accessDown?send(503,{}):send(200,user!==seller||subject.status==='ACTIVE')
 if(url.pathname==='/rest/v1/rpc/my_staff_role')return send(200,user===admin?'ADMIN':user===moderator?'MODERATOR':null)
 if(url.pathname.startsWith('/rest/v1/rpc/admin_user')||url.pathname==='/rest/v1/rpc/manage_account'){
  if(user!==admin)return send(403,{code:'42501'})
  if(down)return send(503,{})
  if(url.pathname.endsWith('/admin_users')){
   const rows=accounts.filter(a=>(!body.p_q||[a.id,a.email,a.full_name??''].some(v=>v.toLowerCase().includes(body.p_q.toLowerCase())))&&(!body.p_status||a.status===body.p_status)&&(!body.p_role||body.p_role==='unassigned'&&a.seller_role===null||a.seller_role===body.p_role))
   const page=Math.min(body.p_page,Math.max(1,Math.ceil(rows.length/25)))
   return send(200,{rows:rows.slice((page-1)*25,page*25),total:rows.length,page})
  }
  if(url.pathname.endsWith('/admin_user')){
   const account=accounts.find(a=>a.id===body.p_user);if(!account)return send(404,{code:'P0002'})
   const page=(rows,p)=>{const pg=Math.min(p,Math.max(1,Math.ceil(rows.length/25)));return {rows:rows.slice((pg-1)*25,pg*25),total:rows.length,page:pg}}
   return send(200,{account,contact_phone:null,preferred_intent:null,
    listings:page(account.id===seller?Array.from({length:27},(_,i)=>({id:id('d',i+1),title:'SAMPLE listing '+(i+1),status:'ACTIVE',seller_type:'OWNER',created_at:at()})):[],body.p_listings),
    leads:page(account.id===seller?Array.from({length:27},(_,i)=>({id:id('e',i+1),listing_id:id('d',i+1),listing_title:'SAMPLE lead listing '+(i+1),direction:i%2?'sent':'received',status:'new',created_at:at()})):[],body.p_leads),changes:page(account.id===seller?changes:[],body.p_changes)})
  }
  requests.push(body);if(fail)return send(503,{})
  if(delay)await new Promise(r=>setTimeout(r,delay))
  const old=changes.find(c=>c.id===body.p_request)
  if(old)return send(200,{id:old.id,version:old.version_after})
  if(stale||body.p_version!==subject.version)return send(409,{code:'40001'})
  changes.unshift({id:body.p_request,actor_id:admin,reason:body.p_reason,status_before:subject.status,status_after:body.p_status,role_before:subject.seller_role,role_after:body.p_role,version_before:subject.version,version_after:subject.version+1,created_at:at()})
  subject.status=body.p_status;subject.seller_role=body.p_role;subject.version++
  if(lose){lose=false;return send(503,{})}
  return send(200,{id:body.p_request,version:subject.version})
 }
 if(['/rest/v1/saved_properties','/rest/v1/saved_listings'].includes(url.pathname))return send(200,[])
 return send(404,{})
})
await new Promise(r=>mock.listen(3300,'127.0.0.1',r))
let browser,count=0
const check=(name,ok)=>{if(!ok)throw Error(name);count++;console.log('ok',name)}
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH??chromium.executablePath()})
 const context=async(token)=>{const c=await browser.newContext({viewport:{width:1280,height:900}});if(token)await c.addCookies([{name:'gb-access',value:token.repeat(48),url:BASE}]);return c}
 const guest=await(await context()).newPage();await guest.goto(BASE+'/admin/users')
 check('guest returns through login',new URL(guest.url()).pathname==='/login'&&new URL(guest.url()).searchParams.get('next')==='/admin/users')
 for(const token of ['a','c']){const p=await(await context(token)).newPage();const r=await p.goto(BASE+'/admin/users');check('buyer/moderator cannot inspect accounts '+token,r.status()===404);await p.context().close()}
 const p=await(await context('b')).newPage(),detail=BASE+'/admin/users/'+seller
 await p.goto(BASE+'/admin/users');check('directory truthful total',(await p.getByRole('heading',{name:'Accounts (31)',exact:true}).textContent()).includes('(31)'))
 await p.getByLabel('Search name, email or exact account ID').fill('SAMPLE Seller');await p.getByRole('button',{name:'Search accounts'}).click()
 await p.waitForURL('**/admin/users?q=SAMPLE+Seller**');check('search stored in URL',new URL(p.url()).searchParams.get('q')==='SAMPLE Seller')
 await p.reload();check('search survives reload',await p.getByLabel('Search name, email or exact account ID').inputValue()==='SAMPLE Seller')
 await p.getByRole('link',{name:'SAMPLE Seller',exact:true}).click();await p.waitForURL(detail)
 await p.getByRole('heading',{name:'Manage account'}).waitFor();check('account detail and totals',(await p.locator('#listings-title').textContent()).includes('(27)')&&(await p.locator('#leads-title').textContent()).includes('(27)'))
 await p.locator('#listings').getByLabel('Page 2',{exact:true}).click();await p.waitForURL('**listings=2#listings');check('listing history has independent page',await p.locator('#listings > ul > li').count()===2&&await p.locator('#leads > ul > li').count()===25)
 const save=p.getByRole('button',{name:'Save account change',exact:true}),reason=p.getByLabel('Reason (required)'),confirm=p.getByLabel('I confirm this change for this account.')
 await p.getByLabel('Marketplace status',{exact:true}).selectOption('SUSPENDED');await p.getByLabel('Assigned seller role',{exact:true}).selectOption('AGENT');await reason.fill('SAMPLE review: investigate listing activity')
 check('confirmation required',await save.isDisabled());await confirm.check();check('valid confirmed change enabled',await save.isEnabled())
 await reason.fill('SAMPLE updated review reason');check('editing resets confirmation',!await confirm.isChecked());await confirm.check()
 fail=true;await Promise.all([p.waitForResponse(r=>r.url().endsWith('/api/admin/users')&&r.status()===503),save.click()]);await p.locator('form [role="alert"]').waitFor();check('outage keeps input',await reason.inputValue()==='SAMPLE updated review reason'&&await confirm.isChecked())
 fail=false;lose=true;await Promise.all([p.waitForResponse(r=>r.url().endsWith('/api/admin/users')&&r.status()===503),save.click()])
 await p.locator('form [role="alert"]').waitFor();await Promise.all([p.waitForResponse(r=>r.url().endsWith('/api/admin/users')&&r.status()===200),save.click()])
 await p.waitForFunction(()=>document.querySelector('#changes-title')?.textContent.includes('(1)'))
 check('lost-response retries create one change',changes.length===1&&requests.slice(-3).every(r=>r.p_request===requests.at(-1).p_request))
 check('change history visible',(await p.locator('#changes').textContent()).includes('SAMPLE updated review reason'))
 const suspended=await(await context('a')).newPage();await suspended.goto(BASE+'/dashboard');check('same signed-in token sent to suspension recovery',new URL(suspended.url()).pathname==='/account/access'&&(await suspended.locator('h1').textContent()).includes('suspended'))
 check('suspended API blocked',(await suspended.request.post(BASE+'/api/admin/users',{headers:{origin:BASE},data:{}})).status()===403)
 await p.goto(detail);stale=true;await p.getByLabel('Marketplace status',{exact:true}).selectOption('ACTIVE');await reason.fill('SAMPLE restoration reviewed');await confirm.check();await Promise.all([p.waitForResponse(r=>r.url().endsWith('/api/admin/users')&&r.status()===409),save.click()]);await p.locator('form [role="alert"]').waitFor()
 check('stale account requires refresh',await save.isDisabled()&&(await p.locator('form [role="alert"]').textContent()).includes('Refresh'))
 stale=false;await p.reload();await p.getByLabel('Marketplace status',{exact:true}).selectOption('ACTIVE');await reason.fill('SAMPLE restoration reviewed');await confirm.check();delay=600
 await save.click();await p.locator('form[aria-busy="true"]').waitFor();check('saving state is announced',(await p.getByRole('status').allTextContents()).some(t=>t.includes('Saving account')))
 await p.waitForFunction(()=>document.querySelector('#changes-title')?.textContent.includes('(2)'));delay=0
 await suspended.goto(BASE+'/account/access');check('same token recovers after restoration',new URL(suspended.url()).pathname==='/account')
 await p.goto(BASE+'/admin/users?status=ACTIVE&role=AGENT');check('role and status filter results',await p.getByRole('heading',{name:'Accounts (1)',exact:true}).isVisible())
 await p.goto(BASE+'/admin/users?q=nobody-matches');check('empty search is explicit',await p.getByText('No accounts match these filters.',{exact:true}).isVisible())
 down=true;await p.reload();check('read failure distinct from no accounts',await p.locator('main [role="alert"]').isVisible()&&!(await p.locator('body').textContent()).includes('No accounts match these filters.'));down=false
 const missing=await p.goto(BASE+'/admin/users/'+id('0'));check('missing account is 404',missing.status()===404)
 await p.goto(BASE+'/admin/users/'+admin);check('self/staff management absent',await p.getByRole('heading',{name:'Manage account'}).count()===0)
 await p.goto(BASE+'/admin/users/'+id('7',1));check('empty account histories explicit',await p.getByText('No submitted listings.',{exact:true}).isVisible()&&await p.getByText('No lead activity.',{exact:true}).isVisible())
 mkdirSync('.shots/phase23',{recursive:true})
 subject.email='long.sample.account.'.repeat(10)+'@example.test';subject.full_name='SAMPLE '+ 'LongName'.repeat(25)
 for(const width of [390,412,768,1280]){
  await p.setViewportSize({width,height:900})
  for(const path of ['/admin/users', '/admin/users/'+seller]){
   await p.goto(BASE+path)
   check('no overflow '+width+path,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
   check('one h1 '+width+path,await p.locator('h1').count()===1)
   const short=await p.locator('main button, main select, main input:not([type=checkbox]), main a').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().height>0&&n.getBoundingClientRect().height<43.5).map(n=>n.textContent))
   check('44px controls '+width+path,short.length===0)
  }
  await p.screenshot({path:'.shots/phase23/account-'+width+'.png',fullPage:true})
  await p.screenshot({path:'.shots/phase23/account-top-'+width+'.png'})
 }
 await p.goto(detail);await p.getByLabel('Assigned seller role',{exact:true}).focus();await p.keyboard.press('ArrowDown');await p.keyboard.press('Tab')
 check('keyboard reaches reason',await reason.evaluate(el=>el===document.activeElement))
 accessDown=true;await suspended.goto(BASE+'/dashboard');check('access outage gets recovery message',(await suspended.locator('h1').textContent()).includes('unavailable'));accessDown=false
 console.log(`Phase 23 browser checks: ${count} passed`)
}finally{await browser?.close();await new Promise(r=>mock.close(r))}
