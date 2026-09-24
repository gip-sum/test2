-- Each buyer manages only their own details. Auth continues to own email and sign-in history.
create table public.buyer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  contact_phone text check (contact_phone is null or contact_phone ~ '^\+?[0-9]{10,15}$'),
  preferred_intent text not null default 'both' check (preferred_intent in ('buy', 'rent', 'both')),
  preferred_locality text check (preferred_locality is null or preferred_locality ~ '^[a-z0-9-]{1,100}$'),
  email_updates boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.buyer_profiles enable row level security;
revoke all on public.buyer_profiles from anon;
grant select, insert, update on public.buyer_profiles to authenticated;

create policy "buyers read own profile" on public.buyer_profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "buyers create own profile" on public.buyer_profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "buyers update own profile" on public.buyer_profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
