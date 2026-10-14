-- Phase 20: seller listing analytics. Requires Phases 18 and 19.
--
-- Views are counted, not estimated: one per browser per listing per India
-- day, only while the listing is public, never the owner's own visits. The
-- browser identity is a random first-party cookie the app hashes together
-- with the listing and the day, so a mark cannot be linked across days or
-- listings, and marks are purged after a day. No IP address, user agent or
-- account id is stored for a view.

-- When counting began, so days before it read "not tracked" rather than 0.
create table public.listing_analytics_meta (
  id boolean primary key default true check (id),
  views_since timestamptz not null default now()
);
insert into public.listing_analytics_meta default values;
alter table public.listing_analytics_meta enable row level security;
revoke all on public.listing_analytics_meta from anon, authenticated;
grant select on public.listing_analytics_meta to authenticated;
grant all on public.listing_analytics_meta to service_role;
create policy "signed-in users read analytics meta" on public.listing_analytics_meta for select to authenticated using (true);

-- The `listing_stat` of the roadmap register: one row per listing per day.
create table public.property_listing_daily_stats (
  listing_id uuid not null references public.property_listings(id),
  day date not null,
  views integer not null default 0 check (views >= 0),
  primary key (listing_id, day)
);
alter table public.property_listing_daily_stats enable row level security;
revoke all on public.property_listing_daily_stats from anon, authenticated;
grant select on public.property_listing_daily_stats to authenticated;
grant all on public.property_listing_daily_stats to service_role;
create policy "owners read their listing stats" on public.property_listing_daily_stats for select to authenticated
  using (exists (select 1 from public.property_listings l where l.id = listing_id and l.owner_id = (select auth.uid())));

-- Same-day dedupe only. Readable by nobody through the API.
create table public.property_listing_view_marks (
  listing_id uuid not null references public.property_listings(id),
  day date not null,
  visitor_key text not null check (visitor_key ~ '^[a-f0-9]{64}$'),
  primary key (listing_id, day, visitor_key)
);
alter table public.property_listing_view_marks enable row level security;
revoke all on public.property_listing_view_marks from anon, authenticated;
grant all on public.property_listing_view_marks to service_role;

-- Service only: the app has already checked origin and user agent and
-- verified who the viewer is, so the database counts only what the app
-- vetted. p_viewer is the verified account id, or null for a guest.
create function public.record_listing_view(p_listing uuid, p_visitor_key text, p_viewer uuid default null)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  l public.property_listings;
  v_day date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if p_listing is null or coalesce(p_visitor_key, '') !~ '^[a-f0-9]{64}$' then return false; end if;
  select * into l from public.property_listings where id = p_listing;
  -- The expiry time is checked directly: the hourly job may not have run.
  if not found or l.status <> 'ACTIVE' or l.expires_at <= now() then return false; end if;
  if p_viewer is not null and p_viewer = l.owner_id then return false; end if;
  insert into public.property_listing_view_marks(listing_id, day, visitor_key)
    values (p_listing, v_day, p_visitor_key) on conflict do nothing;
  if not found then return false; end if;
  insert into public.property_listing_daily_stats(listing_id, day, views) values (p_listing, v_day, 1)
    on conflict (listing_id, day) do update set views = public.property_listing_daily_stats.views + 1;
  -- Marks are needed only for today's dedupe; yesterday's is kept for the
  -- minutes either side of midnight. Nothing older survives.
  delete from public.property_listing_view_marks where listing_id = p_listing and day < v_day - 1;
  return true;
