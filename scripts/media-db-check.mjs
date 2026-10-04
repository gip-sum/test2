import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
const db = new PGlite()
await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth, storage to authenticated;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant select,insert,update,delete on storage.objects to authenticated;`)
await db.exec(readFileSync('supabase/migrations/20261003062359_phase_15_private_property_photos.sql','utf8'))
const a='a9140f33-a429-46f3-9514-3e8f32f18189', b='b9140f33-a429-46f3-9514-3e8f32f18189', c='c9140f33-a429-46f3-9514-3e8f32f18189', id='d9140f33-a429-46f3-9514-3e8f32f18189'
await db.exec(`insert into auth.users values ('${a}'),('${b}'); set role authenticated; set request.jwt.claim.sub='${a}';`)
await db.exec(`insert into public.media_assets(id,owner_id,collection_id,original_name,sha256,width,height,bytes) values ('${id}','${a}','${c}','test.jpg','${'a'.repeat(64)}',640,480,1000); insert into storage.objects(bucket_id,name) values ('property-photos','${a}/${c}/${id}.jpg');`)
const assert=(label,ok)=>{if(!ok)throw Error(label);console.log('ok',label)}
assert('owner sees asset', (await db.query('select * from public.media_assets')).rows.length===1)
await db.exec(`set request.jwt.claim.sub='${b}'`)
assert('other owner cannot read metadata',(await db.query('select * from public.media_assets')).rows.length===0)
assert('other owner cannot read objects',(await db.query('select * from storage.objects')).rows.length===0)
await db.exec(`delete from public.media_assets; delete from storage.objects;`)
let denied=false;try{await db.exec(`insert into storage.objects(bucket_id,name) values ('property-photos','${a}/${c}/other.jpg')`)}catch{denied=true}assert('foreign upload denied',denied)
await db.exec(`set request.jwt.claim.sub='${a}'`)
assert('foreign delete did not affect owner',(await db.query('select * from public.media_assets')).rows.length===1)
await db.exec(`select public.reorder_media_photos('${c}',array['${id}']::uuid[])`)
denied=false;try{await db.exec(`select public.reorder_media_photos('${c}',array['${id}','${id}']::uuid[])`)}catch{denied=true}assert('duplicate reorder denied',denied)
for(let i=1;i<20;i++) await db.query(`insert into public.media_assets(id,owner_id,collection_id,original_name,sha256,width,height,bytes) values (gen_random_uuid(),$1,$2,'test.jpg',$3,640,480,1000)`,[a,c,i.toString(16).padStart(64,'0')])
denied=false;try{await db.query(`insert into public.media_assets(id,owner_id,collection_id,original_name,sha256,width,height,bytes) values (gen_random_uuid(),$1,$2,'test.jpg',$3,640,480,1000)`,[a,c,'f'.repeat(64)])}catch{denied=true}assert('collection quota enforced',denied)
await db.exec(`set request.jwt.claim.sub='${b}'`)
denied=false;try{await db.exec(`update public.media_assets set owner_id='${b}' where id='${id}'`)}catch{denied=true}
assert('cross-owner update affects no rows',(await db.query('select * from public.media_assets')).rows.length===0)
await db.exec(`set request.jwt.claim.sub='${a}'`)
denied=false;try{await db.exec(`update public.media_assets set owner_id='${b}' where id='${id}'`)}catch{denied=true}assert('ownership reassignment denied',denied)
for(let group=1;group<=4;group++) {
 const collection=`00000000-0000-4000-8000-${String(group).padStart(12,'0')}`
 for(let i=0;i<20;i++)await db.query(`insert into public.media_assets(id,owner_id,collection_id,original_name,sha256,width,height,bytes) values (gen_random_uuid(),$1,$2,'test.jpg',$3,640,480,1000)`,[a,collection,i.toString(16).padStart(64,'0')])
}
denied=false;try{await db.query(`insert into public.media_assets(id,owner_id,collection_id,original_name,sha256,width,height,bytes) values (gen_random_uuid(),$1,gen_random_uuid(),'test.jpg',$2,640,480,1000)`,[a,'e'.repeat(64)])}catch{denied=true}assert('100-photo account quota enforced',denied)
await db.exec('reset role; set role anon;')
denied=false;try{await db.query('select * from public.media_assets')}catch{denied=true}assert('anonymous metadata access denied',denied)
await db.close()
