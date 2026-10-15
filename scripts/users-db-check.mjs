// Real PostgreSQL semantics, isolated synthetic accounts; no network credentials.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
const db = new PGlite(), id = (k,n=1) => `${k}9140f33-a429-46f3-9514-${String(n).padStart(12,'0')}`
const seller=id('a'),admin=id('b'),moderator=id('b',2),revoked=id('b',3),buyer=id('b',4),empty=id('b',5)
let count=0
const check=(name,ok)=>{if(!ok)throw Error(name);count++;console.log('ok',name)}
const as=(role,user='')=>db.exec(`reset role;set role ${role};set request.jwt.claim.sub='${user}';`)
const deny=async(name,sql,code)=>{let failed;try{await db.exec(sql)}catch(e){failed=e.code}check(name,!!failed&&(!code||failed===code))}
const read=async sql=>(await db.query(sql)).rows[0].v
const change=(user=seller,version=0,status='SUSPENDED',role='AGENT',request=id('f'),reason='SAMPLE account review')=>`select public.manage_account('${user}',${version},'${status}',${role===null?'NULL':`'${role}'`},'${reason}','${request}') as v`
try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
  create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),last_sign_in_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema auth,storage,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
  grant select,insert,update,delete on storage.objects to authenticated,service_role;grant select on storage.objects to anon;`)
 await db.exec(readFileSync('docs/migrations/006-auth-identities.sql','utf8'))
 for(const f of readdirSync('supabase/migrations').sort().filter(f=>f.endsWith('.sql')&&!f.includes('expiry_job'))) await db.exec(readFileSync('supabase/migrations/'+f,'utf8'))
 await db.exec(`insert into auth.users(id,email) values('${seller}','sample_seller@example.test'),('${admin}','sample_admin@example.test'),('${moderator}','sample_moderator@example.test'),('${revoked}','sample_revoked@example.test'),('${buyer}','sample_buyer@example.test'),('${empty}','sample_empty@example.test');
 insert into public.staff_members(user_id,role) values('${admin}','ADMIN'),('${moderator}','MODERATOR'),('${revoked}','ADMIN');update public.staff_members set revoked_at=now() where user_id='${revoked}';
 insert into public.buyer_profiles(id,full_name,contact_phone) values('${seller}','SAMPLE 100% Seller','+919811111111');`)
 for(let n=1;n<=27;n++) await db.exec(`insert into auth.users(id,email,created_at) values('${id('7',n)}','sample_page${n}@example.test',now()-interval '${n} days');`)
 await db.exec(`insert into public.media_assets(id,owner_id,collection_id,original_name,sha256,status,position,width,height,bytes) values('${id('8')}','${seller}','${id('9')}','SAMPLE.jpg','${'a'.repeat(64)}','ready',0,640,480,1000);
  insert into storage.objects(bucket_id,name) values('property-photos','${seller}/${id('9')}/${id('8')}.jpg');`)
 for(let n=1;n<=27;n++) await db.exec(`insert into public.property_drafts(id,owner_id,collection_id,page_path) values('${id('c',n)}','${seller}','${id('9',n)}','/post');
  insert into public.property_listings(id,owner_id,draft_id) values('${id('d',n)}','${seller}','${id('c',n)}');
  insert into public.property_listing_submissions(id,listing_id,draft_revision,preview_hash,title,seller_name,seller_type,intent,property_type,bedrooms,bathrooms,area_unit,carpet_area,furnishing,floor,total_floors,construction_status,age_years,city_name,locality_name,city_id,locality_id,address,price,maintenance_status,negotiable)
  values('${id('e',n)}','${id('d',n)}',1,'${'a'.repeat(64)}','SAMPLE listing ${n}','SAMPLE seller','OWNER','buy','APARTMENT',2,2,'sqft',1000,'UNFURNISHED',3,8,'READY',4,'Kolkata','New Town','kolkata','new-town','SAMPLE building address',6000000,'none',true);
  update public.property_listings set status='ACTIVE',version=1,current_submission_id='${id('e',n)}',activated_at=now(),expires_at=now()+interval '30 days' where id='${id('d',n)}';
  insert into public.enquiries(listing_id,listing_title,seller_id,buyer_id,buyer_name,buyer_phone,message) values('${id('d',n)}','SAMPLE listing ${n}','${seller}','${buyer}','PRIVATE OTHER PERSON','+919822222222','PRIVATE MESSAGE');`)
 const rpc=['select public.admin_users()','select public.admin_user(\''+seller+'\')',change()]
 await as('anon');for(const q of rpc)await deny('guest denied '+q.slice(0,30),q)
 for(const u of [seller,buyer,moderator,revoked]) {await as('authenticated',u);for(const q of rpc)await deny('non-admin/revoked denied '+u+q.slice(0,30),q,'42501')}
 await as('authenticated',admin)
 await deny('private identity projection cannot be invoked',`select private.account_summary('${seller}')`)
 let users=await read('select public.admin_users() as v'); const firstPage=users
 check('accounts without profiles included with truthful total',users.total===33&&users.rows.length===25)
 users=await read("select public.admin_users('sample_empty') as v");check('search email without profile',users.total===1&&users.rows[0].full_name===null)
 check('case insensitive name search',(await read("select public.admin_users('sAmPlE 100') as v")).total===1)
 check('percent is literal',(await read("select public.admin_users('%') as v")).total===1)
 check('underscore is literal',(await read("select public.admin_users('_') as v")).total===33)
 check('exact account id',(await read(`select public.admin_users('${seller}') as v`)).rows[0].id===seller)
 const p2=await read("select public.admin_users('','','',2) as v")
 check('stable pages with no duplication',p2.rows.length===8&&p2.rows.every(a=>!firstPage.rows.some(b=>a.id===b.id)))
 check('past-end page clamped',(await read("select public.admin_users('','','',99999) as v")).page===2)
 for(const q of ["select public.admin_users(null)","select public.admin_users('','BOGUS')","select public.admin_users('','','ADMIN')","select public.admin_users('','','',0)"])await deny('invalid search rejected '+q,q,'22023')
 await deny('missing account',`select public.admin_user('${id('0')}')`,'P0002')
 let detail=await read(`select public.admin_user('${seller}',2,2,1) as v`)
 check('listing and lead histories paginate independently',detail.listings.total===27&&detail.listings.rows.length===2&&detail.leads.total===27&&detail.leads.rows.length===2)
 check('only subject contact projected',detail.contact_phone==='+919811111111'&&!JSON.stringify(detail).includes('PRIVATE')&&!JSON.stringify(detail).includes('+919822'))
 check('received direction correct',detail.leads.rows.every(l=>l.direction==='received'))
 check('buyer sees sent direction',(await read(`select public.admin_user('${buyer}') as v`)).leads.rows.every(l=>l.direction==='sent'))
 check('empty histories truthful',(await read(`select public.admin_user('${empty}') as v`)).listings.total===0)
 for(const u of [admin,moderator,revoked])await deny('self and all staff targets protected '+u,change(u),'42501')
 const formerStaff=await read(`select public.admin_user('${revoked}') as v`)
 check('revoked staff remain operator-managed without active staff claims',formerStaff.account.operator_managed===true&&formerStaff.account.staff_role===null)
 await deny('no-op not audited',change(seller,0,'ACTIVE',null),'22023')
 await deny('short reason',change(seller,0,'SUSPENDED','AGENT',id('f'),'bad'),'22023')
 await deny('invalid role',change(seller,0,'SUSPENDED','ADMIN'),'22023')
 let saved=await read(change());check('change increments version',saved.id===id('f')&&saved.version===1)
 check('identical retry idempotent',(await read(change())).version===1)
 await deny('changed retry rejected',change(seller,0,'ACTIVE','AGENT'),'40001')
 await deny('stale version rejected',change(seller,0,'ACTIVE','AGENT',id('f',2)),'40001')
 detail=await read(`select public.admin_user('${seller}') as v`)
 check('status role and immutable history agree',detail.account.status==='SUSPENDED'&&detail.account.seller_role==='AGENT'&&detail.changes.total===1&&detail.changes.rows[0].status_before==='ACTIVE')
 check('role filters use assigned role',(await read("select public.admin_users('','','AGENT') as v")).total===1)
 check('status filters use live controls',(await read("select public.admin_users('','SUSPENDED') as v")).total===1)
 await deny('admin cannot directly alter controls',"update public.account_controls set status='ACTIVE'")
 await deny('admin cannot directly write history','delete from public.account_actions')
 await as('authenticated',seller)
 check('existing JWT immediately loses marketplace access',(await read('select public.my_account_access() as v'))===false)
 check('suspended profile read blocked',(await db.query('select * from public.buyer_profiles')).rows.length===0)
 check('suspended draft read blocked',(await db.query('select * from public.property_drafts')).rows.length===0)
 check('suspended listing read blocked',(await db.query('select * from public.property_listings')).rows.length===0)
 check('suspended lead read blocked',(await db.query('select * from public.enquiries')).rows.length===0)
 check('suspended private storage read blocked',(await db.query('select * from storage.objects')).rows.length===0)
 await deny('suspended private storage write blocked',`insert into storage.objects(bucket_id,name) values('property-photos','${seller}/${id('9')}/${id('8')}.jpg')`,'42501')
 check('suspended seller aggregates hidden',(await db.query('select * from public.seller_listing_save_counts()')).rows.length===0)
 check('own status remains readable',(await db.query('select status from public.account_controls')).rows[0].status==='SUSPENDED')
 check('suspended profile update affects no rows',(await db.query(`update public.buyer_profiles set full_name='Blocked' where id='${seller}' returning id`)).rows.length===0)
 // UPDATE with invisible rows affects zero rows; it is not necessarily an exception.
 await db.exec('reset role');check('profile remains unchanged',(await db.query("select full_name from public.buyer_profiles where id='"+seller+"'")).rows[0].full_name==='SAMPLE 100% Seller')
 await as('authenticated',seller)
 for(const q of ["select public.save_listing('"+id('d')+"')","select public.update_lead_status(gen_random_uuid(),'closed')","select * from public.submit_listing_enquiry('"+id('d')+"','Sample','+919811111111',null)","select * from public.submit_enquiry('p_demo1','Sample','Sample','+919811111111',null)"])await deny('suspended privileged RPC blocked '+q,q,'42501')
 await as('service_role');await deny('service submission checks subject',`select public.submit_property_listing('${seller}','${id('c')}','${id('d')}','${id('f',9)}',1,'{}','[]')`,'42501')
 await deny('service lifecycle checks subject',`select public.change_property_listing('${seller}','${id('d')}',1,'withdraw')`,'42501')
 await deny('service description job checks subject',`select * from public.create_property_description_job('${seller}','${id('c')}',1,'${'a'.repeat(64)}','provider/model','{}')`,'42501')
 await as('anon');check('already published listing stays public',(await db.query('select id from public.property_listings')).rows.length===27)
 await as('authenticated',admin);await read(change(seller,1,'ACTIVE','BUILDER',id('f',2),'SAMPLE restoration approved'))
 await as('authenticated',seller);check('restoration immediate with same JWT',await read('select public.my_account_access() as v')===true)
 check('restoration restores owned reads',(await db.query('select id from public.property_drafts')).rows.length===27)
 check('restoration restores private storage',(await db.query('select * from storage.objects')).rows.length===1)
 await as('authenticated',admin)
 const race=await Promise.allSettled([db.query(change(seller,2,'ACTIVE','OWNER',id('f',10))),db.query(change(seller,2,'ACTIVE','AGENT',id('f',11)))])
 check('concurrent versions have exactly one winner',race.filter(r=>r.status==='fulfilled').length===1&&race.filter(r=>r.status==='rejected'&&r.reason.code==='40001').length===1)
 await db.exec('reset role')
 await deny('history immutable for table owner','update public.account_actions set reason=reason')
 await deny('history cannot be deleted by table owner','delete from public.account_actions')
 await db.exec(`insert into public.account_controls(user_id,status,version) values('${admin}','SUSPENDED',1)`)
 await as('authenticated',admin);await deny('suspended admin loses RPC access','select public.admin_users()','42501')
 check('suspended admin loses staff role',await read('select public.my_staff_role() as v')===null)
 await deny('suspended admin cannot moderate',`select public.moderation_decide('${id('d')}','${id('e')}',1,'APPROVE',null,90,'${id('f',5)}')`,'42501')
 console.log(`Phase 23 database checks: ${count} passed`)
} catch(e) { console.error(e.message,e.code??'',e.where??'');process.exitCode=1 } finally { await db.close() }
