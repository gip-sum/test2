-- Listing ownership is provisioned by a trusted operator until real seller listings exist.
create table public.listing_sellers (
  listing_public_id text primary key check (listing_public_id ~ '^p_[a-z0-9]{1,32}$'),
  seller_id uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now()
);
create index listing_sellers_owner_idx on public.listing_sellers (seller_id);
alter table public.listing_sellers enable row level security;
revoke all on public.listing_sellers from anon, authenticated;
grant select on public.listing_sellers to authenticated;
create policy "seller sees own listing assignments" on public.listing_sellers
  for select to authenticated using (seller_id = (select auth.uid()));

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  listing_public_id text not null check (listing_public_id ~ '^p_[a-z0-9]{1,32}$'),
  listing_title text not null check (char_length(listing_title) between 1 and 150),
  buyer_id uuid references auth.users(id) on delete set null,
  seller_id uuid references auth.users(id) on delete set null,
  buyer_name text not null check (char_length(buyer_name) between 1 and 80),
  buyer_phone text not null check (buyer_phone ~ '^\+91[6-9][0-9]{9}$'),
  message text check (message is null or char_length(message) <= 1000),
  duplicate_of uuid references public.enquiries(id) on delete set null,
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);
create index enquiries_buyer_recent_idx on public.enquiries (buyer_id, created_at desc);
create index enquiries_seller_recent_idx on public.enquiries (seller_id, created_at desc);
create index enquiries_repeat_idx on public.enquiries (listing_public_id, buyer_phone, created_at desc);
alter table public.enquiries enable row level security;
revoke all on public.enquiries from anon, authenticated;
grant select on public.enquiries to authenticated;
create policy "buyer or seller reads their leads" on public.enquiries
  for select to authenticated using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()));

create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('created','repeated','status_changed')),
  status text not null check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);
create index lead_events_enquiry_idx on public.lead_events (enquiry_id, created_at);
alter table public.lead_events enable row level security;
revoke all on public.lead_events from anon, authenticated;
grant select on public.lead_events to authenticated;
create policy "participants read lead history" on public.lead_events
  for select to authenticated using (exists (
    select 1 from public.enquiries e where e.id = enquiry_id
      and (e.buyer_id = (select auth.uid()) or e.seller_id = (select auth.uid()))
  ));

create table public.seller_notifications (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index seller_notifications_unread_idx on public.seller_notifications (seller_id, created_at desc) where read_at is null;
alter table public.seller_notifications enable row level security;
revoke all on public.seller_notifications from anon, authenticated;
grant select, update (read_at) on public.seller_notifications to authenticated;
create policy "seller reads own notifications" on public.seller_notifications
  for select to authenticated using (seller_id = (select auth.uid()));
create policy "seller acknowledges own notifications" on public.seller_notifications
  for update to authenticated using (seller_id = (select auth.uid()))
  with check (seller_id = (select auth.uid()));

-- This is the sole write surface for guest enquiries. No table insert privilege is granted.
create function public.submit_enquiry(
  p_listing_public_id text, p_listing_title text, p_name text,
  p_phone text, p_message text default null
) returns table(enquiry_id uuid, repeated boolean, seller_notified boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_previous uuid;
  v_seller uuid;
  v_enquiry uuid;
  v_name text := trim(p_name);
  v_message text := nullif(trim(p_message), '');
begin
  if p_listing_public_id !~ '^p_[a-z0-9]{1,32}$'
    or char_length(trim(p_listing_title)) not between 1 and 150
    or char_length(v_name) not between 1 and 80
    or p_phone !~ '^\+91[6-9][0-9]{9}$'
    or char_length(coalesce(v_message, '')) > 1000 then
    raise exception 'Invalid enquiry details' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_listing_public_id || ':' || p_phone, 0));
  if (select count(*) from public.enquiries where buyer_phone = p_phone
      and created_at > now() - interval '1 day') >= 20
    or (select count(*) from public.enquiries where buyer_phone = p_phone
      and listing_public_id = p_listing_public_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Too many recent enquiries' using errcode = '22023';
  end if;
  select id into v_previous from public.enquiries
    where listing_public_id = p_listing_public_id and buyer_phone = p_phone
    order by created_at asc limit 1;
  select seller_id into v_seller from public.listing_sellers where listing_public_id = p_listing_public_id;
  insert into public.enquiries(listing_public_id, listing_title, buyer_id, seller_id,
    buyer_name, buyer_phone, message, duplicate_of)
    values (p_listing_public_id, trim(p_listing_title), auth.uid(), v_seller,
      v_name, p_phone, v_message, v_previous)
    returning id into v_enquiry;
  insert into public.lead_events(enquiry_id, actor_id, event_type, status)
    values (v_enquiry, auth.uid(), case when v_previous is null then 'created' else 'repeated' end, 'new');
  if v_seller is not null then
    insert into public.seller_notifications(seller_id, enquiry_id) values (v_seller, v_enquiry);
  end if;
  return query select v_enquiry, v_previous is not null, v_seller is not null;
end;
$$;
revoke all on function public.submit_enquiry(text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_enquiry(text,text,text,text,text) to anon, authenticated;

create function public.update_lead_status(p_enquiry_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_updated uuid;
begin
  if p_status not in ('new','contacted','closed') or auth.uid() is null then return false; end if;
  update public.enquiries set status = p_status
    where id = p_enquiry_id and seller_id = auth.uid() and status is distinct from p_status
    returning id into v_updated;
  if v_updated is null then return false; end if;
  insert into public.lead_events(enquiry_id, actor_id, event_type, status)
    values (v_updated, auth.uid(), 'status_changed', p_status);
  return true;
end;
$$;
revoke all on function public.update_lead_status(uuid,text) from public, anon, authenticated;
grant execute on function public.update_lead_status(uuid,text) to authenticated;