end $$;
revoke all on function public.record_listing_view(uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.record_listing_view(uuid,text,uuid) to service_role;

-- Saves of real listings. Phase 8's saved_properties holds demo fixture ids
-- and keeps doing so; a real listing is a different identity with its own
-- foreign key, not a second meaning for a text column.
create table public.saved_listings (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.property_listings(id),
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index saved_listings_recent_idx on public.saved_listings (user_id, created_at desc);
create index saved_listings_listing_idx on public.saved_listings (listing_id);
alter table public.saved_listings enable row level security;
revoke all on public.saved_listings from anon, authenticated;
grant select, delete on public.saved_listings to authenticated;
grant all on public.saved_listings to service_role;
create policy "buyers read own saved listings" on public.saved_listings for select to authenticated using (user_id = (select auth.uid()));
create policy "buyers remove own saved listings" on public.saved_listings for delete to authenticated using (user_id = (select auth.uid()));

-- Inserting goes through here so the listing's availability and owner can
-- be checked: a buyer's row policy cannot see other people's listings.
create function private.save_listing_impl(p_listing uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare l public.property_listings; v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Sign in to save listings' using errcode = 'PT401'; end if;
  select * into l from public.property_listings where id = p_listing for share;
  if not found or l.status <> 'ACTIVE' or l.expires_at <= now() then
    raise exception 'Listing not available' using errcode = 'PT410';
  end if;
  if l.owner_id = v_user then raise exception 'Owners cannot save their own listing' using errcode = 'PT403'; end if;
  if (select count(*) from public.saved_listings where user_id = v_user) >= 500 then
    raise exception 'Too many saved listings' using errcode = 'PT429';
  end if;
  insert into public.saved_listings(user_id, listing_id) values (v_user, p_listing) on conflict do nothing;
  return true;
end $$;
revoke all on function private.save_listing_impl(uuid) from public, anon, authenticated;
grant execute on function private.save_listing_impl(uuid) to authenticated;
create function public.save_listing(p_listing uuid) returns boolean
language sql security invoker set search_path = '' as $$ select private.save_listing_impl($1); $$;
revoke all on function public.save_listing(uuid) from public, anon, authenticated;
grant execute on function public.save_listing(uuid) to authenticated;

-- How many buyers currently have each of the caller's listings saved.
-- Definer, because a seller must not read buyers' rows; it returns counts
-- only, and only for listings the caller owns.
create function private.seller_listing_save_counts_impl() returns table(listing_id uuid, saves integer)
language sql stable security definer set search_path = '' as $$
  select s.listing_id, count(*)::integer from public.saved_listings s
  join public.property_listings l on l.id = s.listing_id
  where l.owner_id = (select auth.uid())
  group by s.listing_id;
$$;
revoke all on function private.seller_listing_save_counts_impl() from public, anon, authenticated;
grant execute on function private.seller_listing_save_counts_impl() to authenticated;
create function public.seller_listing_save_counts() returns table(listing_id uuid, saves integer)
language sql stable security invoker set search_path = '' as $$ select * from private.seller_listing_save_counts_impl(); $$;
revoke all on function public.seller_listing_save_counts() from public, anon, authenticated;
grant execute on function public.seller_listing_save_counts() to authenticated;

-- Per listing per India day: views and enquiries for the caller's own
-- listings. Invoker: the daily-stats and enquiries row policies do the
-- scoping. Days with neither are simply absent; the app fills them.
create function public.seller_listing_activity(p_from date, p_to date)
returns table(listing_id uuid, day date, views integer, enquiries integer)
language plpgsql stable security invoker set search_path = '' as $$
#variable_conflict use_column
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 183 then
    raise exception 'Invalid range' using errcode = '22023';
  end if;
  return query
  with v as (
    select s.listing_id, s.day, s.views from public.property_listing_daily_stats s
    where s.day between p_from and p_to
  ), e as (
    select en.listing_id, (en.created_at at time zone 'Asia/Kolkata')::date as day, count(*)::integer as n
    from public.enquiries en
    where en.listing_id is not null and en.seller_id = (select auth.uid())
      and en.created_at >= (p_from::timestamp at time zone 'Asia/Kolkata')
      and en.created_at < ((p_to + 1)::timestamp at time zone 'Asia/Kolkata')
    group by 1, 2
  )
  select coalesce(v.listing_id, e.listing_id), coalesce(v.day, e.day), coalesce(v.views, 0), coalesce(e.n, 0)
  from v full join e on e.listing_id = v.listing_id and e.day = v.day;
end $$;
revoke all on function public.seller_listing_activity(date,date) from public, anon, authenticated;
grant execute on function public.seller_listing_activity(date,date) to authenticated;
