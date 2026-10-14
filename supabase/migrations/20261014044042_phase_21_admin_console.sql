-- Phase 21: the admin console. Requires Phases 18–20.
--
-- Staff are an entity of their own, not a flag on a profile or a claim in a
-- token: who, which role, granted when and by whom, revoked when. Rows are
-- written only by a trusted operator (service role / SQL editor); there is
-- no self-service grant and no in-app grant before Phase 23.
create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Phase 22 adds MODERATOR when moderation actions exist.
  role text not null check (role in ('ADMIN')),
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  check (revoked_at is null or revoked_at >= granted_at)
);
alter table public.staff_members enable row level security;
revoke all on public.staff_members from anon, authenticated;
grant select on public.staff_members to authenticated;
grant all on public.staff_members to service_role;
create policy "staff read own membership" on public.staff_members for select to authenticated
  using (user_id = (select auth.uid()));

-- The one gate every admin function checks first.
create function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_members s where s.user_id = (select auth.uid()) and s.revoked_at is null);
$$;
revoke all on function private.is_staff() from public, anon, authenticated;

create function public.my_staff_role() returns text
language sql stable security invoker set search_path = '' as $$
  select s.role from public.staff_members s where s.user_id = (select auth.uid()) and s.revoked_at is null;
$$;
revoke all on function public.my_staff_role() from public, anon, authenticated;
grant execute on function public.my_staff_role() to authenticated;

-- A listing's status as staff read it: past-expiry ACTIVE is EXPIRED even
-- before the hourly job, DELETED is REMOVED, and a DRAFT listing row that
-- history shows leaving another status is WITHDRAWN (Phase 18 withdrawal
-- returns a listing to DRAFT). The same derivation as the seller dashboard.
create function private.admin_status(p public.property_listings) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when p.status = 'DELETED' then 'REMOVED'
    when p.status = 'ACTIVE' and p.expires_at <= now() then 'EXPIRED'
    when p.status = 'DRAFT' then case when exists (
      select 1 from public.property_listing_events e where e.listing_id = p.id and e.to_status = 'DRAFT' and e.from_status is not null
    ) then 'WITHDRAWN' else 'DRAFT' end
    else p.status end;
$$;
revoke all on function private.admin_status(public.property_listings) from public, anon, authenticated;

-- Aggregates only: no name, email, phone or message of anyone.
create function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_staff() then raise exception 'Staff only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'listings', (select coalesce(jsonb_object_agg(st, n), '{}'::jsonb) from (
      select private.admin_status(l) as st, count(*) as n from public.property_listings l group by 1) c),
    'drafts_never_submitted', (select count(*) from public.property_drafts d
      where not exists (select 1 from public.property_listings l where l.draft_id = d.id)),
    'queue', (select jsonb_build_object('waiting', count(*), 'oldest_since', min(s.created_at))
      from public.property_listings l join public.property_listing_submissions s on s.id = l.current_submission_id
      where l.status = 'UNDER_REVIEW'),
    'leads', (select jsonb_build_object(
      'last_7_days', count(*) filter (where e.created_at > now() - interval '7 days'),
      'last_30_days', count(*) filter (where e.created_at > now() - interval '30 days'),
      'real_listings_30_days', count(*) filter (where e.created_at > now() - interval '30 days' and e.listing_id is not null),
      'no_seller_30_days', count(*) filter (where e.created_at > now() - interval '30 days' and e.seller_id is null),
      'untouched_over_2_days', count(*) filter (where e.status = 'new' and e.seller_id is not null and e.created_at < now() - interval '2 days'))
      from public.enquiries e),
    'users', jsonb_build_object(
      'total', (select count(*) from auth.users),
      'new_7_days', (select count(*) from auth.users u where u.created_at > now() - interval '7 days'),
      'with_listings', (select count(distinct l.owner_id) from public.property_listings l),
      'staff', (select count(*) from public.staff_members s where s.revoked_at is null)));
end $$;
revoke all on function public.admin_overview() from public, anon, authenticated;
grant execute on function public.admin_overview() to authenticated;

