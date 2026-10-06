import { PGlite } from '@electric-sql/pglite'
import { readFileSync,readdirSync } from 'node:fs'
const db=new PGlite(),a='a9140f33-a429-46f3-9514-3e8f32f18189',b='b9140f33-a429-46f3-9514-3e8f32f18189',id='c9140f33-a429-46f3-9514-3e8f32f18189';let count=0
const check=(name,ok)=>{if(!ok)throw Error(name);count++;console.log('ok',name)}
async function denied(name,sql){let failed=false;try{await db.exec(sql)}catch{failed=true}check(name,failed)}
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;insert into auth.users values('${a}'),('${b}');`)
 for(const suffix of ['_phase_16_property_drafts.sql','_phase_17_draft_reviews.sql'])await db.exec(readFileSync('supabase/migrations/'+readdirSync('supabase/migrations').find(f=>f.endsWith(suffix)),'utf8'))
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}';insert into property_drafts(id,owner_id,collection_id,page_path) values('${id}','${a}',gen_random_uuid(),'/post');insert into property_draft_reviews(draft_id,owner_id,draft_revision,content_hash) values('${id}','${a}',1,'${'a'.repeat(64)}');`)
 check('owner can confirm',(await db.query('select * from property_draft_reviews')).rows.length===1)
 await db.exec(`update property_drafts set carpet='1000' where id='${id}'`)
 await denied('old revision cannot be reconfirmed',`update property_draft_reviews set content_hash='${'b'.repeat(64)}' where draft_id='${id}'`)
 await db.exec(`update property_draft_reviews set draft_revision=2,content_hash='${'b'.repeat(64)}' where draft_id='${id}'`)
 check('current revision can be confirmed',(await db.query('select draft_revision from property_draft_reviews')).rows[0].draft_revision===2)
 await db.exec(`set request.jwt.claim.sub='${b}'`)
 check('foreign confirmation hidden',(await db.query('select * from property_draft_reviews')).rows.length===0)
 await db.exec(`update property_draft_reviews set content_hash='${'c'.repeat(64)}' where draft_id='${id}'`)
 await denied('foreign draft cannot be claimed',`insert into property_draft_reviews(draft_id,owner_id,draft_revision,content_hash) values('${id}','${b}',2,'${'c'.repeat(64)}')`)
 await db.exec(`set request.jwt.claim.sub='${a}'`)
 check('foreign update ineffective',(await db.query('select content_hash from property_draft_reviews')).rows[0].content_hash==='b'.repeat(64))
 await denied('review owner immutable',`update property_draft_reviews set owner_id='${b}'`)
 await db.exec('reset role;set role anon')
 await denied('anonymous review hidden','select * from property_draft_reviews')
 console.log(count+' preview database checks passed')
}finally{await db.close()}
