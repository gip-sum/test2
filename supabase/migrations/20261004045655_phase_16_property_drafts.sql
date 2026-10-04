create table public.property_drafts (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 collection_id uuid not null,
 revision integer not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 page_path text not null check (page_path in ('/post', '/post/photos')),
 "role" varchar(240),
 "intent" varchar(240),
 "type" varchar(240),
 "bhk" varchar(240),
 "baths" varchar(240),
 "unit" varchar(240),
 "carpet" varchar(240),
 "builtup" varchar(240),
 "super" varchar(240),
 "furnishing" varchar(240),
 "floor" varchar(240),
 "floors" varchar(240),
 "status" varchar(240),
 "age" varchar(240),
 "possession" varchar(240),
 "available" varchar(240),
 "from" varchar(240),
 "city" varchar(240),
 "locality" varchar(240),
 "sublocality" varchar(240),
 "society" varchar(240),
 "address" varchar(240),
 "lat" varchar(240),
 "lng" varchar(240),
 "saleprice" varchar(240),
 "rent" varchar(240),
 "deposit" varchar(240),
 "maintenance" varchar(240),
 "maintenanceAmount" varchar(240),
 "negotiable" varchar(240),
 "edit" varchar(240),
 "step" varchar(240),
 unique(owner_id, collection_id)
);
create index property_drafts_owner_updated on public.property_drafts(owner_id, updated_at desc);
alter table public.property_drafts enable row level security;
revoke all on public.property_drafts from anon, authenticated;
grant select, insert, update on public.property_drafts to authenticated;
create policy drafts_owner_select on public.property_drafts for select to authenticated using ((select auth.uid()) = owner_id);
create policy drafts_owner_insert on public.property_drafts for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy drafts_owner_update on public.property_drafts for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create function public.guard_property_draft() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if tg_op = 'INSERT' then
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 16));
  if (select count(*) from public.property_drafts where owner_id = new.owner_id) >= 50 then
   raise exception 'Draft limit reached';
  end if;
  new.revision := 1;
  new.created_at := now();
 else
  if new.id <> old.id or new.owner_id <> old.owner_id or new.collection_id <> old.collection_id then
   raise exception 'Draft identity is immutable';
  end if;
  new.created_at := old.created_at;
  new.revision := old.revision + 1;
 end if;
 new.updated_at := now();
 return new;
end $$;
revoke all on function public.guard_property_draft() from public;
create trigger guard_property_draft before insert or update on public.property_drafts for each row execute function public.guard_property_draft();
