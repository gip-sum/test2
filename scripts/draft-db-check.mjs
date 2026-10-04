import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
const db = new PGlite()
const a='a9140f33-a429-46f3-9514-3e8f32f18189', b='b9140f33-a429-46f3-9514-3e8f32f18189', id='c9140f33-a429-46f3-9514-3e8f32f18189'
let passed=0
const check=(label,ok)=>{if(!ok)throw Error(label);passed++;console.log('ok',label)}
async function denies(label,sql){let denied=false;try{await db.exec(sql)}catch{denied=true}check(label,denied)}
try {
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; insert into auth.users values ('${a}'),('${b}');`)
 const file=readdirSync('supabase/migrations').find(p=>p.endsWith('_phase_16_property_drafts.sql'))
 await db.exec(readFileSync('supabase/migrations/'+file,'utf8'))
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}';insert into public.property_drafts(id,owner_id,collection_id,page_path,carpet) values ('${id}','${a}',gen_random_uuid(),'/post','1,');`)
 check('partial value persists',(await db.query('select carpet from property_drafts')).rows[0].carpet==='1,')
 await db.exec(`update public.property_drafts set carpet='' where id='${id}' and revision=1`)
 check('revision increments and blank persists',(await db.query('select revision,carpet from property_drafts')).rows[0].revision===2)
 await db.exec(`update public.property_drafts set carpet='overwrite' where id='${id}' and revision=1`)
 check('stale revision cannot overwrite',(await db.query('select carpet from property_drafts')).rows[0].carpet==='')
 await denies('owner immutable',`update property_drafts set owner_id='${b}'`)
 await denies('collection immutable','update property_drafts set collection_id=gen_random_uuid()')
 await db.exec(`set request.jwt.claim.sub='${b}';`)
 check('foreign reads hidden',(await db.query('select * from property_drafts')).rows.length===0)
 await db.exec(`update property_drafts set carpet='foreign' where id='${id}'`)
 await denies('foreign creation denied',`insert into property_drafts(id,owner_id,collection_id,page_path) values (gen_random_uuid(),'${a}',gen_random_uuid(),'/post')`)
 await db.exec(`set request.jwt.claim.sub='${a}'`)
 check('foreign write ineffective',(await db.query('select carpet from property_drafts')).rows[0].carpet==='')
 await db.exec(`insert into property_drafts(id,owner_id,collection_id,page_path) select gen_random_uuid(),'${a}',gen_random_uuid(),'/post' from generate_series(1,49)`)
 await denies('50 draft quota enforced',`insert into property_drafts(id,owner_id,collection_id,page_path) values(gen_random_uuid(),'${a}',gen_random_uuid(),'/post')`)
 await db.exec('reset role; set role anon')
 await denies('anonymous read denied','select * from property_drafts')
 console.log(passed+' draft database checks passed')
} finally { await db.close() }
