create table public.saved_properties (
  user_id uuid not null references auth.users(id) on delete cascade,
  property_public_id text not null check (property_public_id ~ '^p_[a-z0-9]{1,32}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, property_public_id)
);

create index saved_properties_recent_idx on public.saved_properties (user_id, created_at desc);
alter table public.saved_properties enable row level security;
revoke all on public.saved_properties from anon;
grant select, insert, delete on public.saved_properties to authenticated;

create policy "buyers read own saves" on public.saved_properties
  for select to authenticated using (user_id = (select auth.uid()));
create policy "buyers save own properties" on public.saved_properties
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "buyers remove own saves" on public.saved_properties
  for delete to authenticated using (user_id = (select auth.uid()));
