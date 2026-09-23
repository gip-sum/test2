-- Run in the intended Supabase project before seller accounts own listings.
-- auth.users is the durable user table; never copy auth tokens or passwords here.
create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 160),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (organisation_id, user_id)
);
create index if not exists memberships_user_id_idx on public.memberships (user_id);

alter table public.organisations enable row level security;
alter table public.memberships enable row level security;

-- A member can only read their own membership. Do not expose mutation
-- policies: organisation onboarding and invitations require server-side
-- ownership checks, which a later phase implements explicitly.
create policy "members read own memberships" on public.memberships
  for select to authenticated using (user_id = (select auth.uid()));
create policy "members read own organisations" on public.organisations
  for select to authenticated using (
    exists (select 1 from public.memberships m
      where m.organisation_id = id and m.user_id = (select auth.uid()))
  );
