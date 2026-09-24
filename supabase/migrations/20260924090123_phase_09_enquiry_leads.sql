create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references auth.users(id) on delete set null,
  property_public_id text not null check (property_public_id ~ '^p_[a-z0-9]{1,32}$'),
  listing_title text not null check (char_length(listing_title) between 1 and 180),
  listing_locality text not null check (char_length(listing_locality) between 1 and 120),
  seller_type text not null check (seller_type in ('OWNER', 'AGENT', 'BUILDER')),
  seller_name text check (seller_name is null or char_length(seller_name) between 1 and 120),
  buyer_name text not null check (char_length(buyer_name) between 1 and 80),
  buyer_phone text not null check (buyer_phone ~ '^\+91[6-9][0-9]{9}$'),
  message text check (message is null or char_length(message) between 1 and 1000),
  source text not null default 'property_page' check (source = 'property_page'),
  status text not null default 'NEW' check (status in ('NEW', 'CONTACTED', 'CLOSED')),
  notification_status text not null default 'UNCONFIGURED'
    check (notification_status in ('PENDING', 'DELIVERED', 'FAILED', 'UNCONFIGURED')),
  notification_attempted_at timestamptz,
  notified_at timestamptz,
  duplicate_of uuid references public.enquiries(id) on delete set null,
  created_at timestamptz not null default now(),
  check (duplicate_of is null or duplicate_of <> id),
  check ((notification_status = 'DELIVERED') = (notified_at is not null))
);

create index enquiries_buyer_history_idx on public.enquiries (buyer_id, created_at desc)
  where buyer_id is not null;
create index enquiries_duplicate_lookup_idx on public.enquiries
  (property_public_id, buyer_phone, created_at desc);

alter table public.enquiries enable row level security;
revoke all on public.enquiries from anon, authenticated;
grant select on public.enquiries to authenticated;

create policy "buyers read own enquiries" on public.enquiries
  for select to authenticated
  using (buyer_id = (select auth.uid()));

comment on table public.enquiries is
  'Durable buyer enquiry attempts. Writes are server-only because guest leads require privileged persistence.';
comment on column public.enquiries.duplicate_of is
  'Latest earlier enquiry for the same listing and normalised phone; repeats are retained, never collapsed.';

create function public.link_duplicate_enquiry()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Serialize only this property/phone pair. A concurrent repeat waits, then
  -- sees the committed first attempt instead of both being labelled new.
  perform pg_advisory_xact_lock(hashtextextended(new.property_public_id || ':' || new.buyer_phone, 0));
  select id into new.duplicate_of
  from public.enquiries
  where property_public_id = new.property_public_id
    and buyer_phone = new.buyer_phone
  order by created_at desc, id desc
  limit 1;
  return new;
end;
$$;

revoke all on function public.link_duplicate_enquiry() from public, anon, authenticated;
create trigger enquiries_link_duplicate
  before insert on public.enquiries
  for each row execute function public.link_duplicate_enquiry();
