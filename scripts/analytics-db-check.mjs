// Phase 20: listing analytics against actual PostgreSQL (PGlite) with the
// Phase 9 and 15–20 migrations applied in order. Exercises view dedupe and
// exclusions, mark purging, saved listings, aggregate-only save counts and
// the seller activity function's scoping.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
const db = new PGlite()
const owner = 'a9140f33-a429-46f3-9514-3e8f32f18189', foreign = 'b9140f33-a429-46f3-9514-3e8f32f18189', buyer = '29140f33-a429-46f3-9514-3e8f32f18189'
const draft = 'c9140f33-a429-46f3-9514-3e8f32f18189', listing = 'd9140f33-a429-46f3-9514-3e8f32f18189', submission = 'e9140f33-a429-46f3-9514-3e8f32f18189'
const draft2 = 'c9140f33-a429-46f3-9514-3e8f32f18180', review = 'd9140f33-a429-46f3-9514-3e8f32f18180', submission2 = 'e9140f33-a429-46f3-9514-3e8f32f18180'
const key = (c) => c.repeat(64)
let count = 0
const check = (label, ok, detail = '') => { if (!ok) throw Error(`${label} ${detail}`); count++; console.log('ok', label) }
async function code(sql) { try { await db.exec(sql); return null } catch (e) { return e.code ?? 'error' } }
async function denied(label, sql, expected) { const c = await code(sql); check(label, c !== null && (!expected || c === expected), String(c)) }
const as = (role, sub) => `reset role;set role ${role};${sub ? `set request.jwt.claim.sub='${sub}'` : "set request.jwt.claim.sub=''"};`
const view = (id, k, viewer = null) => `select public.record_listing_view('${id}','${k}',${viewer ? `'${viewer}'` : 'null'}) as counted`
const counted = async (sql) => (await db.query(sql)).rows[0].counted
const submissionRow = (id, listingId, title) => `insert into public.property_listing_submissions(id,listing_id,draft_revision,preview_hash,title,seller_name,seller_type,intent,property_type,bedrooms,bathrooms,area_unit,carpet_area,furnishing,floor,total_floors,construction_status,age_years,city_name,locality_name,city_id,locality_id,address,price,maintenance_status,negotiable) values('${id}','${listingId}',1,'${'a'.repeat(64)}','${title}','Test Seller','OWNER','buy','APARTMENT',2,2,'sqft',1000,'UNFURNISHED',3,8,'READY',4,'Kolkata','New Town','kolkata','new-town','Test building address',6000000,'none',true);`
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,storage to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated,service_role;grant select on storage.objects to anon;grant usage on schema public to anon,authenticated,service_role;`)
  const files = readdirSync('supabase/migrations').sort()
  for (const suffix of ['_phase_09_enquiry_leads.sql', '_phase_09_private_rpcs.sql', '_phase_09_lead_indexes.sql', '_phase_15_private_property_photos.sql', '_phase_16_property_drafts.sql', '_phase_17_draft_reviews.sql', '_phase_18_property_lifecycle.sql', '_phase_19_listing_enquiries.sql', '_phase_20_listing_analytics.sql'])
    await db.exec(readFileSync('supabase/migrations/' + files.find((f) => f.endsWith(suffix)), 'utf8'))
  await db.exec(`grant usage on schema private to service_role;insert into auth.users values('${owner}'),('${foreign}'),('${buyer}');
    insert into public.property_drafts(id,owner_id,collection_id,page_path) values('${draft}','${owner}','${foreign}','/post'),('${draft2}','${owner}','${owner}','/post');
    insert into public.property_listings(id,owner_id,draft_id) values('${listing}','${owner}','${draft}'),('${review}','${owner}','${draft2}');
    ${submissionRow(submission, listing, '2 BHK apartment for sale in New Town')}${submissionRow(submission2, review, '3 BHK apartment for sale in Salt Lake')}
    update public.property_listings set status='ACTIVE',version=1,current_submission_id='${submission}',activated_at=now(),expires_at=now()+interval '30 days' where id='${listing}';
    update public.property_listings set status='UNDER_REVIEW',version=1,current_submission_id='${submission2}' where id='${review}';`)

  // ── Views ───────────────────────────────────────────────────────────────
  await db.exec(as('service_role'))
  check('first view from a browser is counted', await counted(view(listing, key('a'))) === true)
  check('the same browser again today is not', await counted(view(listing, key('a'))) === false)
  check('a different browser is counted', await counted(view(listing, key('b'), buyer)) === true)
  check('the owner viewing their own listing is not counted', await counted(view(listing, key('c'), owner)) === false)
  check('a listing under review is not counted', await counted(view(review, key('d'))) === false)
  check('a malformed visitor key is not counted', await counted(view(listing, 'not-a-key')) === false)
  await db.exec('reset role')
  check('two views recorded for today', (await db.query(`select views from public.property_listing_daily_stats where listing_id='${listing}'`)).rows[0].views === 2)
  check('today is the India date', (await db.query(`select day = (now() at time zone 'Asia/Kolkata')::date as ok from public.property_listing_daily_stats`)).rows[0].ok === true)
  await db.exec(`insert into public.property_listing_view_marks values('${listing}',(now() at time zone 'Asia/Kolkata')::date - 5,'${key('e')}');${as('service_role')}`)
  await counted(view(listing, key('f')))
  await db.exec('reset role')
  check('marks older than yesterday are purged on the next view', (await db.query(`select count(*)::int as n from public.property_listing_view_marks where day < (now() at time zone 'Asia/Kolkata')::date - 1`)).rows[0].n === 0)
  await db.exec(`update public.property_listings set activated_at=now()-interval '2 days',expires_at=now()-interval '1 minute' where id='${listing}';${as('service_role')}`)
  check('an expired listing is not counted before the hourly job runs', await counted(view(listing, key('9'))) === false)
  await db.exec(`reset role;update public.property_listings set expires_at=now()+interval '30 days' where id='${listing}'`)
  await db.exec(as('anon'))
  await denied('guests cannot record views directly', view(listing, key('1')))
  await denied('guests cannot read view marks', 'select * from public.property_listing_view_marks')
  await denied('guests cannot read daily stats', 'select * from public.property_listing_daily_stats')
  await denied('guests cannot read when counting began', 'select * from public.listing_analytics_meta')
  await db.exec(as('authenticated', buyer))
  await denied('signed-in users cannot record views directly', view(listing, key('2')))
  await denied('signed-in users cannot read view marks', 'select * from public.property_listing_view_marks')
  check('a buyer cannot read another owner’s stats', (await db.query('select * from public.property_listing_daily_stats')).rows.length === 0)
  await denied('a buyer cannot write stats', `update public.property_listing_daily_stats set views=999`)
  check('signed-in users can read when counting began', (await db.query('select views_since from public.listing_analytics_meta')).rows.length === 1)
  await db.exec(as('authenticated', owner))
  check('the owner reads their stats', (await db.query('select views from public.property_listing_daily_stats')).rows[0]?.views === 3)

  // ── Saves ───────────────────────────────────────────────────────────────
  await db.exec(as('authenticated', buyer))
  check('a buyer saves an active listing', (await db.query(`select public.save_listing('${listing}') as ok`)).rows[0].ok === true)
  await db.query(`select public.save_listing('${listing}')`)
  check('saving twice keeps one row', (await db.query('select * from public.saved_listings')).rows.length === 1)
  await denied('a listing under review cannot be saved', `select public.save_listing('${review}')`, 'PT410')
  await denied('a buyer cannot insert saves directly', `insert into public.saved_listings(user_id,listing_id) values('${buyer}','${listing}')`)
  await db.exec(as('authenticated', owner))
  await denied('the owner cannot save their own listing', `select public.save_listing('${listing}')`, 'PT403')
  check('the owner cannot read who saved', (await db.query('select * from public.saved_listings')).rows.length === 0)
  check('the owner sees an aggregate save count', JSON.stringify((await db.query('select * from public.seller_listing_save_counts()')).rows) === JSON.stringify([{ listing_id: listing, saves: 1 }]))
  await db.exec(as('authenticated', foreign))
  check('another seller sees no save counts', (await db.query('select * from public.seller_listing_save_counts()')).rows.length === 0)
  check('another buyer cannot see this buyer’s saves', (await db.query('select * from public.saved_listings')).rows.length === 0)
  await db.exec(as('anon'))
  await denied('guests cannot save', `select public.save_listing('${listing}')`)
  await denied('guests cannot read save counts', 'select * from public.seller_listing_save_counts()')

  // ── Activity ────────────────────────────────────────────────────────────
  await db.exec(as('anon'))
  await db.query(`select * from public.submit_listing_enquiry('${listing}','Riya Sen','+919876543210')`)
  // 19:00 UTC is 00:30 the next morning in India: the enquiry belongs to that day.
  await db.exec(`reset role;insert into public.enquiries(listing_id,listing_title,seller_id,buyer_name,buyer_phone,created_at) values('${listing}','x','${owner}','Late Buyer','+919811111111','2026-10-10T19:00:00Z')`)
  await db.exec(as('authenticated', owner))
  const today = (await db.query(`select (now() at time zone 'Asia/Kolkata')::date as d`)).rows[0].d
  const activity = (await db.query(`select * from public.seller_listing_activity('2026-10-01', (now() at time zone 'Asia/Kolkata')::date)`)).rows
  const todayRow = activity.find((r) => r.day.getTime() === today.getTime())
  check('activity joins views and enquiries for today', todayRow?.views === 3 && todayRow?.enquiries === 1, JSON.stringify(activity))
  check('enquiries fall on the India date', activity.some((r) => r.day.toISOString().startsWith('2026-10-11') && r.enquiries === 1 && r.views === 0), JSON.stringify(activity))
  await denied('ranges longer than six months are refused', `select * from public.seller_listing_activity('2026-01-01','2026-10-14')`, '22023')
  await denied('a reversed range is refused', `select * from public.seller_listing_activity('2026-10-14','2026-10-01')`, '22023')
  await db.exec(as('authenticated', foreign))
  check('another seller sees no activity', (await db.query(`select * from public.seller_listing_activity('2026-10-01', (now() at time zone 'Asia/Kolkata')::date)`)).rows.length === 0)
  await db.exec(as('anon'))
  await denied('guests cannot read activity', `select * from public.seller_listing_activity('2026-10-01','2026-10-14')`)

  // ── Removal by the buyer ────────────────────────────────────────────────
  await db.exec(as('authenticated', buyer))
  await db.exec(`delete from public.saved_listings where listing_id='${listing}'`)
  check('a buyer removes their own save', (await db.query('select * from public.saved_listings')).rows.length === 0)
  await db.exec(as('authenticated', owner))
  check('the count follows the removal', (await db.query('select * from public.seller_listing_save_counts()')).rows.length === 0)
  console.log(count + ' listing analytics database checks passed')
} catch (e) { console.error(e.message, e.code ?? '', e.where ?? ''); process.exitCode = 1 } finally { await db.close() }
