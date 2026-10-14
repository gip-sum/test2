import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
const db = new PGlite(), id = (k,n=1) => `${k}9140f33-a429-46f3-9514-${String(n).padStart(12,'0')}`
const owner=id('a'), admin=id('b'), moderator=id('b',2), revoked=id('b',3), buyer=id('b',4)
let count=0
const check=(name,ok)=>{if(!ok)throw Error(name);count++;console.log('ok',name)}
const as=(role,user='')=>db.exec(`reset role;set role ${role};set request.jwt.claim.sub='${user}';`)
const deny=async(name,sql,code)=>{let failed;try{await db.exec(sql)}catch(e){failed=e.code}check(name,!!failed&&(!code||failed===code))}
const decision=(n,action='APPROVE',reason='NULL',days='90',request=id('f',n),version=1,submission=id('e',n))=>`select to_jsonb(public.moderation_decide('${id('d',n)}','${submission}',${version},'${action}',${reason},${days},'${request}')) as decision`
try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
  create table auth.users(id uuid primary key,created_at timestamptz default now());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema auth,storage,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated,service_role;grant select on storage.objects to anon;`)
 const files=readdirSync('supabase/migrations').sort()
 for(const suffix of ['phase_09_enquiry_leads','phase_09_private_rpcs','phase_09_lead_indexes','phase_15_private_property_photos','phase_16_property_drafts','phase_17_draft_reviews','phase_18_property_lifecycle','phase_19_listing_enquiries','phase_20_listing_analytics','phase_21_admin_console','python_ai_descriptions','phase_22_listing_moderation']) await db.exec(readFileSync('supabase/migrations/'+files.find(f=>f.endsWith('_'+suffix+'.sql')),'utf8'))
 await db.exec(`insert into auth.users(id) values('${owner}'),('${admin}'),('${moderator}'),('${revoked}'),('${buyer}');insert into public.staff_members(user_id,role) values('${admin}','ADMIN'),('${moderator}','MODERATOR'),('${revoked}','MODERATOR');update public.staff_members set revoked_at=now() where user_id='${revoked}';`)
 for(let n=1;n<=8;n++) {
  const seller=n===8?moderator:owner
  await db.exec(`insert into public.property_drafts(id,owner_id,collection_id,page_path) values('${id('c',n)}','${seller}','${id('9',n)}','/post');
   insert into public.property_draft_reviews(draft_id,owner_id,draft_revision,content_hash) values('${id('c',n)}','${seller}',1,'${'a'.repeat(64)}');
   insert into public.property_listings(id,owner_id,draft_id) values('${id('d',n)}','${seller}','${id('c',n)}');
   insert into public.property_listing_submissions(id,listing_id,draft_revision,preview_hash,title,seller_name,seller_type,intent,property_type,bedrooms,bathrooms,area_unit,carpet_area,furnishing,floor,total_floors,construction_status,age_years,city_name,locality_name,city_id,locality_id,address,price,maintenance_status,negotiable)
   values('${id('e',n)}','${id('d',n)}',1,'${'a'.repeat(64)}','SAMPLE listing ${n}','SAMPLE seller','OWNER','buy','APARTMENT',2,2,'sqft',1000,'UNFURNISHED',3,8,'READY',4,'Kolkata','New Town','kolkata','new-town','SAMPLE building address',6000000,'none',true);
   update public.property_listings set status='UNDER_REVIEW',version=1,current_submission_id='${id('e',n)}' where id='${id('d',n)}';
   insert into public.property_listing_photos(submission_id,id,source_id,object_path,position,width,height,bytes,sha256) values('${id('e',n)}','${id('8',n)}','${id('8',n)}','${id('e',n)}/${id('8',n)}.jpg',0,640,480,1000,'${'a'.repeat(64)}');
   insert into storage.objects(bucket_id,name) values('listing-photos','${id('e',n)}/${id('8',n)}.jpg');`)
 }
 await as('anon');await deny('guest cannot decide',decision(1));await deny('guest cannot read review',`select public.moderation_review('${id('d',1)}')`);await deny('guest cannot read history','select * from public.moderation_actions')
 for(const user of [owner,buyer,revoked]) {
  await as('authenticated',user);await deny('nonreviewer/revoked cannot decide '+user,decision(1),'42501');await deny('nonreviewer/revoked cannot inspect queue '+user,'select public.moderation_queue(25,0)','42501')
 }
 await as('authenticated',moderator)
 check('moderator identity is current',(await db.query('select public.my_staff_role() as role')).rows[0].role==='MODERATOR')
 for(const sql of ['select public.admin_overview()','select * from public.admin_listings()','select public.admin_system_status()']) await deny('moderator cannot access administration '+sql,sql,'42501')
 check('moderator sees real queue total',(await db.query('select public.moderation_queue(25,0) as q')).rows[0].q.total===8)
 check('past-end queue clamps to existing page',(await db.query('select public.moderation_queue(25,100) as q')).rows[0].q.rows.length===8)
 const review=(await db.query(`select public.moderation_review('${id('d',1)}') as r`)).rows[0].r
 check('review is saved copy with photos',review.submission.title==='SAMPLE listing 1'&&review.photos.length===1&&!('preview_hash' in review.submission))
 check('reviewer storage policy exposes private current copies',(await db.query("select count(*)::int n from storage.objects where bucket_id='listing-photos'")).rows[0].n===8)
 await deny('reviewer cannot decide own listing',decision(8),'42501')
 await deny('changed submission is refused',decision(1,'APPROVE','NULL','90',id('f',1),1,id('e',2)),'40001')
 for(const sql of [decision(1,'APPROVE','NULL','0'),decision(1,'APPROVE','NULL','181'),decision(1,'APPROVE','NULL','NULL'),decision(1,'REJECT',"'bad'",'NULL'),decision(1,'REQUEST_CORRECTION','NULL','NULL'),decision(1,'REJECT',"'Valid reason'",'90'),decision(1,'INVALID')]) await deny('invalid decision rejected '+sql,sql,'22023')
 const approve=(await db.query(decision(1))).rows[0].decision
 check('approval records caller and bounded expiry',approve.actor_id===moderator&&approve.approval_days===90&&approve.version_after===2)
 check('same request retries without new action',(await db.query(decision(1))).rows[0].decision.id===approve.id)
 await deny('request cannot be reused with different content',decision(1,'APPROVE',"'New note'"),'40001')
 await deny('stale second reviewer cannot decide already reviewed copy',decision(1,'REJECT',"'Clear reason'",'NULL',id('f',91)),'40001')
 await db.query(decision(2,'REJECT',"'The supplied photos are unclear'",'NULL'))
 await db.query(decision(3,'REQUEST_CORRECTION',"'Please replace the unclear photographs'",'NULL'))
 await as('authenticated',owner)
 const listings=(await db.query('select id,status,rejection_reason from public.property_listings order by id')).rows
 check('correction and rejection are distinct owner states',listings.find(l=>l.id===id('d',2)).status==='REJECTED'&&listings.find(l=>l.id===id('d',3)).status==='CHANGES_REQUESTED')
 check('owner sees only their own decision history',(await db.query('select count(*)::int n from public.moderation_actions')).rows[0].n===3)
 check('correction clears previous preview confirmation',(await db.query(`select count(*)::int n from public.property_draft_reviews where draft_id='${id('c',3)}'`)).rows[0].n===0)
 await deny('owner cannot insert decisions',`insert into public.moderation_actions select * from public.moderation_actions limit 1`)
 await deny('owner cannot update audit','update public.moderation_actions set reason=reason')
 await as('authenticated',buyer);check('foreign owner cannot read audit',(await db.query('select count(*)::int n from public.moderation_actions')).rows[0].n===0)
 check('ordinary account cannot read private review photos',(await db.query("select count(*)::int n from storage.objects where bucket_id='listing-photos'")).rows[0].n===0)
 await as('anon');check('only approved copy is public',(await db.query('select count(*)::int n from public.property_listings')).rows[0].n===1)
 await as('service_role');await deny('service role cannot bypass reviewer RPC',decision(4))
 await as('authenticated',admin);check('admin can filter correction state',(await db.query("select * from public.admin_listings('CHANGES_REQUESTED')")).rows.length===1)
 await db.query(decision(8,'APPROVE','NULL','1'))
 await db.exec('reset role')
 await deny('audit history cannot be edited even by table owner','update public.moderation_actions set reason=reason')
 await deny('audit history cannot be deleted even by table owner','delete from public.moderation_actions')
 check('each staff decision has one status event',(await db.query("select count(*)::int n from public.property_listing_events where actor_type='OPERATOR'")).rows[0].n===4)
 await as('authenticated',admin)
 const race=await Promise.allSettled([db.query(decision(7)),db.query(decision(7,'REJECT',"'A concurrent rejection'",'NULL',id('f',97)))])
 check('two concurrent decisions have one winner',race.filter(r=>r.status==='fulfilled').length===1&&race.filter(r=>r.status==='rejected'&&r.reason.code==='40001').length===1)
 await db.exec('reset role')
 const snapshot=(await db.query(`select to_jsonb(s)-array['id','listing_id','created_at'] as s from public.property_listing_submissions s where id='${id('e',3)}'`)).rows[0].s
 await db.exec(`insert into public.media_assets(id,owner_id,collection_id,original_name,sha256,status,position,width,height,bytes) values('${id('8',3)}','${owner}','${id('9',3)}','SAMPLE.jpg','${'a'.repeat(64)}','ready',0,640,480,1000);`)
 const request=id('7',3),photos=[{id:id('8',3),source_id:id('8',3),object_path:`${request}/${id('8',3)}.jpg`,position:0,width:640,height:480,bytes:1000,sha256:'a'.repeat(64)}]
 const resubmit=`select to_jsonb(public.submit_property_listing('${owner}','${id('c',3)}','${id('d',3)}','${request}',2,'${JSON.stringify(snapshot)}','${JSON.stringify(photos)}')) as l`
 await as('service_role');await deny('correction re-submit requires fresh preview confirmation',resubmit)
 await db.exec('reset role');await db.exec(`insert into public.property_draft_reviews(draft_id,owner_id,draft_revision,content_hash) values('${id('c',3)}','${owner}',1,'${'a'.repeat(64)}');`)
 await as('service_role');const renewed=(await db.query(resubmit)).rows[0].l
 check('freshly confirmed correction returns a new copy to review',renewed.status==='UNDER_REVIEW'&&renewed.current_submission_id===request&&renewed.version===3)
 await as('authenticated',moderator);await deny('old review cannot decide new submitted copy',decision(3,'APPROVE','NULL','90',id('f',93),3),'40001')
 await db.exec('reset role');await db.exec(`update public.staff_members set revoked_at=now() where user_id='${moderator}'`)
 await as('authenticated',moderator);await deny('revocation blocks new decisions immediately',decision(4),'42501');check('revocation hides staff-only storage',(await db.query("select count(*)::int n from storage.objects where name='"+id('e',4)+"/"+id('8',4)+".jpg'")).rows[0].n===0)
 console.log(`Phase 22 moderation database checks: ${count} passed`)
} finally { await db.close() }