-- Submitted listings with their current submission's public fields. The
-- queue reads oldest first; everything else most recently changed first.
create function public.admin_listings(p_status text default null, p_limit integer default 25, p_offset integer default 0)
returns table(id uuid, status text, title text, seller_name text, seller_type text, intent text, price bigint,
  locality_name text, city_name text, submitted_at timestamptz, updated_at timestamptz,
  activated_at timestamptz, expires_at timestamptz, total bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not private.is_staff() then raise exception 'Staff only' using errcode = '42501'; end if;
  if (p_status is not null and p_status not in ('DRAFT','UNDER_REVIEW','ACTIVE','EXPIRED','REJECTED','WITHDRAWN','REMOVED'))
    or p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset < 0 then
    raise exception 'Invalid listing query' using errcode = '22023';
  end if;
  return query
  with x as (
    select l.id as lid, private.admin_status(l) as st, l.current_submission_id as sid,
      l.updated_at as changed, l.activated_at as live, l.expires_at as ends
    from public.property_listings l where l.current_submission_id is not null
  )
  select x.lid, x.st, s.title, s.seller_name, s.seller_type, s.intent, s.price, s.locality_name, s.city_name,
    s.created_at, x.changed, x.live, x.ends, count(*) over ()
  from x join public.property_listing_submissions s on s.id = x.sid
  where p_status is null or x.st = p_status
  order by case when p_status = 'UNDER_REVIEW' then s.created_at end asc nulls last, x.changed desc, x.lid
  limit p_limit offset p_offset;
end $$;
revoke all on function public.admin_listings(text,integer,integer) from public, anon, authenticated;
grant execute on function public.admin_listings(text,integer,integer) to authenticated;

-- What the database can say about its own health. Anything it cannot see
-- (no cron schema, no migrations table) is returned as null — "unknown" —
-- never as healthy.
create function public.admin_system_status() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_migrations jsonb; v_job jsonb;
begin
  if not private.is_staff() then raise exception 'Staff only' using errcode = '42501'; end if;
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    begin
      if exists (select 1 from information_schema.columns where table_schema = 'supabase_migrations' and table_name = 'schema_migrations' and column_name = 'name') then
        execute 'select coalesce(jsonb_agg(jsonb_build_object(''version'', version, ''name'', name) order by version desc), ''[]''::jsonb) from (select version, name from supabase_migrations.schema_migrations order by version desc limit 50) m' into v_migrations;
      else
        execute 'select coalesce(jsonb_agg(jsonb_build_object(''version'', version) order by version desc), ''[]''::jsonb) from (select version from supabase_migrations.schema_migrations order by version desc limit 50) m' into v_migrations;
      end if;
    exception when others then v_migrations := null;
    end;
  end if;
  if to_regclass('cron.job') is not null then
    begin
      execute $q$
        select jsonb_build_object('scheduled', true, 'last_status', d.status, 'last_run_at', d.end_time)
        from cron.job j
        left join lateral (select r.status, r.end_time from cron.job_run_details r where r.jobid = j.jobid order by r.start_time desc limit 1) d on true
        where j.jobname = 'gharbazaar-expire-listings'
      $q$ into v_job;
      v_job := coalesce(v_job, jsonb_build_object('scheduled', false));
    exception when others then v_job := null;
    end;
  end if;
  return jsonb_build_object(
    'migrations', v_migrations,
    'expiry_job', v_job,
    'expiry_backlog', (select count(*) from public.property_listings l where l.status = 'ACTIVE' and l.expires_at <= now() - interval '2 hours'),
    'last_expiry_at', (select max(e.created_at) from public.property_listing_events e where e.actor_type = 'SYSTEM'),
    'oldest_review_since', (select min(s.created_at) from public.property_listings l
      join public.property_listing_submissions s on s.id = l.current_submission_id where l.status = 'UNDER_REVIEW'),
    'checked_at', now());
end $$;
revoke all on function public.admin_system_status() from public, anon, authenticated;
grant execute on function public.admin_system_status() to authenticated;
