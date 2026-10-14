import {PGlite} from '@electric-sql/pglite'
import {readFileSync,readdirSync} from 'node:fs'
const db=new PGlite(),a='a9140f33-a429-46f3-9514-3e8f32f18189',b='b9140f33-a429-46f3-9514-3e8f32f18189',draft='c9140f33-a429-46f3-9514-3e8f32f18189'
let count=0
const check=(label,ok)=>{if(!ok)throw Error(label);count++;console.log('ok',label)}
async function denied(label,sql){let failed=false;try{await db.exec(sql)}catch{failed=true}check(label,failed)}
const create=(n,owner=a,revision=1)=>`select * from public.create_property_description_job('${owner}','${draft}',${revision},'${n.toString(16).padStart(64,'0')}','test/model','{"intent":"buy"}')`
try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,service_role;insert into auth.users values('${a}'),('${b}');create table public.property_listing_submissions(id uuid primary key);grant select on public.property_listing_submissions to authenticated,service_role;`)
 for(const suffix of ['_phase_16_property_drafts.sql','_python_ai_descriptions.sql']) await db.exec(readFileSync('supabase/migrations/'+readdirSync('supabase/migrations').find(f=>f.endsWith(suffix)),'utf8'))
 await db.exec(`grant select,update on public.property_drafts to service_role;set role authenticated;set request.jwt.claim.sub='${a}';insert into property_drafts(id,owner_id,collection_id,page_path) values('${draft}','${a}',gen_random_uuid(),'/post');reset role;set role service_role`)
 const first=(await db.query(create(1))).rows[0],id=first.id
 check('real queued job created',first.status==='QUEUED')
 check('pending dispatch persists',first.dispatched===false)
 await db.exec(`select public.dispatch_property_description_job('${id}')`)
 check('accepted dispatch recorded',(await db.query(`select dispatched from property_description_jobs where id='${id}'`)).rows[0].dispatched===true)
 check('duplicate reuses identity',(await db.query(create(1))).rows[0].id===id)
 await denied('foreign draft cannot generate',create(2,b))
 await denied('stale revision rejected',create(2,a,2))
 await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${a}'`)
 check('owner reads own output',(await db.query('select id,status,result from property_description_jobs')).rows.length===1)
 await denied('owner cannot read prompt or lease','select facts,lease_token from property_description_jobs')
 await denied('owner cannot insert jobs',`insert into property_description_jobs(owner_id,draft_id,draft_revision,content_hash,model,facts) values('${a}','${draft}',1,'${'a'.repeat(64)}','test/model','{}')`)
 await denied('owner cannot invoke privileged creation',create(2))
 await denied('owner cannot forge dispatch',`select public.dispatch_property_description_job('${id}')`)
 await denied('owner cannot claim jobs',`select public.claim_property_description_job('${id}')`)
 await db.exec(`set request.jwt.claim.sub='${b}'`)
 check('foreign jobs hidden',(await db.query('select id from property_description_jobs')).rows.length===0)
 await db.exec('reset role;set role anon')
 await denied('guest jobs unavailable','select id from property_description_jobs')
 await db.exec('reset role;set role service_role')
 const claimed=(await db.query(`select * from claim_property_description_job('${id}')`)).rows[0]
 check('claim leases one attempt',claimed.attempts===1&&claimed.status==='RUNNING'&&claimed.lease_token)
 check('live duplicate does not claim',(await db.query(`select * from claim_property_description_job('${id}')`)).rows.length===0)
 check('stale worker fenced',(await db.query(`select finish_property_description_job('${id}',gen_random_uuid(),'wrong',null) as accepted`)).rows[0].accepted===false)
 await db.exec(`update property_description_jobs set lease_until=now()-interval '1 second' where id='${id}'`)
 const reclaimed=(await db.query(`select * from claim_property_description_job('${id}')`)).rows[0]
 check('crashed lease recovered',reclaimed.attempts===2&&reclaimed.lease_token!==claimed.lease_token)
 check('old lease cannot complete',(await db.query(`select finish_property_description_job('${id}','${claimed.lease_token}','old',null) as accepted`)).rows[0].accepted===false)
 await db.exec(`select finish_property_description_job('${id}','${reclaimed.lease_token}',null,'PROVIDER_UNAVAILABLE',true)`)
 const third=(await db.query(`select * from claim_property_description_job('${id}')`)).rows[0]
 await db.exec(`select finish_property_description_job('${id}','${third.lease_token}',null,'PROVIDER_UNAVAILABLE',true)`)
 check('third provider failure terminal',(await db.query(`select status from property_description_jobs where id='${id}'`)).rows[0].status==='FAILED')
 const success=(await db.query(create(2))).rows[0],lease=(await db.query(`select * from claim_property_description_job('${success.id}')`)).rows[0]
 await db.exec(`select finish_property_description_job('${success.id}','${lease.lease_token}','A factual description.',null)`)
 check('successful output persisted',(await db.query(`select result,status from property_description_jobs where id='${success.id}'`)).rows[0].result==='A factual description.')
 check('completed duplicate ignored',(await db.query(`select * from claim_property_description_job('${success.id}')`)).rows.length===0)
 for(let n=3;n<=5;n++)await db.exec(create(n))
 await denied('owner daily limit enforced',create(6))
 check('duplicate still available after quota',(await db.query(create(2))).rows[0].id===success.id)
 await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${a}';update property_drafts set description='Reviewed paragraph.' where id='${draft}'`)
 check('description edit increments revision',(await db.query('select revision from property_drafts')).rows[0].revision===2)
 await denied('description limit enforced',`update property_drafts set description=repeat('a',2001)`)
 await denied('description control rejected',`update property_drafts set description=E'a\nb'`)
 console.log(count+' description database checks passed')
}catch(e){console.error(e.message,e.where??'');process.exitCode=1}finally{await db.close()}
