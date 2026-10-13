// Phase 19: enquiries about real listings, against actual PostgreSQL
// (PGlite) with the Phase 9 and 15–19 migrations applied in order.
// Exercises the secure write path, server-derived seller, availability,
// row policies and the per-listing counts the dashboard reads.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
const db = new PGlite()
const owner = 'a9140f33-a429-46f3-9514-3e8f32f18189', foreign = 'b9140f33-a429-46f3-9514-3e8f32f18189', buyer = '29140f33-a429-46f3-9514-3e8f32f18189'
const draft = 'c9140f33-a429-46f3-9514-3e8f32f18189', listing = 'd9140f33-a429-46f3-9514-3e8f32f18189', submission = 'e9140f33-a429-46f3-9514-3e8f32f18189'
const draft2 = 'c9140f33-a429-46f3-9514-3e8f32f18180', review = 'd9140f33-a429-46f3-9514-3e8f32f18180', submission2 = 'e9140f33-a429-46f3-9514-3e8f32f18180'
const missing = 'f9140f33-a429-46f3-9514-3e8f32f18100'
let count = 0
const check = (label, ok) => { if (!ok) throw Error(label); count++; console.log('ok', label) }
async function code(sql) { try { await db.exec(sql); return null } catch (e) { return e.code ?? 'error' } }
async function denied(label, sql, expected) { const c = await code(sql); check(label, c !== null && (!expected || c === expected)) }
const as = (role, sub) => `reset role;set role ${role};${sub ? `set request.jwt.claim.sub='${sub}'` : "set request.jwt.claim.sub=''"};`
const enquire = (id, phone = '+919876543210', name = 'Riya Sen') => `select * from public.submit_listing_enquiry('${id}','${name}','${phone}','Is parking included?')`
const submissionRow = (id, listingId, title) => `insert into public.property_listing_submissions(id,listing_id,draft_revision,preview_hash,title,seller_name,seller_type,intent,property_type,bedrooms,bathrooms,area_unit,carpet_area,furnishing,floor,total_floors,construction_status,age_years,city_name,locality_name,city_id,locality_id,address,price,maintenance_status,negotiable) values('${id}','${listingId}',1,'${'a'.repeat(64)}','${title}','Test Seller','OWNER','buy','APARTMENT',2,2,'sqft',1000,'UNFURNISHED',3,8,'READY',4,'Kolkata','New Town','kolkata','new-town','Test building address',6000000,'none',true);`
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,storage to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated,service_role;grant select on storage.objects to anon;grant usage on schema public to anon,authenticated,service_role;`)
  const files = readdirSync('supabase/migrations').sort()
  for (const suffix of ['_phase_09_enquiry_leads.sql', '_phase_09_private_rpcs.sql', '_phase_09_lead_indexes.sql', '_phase_15_private_property_photos.sql', '_phase_16_property_drafts.sql', '_phase_17_draft_reviews.sql', '_phase_18_property_lifecycle.sql', '_phase_19_listing_enquiries.sql'])
    await db.exec(readFileSync('supabase/migrations/' + files.find((f) => f.endsWith(suffix)), 'utf8'))
  // One active listing and one under review, both owned by `owner`.
  await db.exec(`insert into auth.users values('${owner}'),('${foreign}'),('${buyer}');
    insert into public.property_drafts(id,owner_id,collection_id,page_path) values('${draft}','${owner}','${missing}','/post'),('${draft2}','${owner}','${owner}','/post');
    insert into public.property_listings(id,owner_id,draft_id) values('${listing}','${owner}','${draft}'),('${review}','${owner}','${draft2}');
    ${submissionRow(submission, listing, '2 BHK apartment for sale in New Town')}${submissionRow(submission2, review, '3 BHK apartment for sale in Salt Lake')}
    update public.property_listings set status='ACTIVE',version=1,current_submission_id='${submission}',activated_at=now(),expires_at=now()+interval '30 days' where id='${listing}';
    update public.property_listings set status='UNDER_REVIEW',version=1,current_submission_id='${submission2}' where id='${review}';`)

  await db.exec(as('anon'))
  const first = (await db.query(enquire(listing))).rows[0]
  check('guest enquiry on an active listing is recorded', first.repeated === false && first.seller_notified === true)
  check('follow-up from the same number is flagged', (await db.query(enquire(listing))).rows[0].repeated === true)
  await denied('invalid phone rejected', enquire(listing, '12345'), '22023')
  await denied('blank name rejected', enquire(listing, '+919876543210', '  '), '22023')
  await denied('unknown listing refused', enquire(missing), 'PT410')
  await denied('listing under review refused', enquire(review), 'PT410')
  await denied('anon cannot insert enquiries directly', `insert into public.enquiries(listing_id,listing_title,buyer_name,buyer_phone) values('${listing}','x','x','+919876543210')`)
  await denied('anon cannot read enquiry counts', 'select * from public.seller_listing_enquiry_counts()')
  await denied('private implementation validates its own input', `select * from private.submit_listing_enquiry_impl(null,'a','+919876543210')`, '22023')

  await db.exec('reset role')
  const stored = (await db.query(`select * from public.enquiries where listing_id='${listing}' order by created_at`)).rows
  check('seller derived from the listing owner', stored.every((r) => r.seller_id === owner))
  check('title taken from the immutable submission', stored[0].listing_title === '2 BHK apartment for sale in New Town')
  check('real listing enquiry carries no demo identity', stored.every((r) => r.listing_public_id === null))
  check('repeat links to the first enquiry', stored[1].duplicate_of === stored[0].id)
  check('seller notified once per enquiry', (await db.query(`select count(*)::int as n from public.seller_notifications where seller_id='${owner}'`)).rows[0].n === 2)
  check('lead history recorded', (await db.query(`select event_type from public.lead_events order by created_at`)).rows.map((r) => r.event_type).join() === 'created,repeated')
  await denied('an enquiry must name a listing', `insert into public.enquiries(listing_title,buyer_name,buyer_phone) values('x','x','+919876543210')`, '23514')
  await denied('an enquiry cannot name both identities', `insert into public.enquiries(listing_public_id,listing_id,listing_title,buyer_name,buyer_phone) values('p_demo1','${listing}','x','x','+919876543210')`, '23514')

  await db.exec(as('authenticated', buyer))
  await db.query(enquire(listing, '+919812345678', 'Signed In Buyer'))
  await db.exec('reset role')
  check('signed-in buyer identity recorded', (await db.query(`select buyer_id from public.enquiries where buyer_phone='+919812345678'`)).rows[0].buyer_id === buyer)

  await db.exec(as('authenticated', owner))
  await denied('owner cannot enquire about their own listing', enquire(listing, '+919800000001'), 'PT403')
  const counts = (await db.query('select * from public.seller_listing_enquiry_counts()')).rows
  check('seller sees one count row per listing', counts.length === 1 && counts[0].listing_id === listing)
  check('count includes follow-ups and new leads', counts[0].total === 3 && counts[0].new_count === 3)
  check('seller reads leads on their listing', (await db.query(`select id from public.enquiries where listing_id='${listing}'`)).rows.length === 3)
  const leadId = stored[0].id
  check('seller can update lead status', (await db.query(`select public.update_lead_status('${leadId}','contacted') as ok`)).rows[0].ok === true)
  check('new count follows lead status', (await db.query('select new_count from public.seller_listing_enquiry_counts()')).rows[0].new_count === 2)

  await db.exec(as('authenticated', foreign))
  check('foreign seller sees no counts', (await db.query('select * from public.seller_listing_enquiry_counts()')).rows.length === 0)
  check('foreign seller sees no leads', (await db.query('select id from public.enquiries')).rows.length === 0)
  check('foreign seller cannot change lead status', (await db.query(`select public.update_lead_status('${leadId}','closed') as ok`)).rows[0].ok === false)

  await db.exec(as('anon'))
  for (let i = 0; i < 3; i++) await db.query(enquire(listing))
  await denied('per-listing daily limit enforced', enquire(listing), 'PT429')
  check('demo fixture enquiries still use the Phase 9 path', (await db.query(`select * from public.submit_enquiry('p_demo1','Demo listing','Riya Sen','+919811111111')`)).rows[0].seller_notified === false)

  await db.exec(`reset role;update public.property_listings set expires_at=now()-interval '1 minute',activated_at=now()-interval '2 days' where id='${listing}';${as('anon')}`)
  await denied('expired listing refused before the hourly job runs', enquire(listing, '+919822222222'), 'PT410')
  await db.exec(`reset role;update public.property_listings set expires_at=now()+interval '30 days' where id='${listing}';set role service_role;select public.change_property_listing('${owner}','${listing}',1,'withdraw');${as('anon')}`)
  await denied('withdrawn listing refused', enquire(listing, '+919822222222'), 'PT410')
  await db.exec('reset role')
  check('existing leads survive withdrawal', (await db.query(`select count(*)::int as n from public.enquiries where listing_id='${listing}'`)).rows[0].n === 6)
  console.log(count + ' listing enquiry database checks passed')
} catch (e) { console.error(e.message, e.code ?? '', e.where ?? ''); process.exitCode = 1 } finally { await db.close() }
