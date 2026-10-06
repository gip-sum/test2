create table public.property_draft_reviews (
 draft_id uuid primary key references public.property_drafts(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 draft_revision integer not null check(draft_revision > 0),
 content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),
 confirmed_at timestamptz not null default now()
);
create index property_draft_reviews_owner on public.property_draft_reviews(owner_id);
alter table public.property_draft_reviews enable row level security;
revoke all on public.property_draft_reviews from anon, authenticated;
grant select, insert, update on public.property_draft_reviews to authenticated;
create policy reviews_owner_select on public.property_draft_reviews for select to authenticated using ((select auth.uid()) = owner_id);
create policy reviews_owner_insert on public.property_draft_reviews for insert to authenticated with check (
 (select auth.uid()) = owner_id and exists(select 1 from public.property_drafts d where d.id=draft_id and d.owner_id=(select auth.uid()) and d.revision=draft_revision)
);
create policy reviews_owner_update on public.property_draft_reviews for update to authenticated using ((select auth.uid()) = owner_id) with check (
 (select auth.uid()) = owner_id and exists(select 1 from public.property_drafts d where d.id=draft_id and d.owner_id=(select auth.uid()) and d.revision=draft_revision)
);
create function public.guard_draft_review() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.draft_id<>old.draft_id or new.owner_id<>old.owner_id) then raise exception 'Review identity is immutable'; end if;
 new.confirmed_at:=now();
 return new;
end $$;
revoke all on function public.guard_draft_review() from public;
create trigger guard_draft_review before insert or update on public.property_draft_reviews for each row execute function public.guard_draft_review();
