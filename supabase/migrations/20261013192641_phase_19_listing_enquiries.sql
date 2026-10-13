-- Phase 19: enquiries about real (Phase 18) listings, and per-listing counts
-- for the seller dashboard.
--
-- An enquiry now names exactly one listing identity: either a Phase 4 demo
-- fixture (listing_public_id, seller assigned by an operator through
-- listing_sellers) or a Phase 18 listing (listing_id, seller derived from
-- the listing's owner). The two are never mixed: a demo public id is not a
-- listing, and smuggling a listing UUID into the text column would lose the
-- foreign key that keeps a lead attached to the row it is about.
alter table public.enquiries alter column listing_public_id drop not null;
alter table public.enquiries add column listing_id uuid references public.property_listings(id);
alter table public.enquiries add constraint enquiries_one_listing_identity
  check ((listing_public_id is null) <> (listing_id is null));
create index enquiries_listing_recent_idx on public.enquiries (listing_id, created_at desc) where listing_id is not null;
create index enquiries_listing_repeat_idx on public.enquiries (listing_id, buyer_phone, created_at desc) where listing_id is not null;

-- The only write path for enquiries about real listings. The caller supplies
-- the listing and the buyer's own details; the seller, the title and the
-- listing's availability are all decided here, inside the transaction, so a
-- client can never route a lead to someone else or enquire about a listing
-- that is not public.
--
-- Error codes use PostgREST's PTxxx convention so the app can tell an
-- unavailable listing (410) from a rate limit (429) or an owner enquiring
-- about their own listing (403); invalid input stays 22023 (400) as in
-- Phase 9.
create function private.submit_listing_enquiry_impl(
  p_listing uuid, p_name text, p_phone text, p_message text default null
) returns table(enquiry_id uuid, repeated boolean, seller_notified boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_listing public.property_listings;
  v_title text;
  v_previous uuid;
  v_enquiry uuid;
  v_name text := trim(p_name);
  v_message text := nullif(trim(p_message), '');
begin
  if p_listing is null
    or char_length(coalesce(v_name, '')) not between 1 and 80
    or coalesce(p_phone, '') !~ '^\+91[6-9][0-9]{9}$'
    or char_length(coalesce(v_message, '')) > 1000 then
    raise exception 'Invalid enquiry details' using errcode = '22023';
  end if;
  -- FOR SHARE makes a concurrent withdrawal, removal or expiry (all FOR
  -- UPDATE) wait for this transaction, so a lead is never recorded against a
  -- listing that left public view at the same instant. The expiry time is
  -- checked directly because the hourly job may not have run yet.
  select * into v_listing from public.property_listings where id = p_listing for share;
  if not found or v_listing.status <> 'ACTIVE' or v_listing.expires_at <= now() then
    raise exception 'Listing not available' using errcode = 'PT410';
  end if;
  if auth.uid() is not null and auth.uid() = v_listing.owner_id then
    raise exception 'Owners cannot enquire about their own listing' using errcode = 'PT403';
  end if;
  -- The title buyers saw: the current immutable submission, never the
  -- working draft. Phase 9 caps stored titles at 150 characters.
  select left(trim(s.title), 150) into v_title from public.property_listing_submissions s
    where s.id = v_listing.current_submission_id and s.listing_id = v_listing.id;
  if v_title is null or v_title = '' then
    raise exception 'Listing not available' using errcode = 'PT410';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_listing::text || ':' || p_phone, 0));
  -- The same limits as Phase 9; the per-number daily limit is shared across
  -- demo and real listings.
  if (select count(*) from public.enquiries where buyer_phone = p_phone
      and created_at > now() - interval '1 day') >= 20
    or (select count(*) from public.enquiries where buyer_phone = p_phone
      and listing_id = p_listing and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Too many recent enquiries' using errcode = 'PT429';
  end if;
  select e.id into v_previous from public.enquiries e
    where e.listing_id = p_listing and e.buyer_phone = p_phone
    order by e.created_at asc limit 1;
  insert into public.enquiries(listing_id, listing_title, buyer_id, seller_id,
    buyer_name, buyer_phone, message, duplicate_of)
    values (p_listing, v_title, auth.uid(), v_listing.owner_id,
      v_name, p_phone, v_message, v_previous)
    returning id into v_enquiry;
  insert into public.lead_events(enquiry_id, actor_id, event_type, status)
    values (v_enquiry, auth.uid(), case when v_previous is null then 'created' else 'repeated' end, 'new');
  insert into public.seller_notifications(seller_id, enquiry_id) values (v_listing.owner_id, v_enquiry);
  return query select v_enquiry, v_previous is not null, true;
end;
$$;
revoke all on function private.submit_listing_enquiry_impl(uuid,text,text,text) from public, anon, authenticated;
grant execute on function private.submit_listing_enquiry_impl(uuid,text,text,text) to anon, authenticated;

create function public.submit_listing_enquiry(
  p_listing uuid, p_name text, p_phone text, p_message text default null
) returns table(enquiry_id uuid, repeated boolean, seller_notified boolean)
language sql security invoker set search_path = '' as $$
  select * from private.submit_listing_enquiry_impl($1,$2,$3,$4);
$$;
revoke all on function public.submit_listing_enquiry(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_listing_enquiry(uuid,text,text,text) to anon, authenticated;

-- One row per listing with enquiries for the calling seller. Security
-- invoker: the enquiries row policy (seller_id = auth.uid()) does the
-- scoping, so a foreign seller's counts are simply absent. Aggregating in
-- the database keeps the dashboard from downloading every lead to count it.
create function public.seller_listing_enquiry_counts()
returns table(listing_id uuid, total integer, new_count integer, latest_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select e.listing_id, count(*)::integer, (count(*) filter (where e.status = 'new'))::integer, max(e.created_at)
  from public.enquiries e
  where e.listing_id is not null and e.seller_id = (select auth.uid())
  group by e.listing_id;
$$;
revoke all on function public.seller_listing_enquiry_counts() from public, anon, authenticated;
grant execute on function public.seller_listing_enquiry_counts() to authenticated;
