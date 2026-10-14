// Phase 21: the admin console's database surface against actual PostgreSQL
// (PGlite) with the Phase 9 and 15–21 migrations applied in order. Every
// admin function must refuse anyone who is not active staff; staff must get
// truthful aggregates and listings; health it cannot see must read unknown.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
const db = new PGlite()
const owner = 'a9140f33-a429-46f3-9514-3e8f32f18189', admin = 'b9140f33-a429-46f3-9514-3e8f32f18189', revoked = '19140f33-a429-46f3-9514-3e8f32f18189', buyer = '29140f33-a429-46f3-9514-3e8f32f18189'
const id = (kind, n) => `${kind}9140f33-a429-46f3-9514-${String(n).padStart(12, '0')}`
let count = 0
const check = (label, ok, detail = '') => { if (!ok) throw Error(`${label} ${detail}`); count++; console.log('ok', label) }
async function code(sql) { try { await db.exec(sql); return null } catch (e) { return e.code ?? 'error' } }
async function denied(label, sql, expected) { const c = await code(sql); check(label, c !== null && (!expected || c === expected), String(c)) }
// JSON objects from Postgres carry no key order; compare by sorted entries.
const same = (a, b) => JSON.stringify(Object.entries(a ?? {}).sort()) === JSON.stringify(Object.entries(b).sort())
const as = (role, sub) => `reset role;set role ${role};${sub ? `set request.jwt.claim.sub='${sub}'` : "set request.jwt.claim.sub=''"};`
const submission = (n, title, at) => `insert into public.property_listing_submissions(id,listing_id,draft_revision,preview_hash,title,seller_name,seller_type,intent,property_type,bedrooms,bathrooms,area_unit,carpet_area,furnishing,floor,total_floors,construction_status,age_years,city_name,locality_name,city_id,locality_id,address,price,maintenance_status,negotiable,created_at) values('${id('e', n)}','${id('d', n)}',1,'${'a'.repeat(64)}','${title}','Seller ${n}','OWNER','buy','APARTMENT',2,2,'sqft',1000,'UNFURNISHED',3,8,'READY',4,'Kolkata','New Town','kolkata','new-town','Test building address',${6000000 + n},'none',true,${at});`
// One listing per status the console distinguishes.
const plan = [
  [1, 'UNDER_REVIEW', "now()-interval '3 days'", ''],
  [2, 'UNDER_REVIEW', "now()-interval '1 hour'", ''],
  [3, 'ACTIVE', "now()-interval '20 days'", ",activated_at=now()-interval '20 days',expires_at=now()+interval '10 days'"],
  [4, 'ACTIVE', "now()-interval '100 days'", ",activated_at=now()-interval '95 days',expires_at=now()-interval '5 hours'"],
  [5, 'REJECTED', "now()-interval '4 days'", ",rejection_reason='Photos are unclear'"],
  [6, 'DRAFT', "now()-interval '6 days'", ''],
  [7, 'DELETED', "now()-interval '9 days'", ''],
]
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key,created_at timestamptz not null default now());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,storage to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated,service_role;grant select on storage.objects to anon;grant usage on schema public to anon,authenticated,service_role;`)
  const files = readdirSync('supabase/migrations').sort()
  for (const suffix of ['_phase_09_enquiry_leads.sql', '_phase_09_private_rpcs.sql', '_phase_09_lead_indexes.sql', '_phase_15_private_property_photos.sql', '_phase_16_property_drafts.sql', '_phase_17_draft_reviews.sql', '_phase_18_property_lifecycle.sql', '_phase_19_listing_enquiries.sql', '_phase_20_listing_analytics.sql', '_phase_21_admin_console.sql'])
    await db.exec(readFileSync('supabase/migrations/' + files.find((f) => f.endsWith(suffix)), 'utf8'))
  await db.exec(`insert into auth.users(id,created_at) values('${owner}',now()-interval '30 days'),('${admin}',now()-interval '60 days'),('${revoked}',now()-interval '60 days'),('${buyer}',now()-interval '2 days');
    insert into public.staff_members(user_id,role) values('${admin}','ADMIN'),('${revoked}','ADMIN');
    update public.staff_members set revoked_at=now() where user_id='${revoked}';
    insert into public.property_drafts(id,owner_id,collection_id,page_path) select ('c9140f33-a429-46f3-9514-'||lpad(n::text,12,'0'))::uuid,'${owner}',gen_random_uuid(),'/post' from generate_series(1,8) n;`)
  for (const [n, status, at, extra] of plan) {
    await db.exec(`insert into public.property_listings(id,owner_id,draft_id) values('${id('d', n)}','${owner}','${id('c', n)}');${submission(n, `Listing ${n}`, at)}
      update public.property_listings set status='${status}',version=2,current_submission_id='${id('e', n)}',updated_at=${at}${extra} where id='${id('d', n)}';`)
  }
  await db.exec(`insert into public.property_listing_events(listing_id,from_status,to_status,actor_type,actor_id) values('${id('d', 6)}','ACTIVE','DRAFT','OWNER','${owner}');
    insert into public.property_listing_events(listing_id,from_status,to_status,reason,actor_type) values('${id('d', 3)}','ACTIVE','EXPIRED','Listing validity ended','SYSTEM');
    insert into public.enquiries(listing_id,listing_title,seller_id,buyer_name,buyer_phone,created_at) values('${id('d', 3)}','Listing 3','${owner}','A','+919811111111',now()-interval '1 day'),('${id('d', 3)}','Listing 3','${owner}','B','+919811111112',now()-interval '3 days');
    insert into public.enquiries(listing_public_id,listing_title,buyer_name,buyer_phone,created_at) values('p_demo1','Demo','C','+919811111113',now()-interval '10 days');`)

  // ── Access ──────────────────────────────────────────────────────────────
  const fns = ['select public.admin_overview()', 'select * from public.admin_listings()', 'select public.admin_system_status()']
  await db.exec(as('anon'))
  for (const f of fns) await denied(`guests cannot call ${f.split('.')[1].split('(')[0]}`, f)
  await db.exec(as('authenticated', owner))
  for (const f of fns) await denied(`a non-staff account is refused by ${f.split('.')[1].split('(')[0]}`, f, '42501')
  check('a non-staff account has no staff role', (await db.query('select public.my_staff_role() as r')).rows[0].r === null)
  check('a non-staff account cannot see who is staff', (await db.query('select * from public.staff_members')).rows.length === 0)
  await denied('nobody can grant themselves staff', `insert into public.staff_members(user_id,role) values('${owner}','ADMIN')`)
  await denied('the private gate is not callable directly', 'select private.is_staff()')
  await db.exec(as('authenticated', revoked))
  for (const f of fns) await denied(`revoked staff are refused by ${f.split('.')[1].split('(')[0]}`, f, '42501')
  check('revoked staff have no role', (await db.query('select public.my_staff_role() as r')).rows[0].r === null)
  await db.exec(as('authenticated', admin))
  check('active staff have the ADMIN role', (await db.query('select public.my_staff_role() as r')).rows[0].r === 'ADMIN')
  check('staff read only their own membership', (await db.query('select user_id from public.staff_members')).rows.map((r) => r.user_id).join() === admin)
  await denied('staff cannot change their own membership', `update public.staff_members set role='ADMIN', revoked_at=null`)

  // ── Overview ────────────────────────────────────────────────────────────
  const o = (await db.query('select public.admin_overview() as o')).rows[0].o
  check('listings counted by the status staff read', same(o.listings, { ACTIVE: 1, EXPIRED: 1, REJECTED: 1, REMOVED: 1, WITHDRAWN: 1, UNDER_REVIEW: 2 }), JSON.stringify(o.listings))
  check('drafts never submitted are counted apart', o.drafts_never_submitted === 1)
  check('the queue reports its size and oldest wait', o.queue.waiting === 2 && Date.now() - Date.parse(o.queue.oldest_since) > 2.9 * 86400000)
  check('lead aggregates', same(o.leads, { last_7_days: 2, last_30_days: 3, no_seller_30_days: 1, real_listings_30_days: 2, untouched_over_2_days: 1 }), JSON.stringify(o.leads))
  check('user aggregates', same(o.users, { staff: 1, total: 4, new_7_days: 1, with_listings: 1 }), JSON.stringify(o.users))
  check('the overview carries no personal details', !/\+91|Seller \d|"A"|"B"/.test(JSON.stringify(o)))

  // ── Listings ────────────────────────────────────────────────────────────
  const all = (await db.query('select * from public.admin_listings()')).rows
  check('all submitted listings, with a total', all.length === 7 && Number(all[0].total) === 7)
  const queue = (await db.query("select * from public.admin_listings('UNDER_REVIEW')")).rows
  check('the queue reads oldest first', queue.map((r) => r.title).join() === 'Listing 1,Listing 2')
  check('past-expiry active reads expired before the job', (await db.query("select title from public.admin_listings('EXPIRED')")).rows.map((r) => r.title).join() === 'Listing 4')
  check('withdrawn is derived from history', (await db.query("select title from public.admin_listings('WITHDRAWN')")).rows.map((r) => r.title).join() === 'Listing 6')
  check('removed listings stay visible to staff, labelled', (await db.query("select status from public.admin_listings('REMOVED')")).rows[0]?.status === 'REMOVED')
  const page = (await db.query('select * from public.admin_listings(null,2,2)')).rows
  check('pages by limit and offset with the full total', page.length === 2 && Number(page[0].total) === 7)
  await denied('an unknown status is refused', "select * from public.admin_listings('PUBLISHED')", '22023')
  await denied('an oversized page is refused', 'select * from public.admin_listings(null,1000,0)', '22023')

  // ── System status ───────────────────────────────────────────────────────
  let s = (await db.query('select public.admin_system_status() as s')).rows[0].s
  check('without a migrations table the schema version is unknown', s.migrations === null)
  check('without the cron schema the expiry job is unknown, never healthy', s.expiry_job === null)
  check('overdue active listings are reported as expiry backlog', s.expiry_backlog === 1)
  check('the last expiry event and the oldest wait are reported', typeof s.last_expiry_at === 'string' && typeof s.oldest_review_since === 'string')
  await db.exec(`reset role;create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text);insert into supabase_migrations.schema_migrations values('20261013192641','phase_19_listing_enquiries'),('20261014044042','phase_21_admin_console');
    create schema cron;create table cron.job(jobid bigint primary key,jobname text);create table cron.job_run_details(jobid bigint,status text,start_time timestamptz,end_time timestamptz);
    insert into cron.job values(1,'gharbazaar-expire-listings');insert into cron.job_run_details values(1,'failed',now()-interval '3 hours',now()-interval '3 hours'),(1,'succeeded',now()-interval '1 hour',now()-interval '59 minutes');${as('authenticated', admin)}`)
  s = (await db.query('select public.admin_system_status() as s')).rows[0].s
  check('applied migrations are listed newest first', s.migrations?.[0]?.name === 'phase_21_admin_console' && s.migrations.length === 2)
  check('the expiry job reports its latest run', s.expiry_job?.scheduled === true && s.expiry_job.last_status === 'succeeded')
  await db.exec(`reset role;delete from cron.job;${as('authenticated', admin)}`)
  check('a missing expiry job is reported as not scheduled', (await db.query('select public.admin_system_status() as s')).rows[0].s.expiry_job?.scheduled === false)
  console.log(count + ' admin console database checks passed')
} catch (e) { console.error(e.message, e.code ?? '', e.where ?? ''); process.exitCode = 1 } finally { await db.close() }
