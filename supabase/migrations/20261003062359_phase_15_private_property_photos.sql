create table public.media_assets (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid not null,
  original_name text not null check (length(original_name) between 1 and 180),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending' check (status in ('pending','ready')),
  position integer not null default 0 check (position between 0 and 19),
  width integer not null check (width between 320 and 1920),
  height integer not null check (height between 320 and 1920),
  bytes integer not null check (bytes between 1 and 2097152),
  created_at timestamptz not null default now(),
  unique (owner_id, collection_id, sha256)
);
create index media_assets_owner_collection on public.media_assets(owner_id, collection_id, position);
alter table public.media_assets enable row level security;
revoke all on public.media_assets from anon;
grant select, insert, update, delete on public.media_assets to authenticated;
create policy media_owner_read on public.media_assets for select to authenticated using ((select auth.uid()) = owner_id);
create policy media_owner_insert on public.media_assets for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy media_owner_update on public.media_assets for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy media_owner_delete on public.media_assets for delete to authenticated using ((select auth.uid()) = owner_id);

create function public.guard_media_asset() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if new.id <> old.id or new.owner_id <> old.owner_id or new.collection_id <> old.collection_id or new.sha256 <> old.sha256 then
      raise exception 'Media identity cannot change';
    end if;
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 15));
  if (select count(*) from public.media_assets where owner_id = new.owner_id) >= 100 then
    raise exception 'Account photo limit reached. Remove unused photos.';
  end if;
  if (select count(*) from public.media_assets where owner_id = new.owner_id and collection_id = new.collection_id) >= 20 then
    raise exception 'Collection photo limit reached';
  end if;
  return new;
end $$;
revoke all on function public.guard_media_asset() from public;
create trigger guard_media_asset before insert or update on public.media_assets for each row execute function public.guard_media_asset();

create function public.reorder_media_photos(collection uuid, photo_ids uuid[]) returns void language plpgsql security invoker set search_path = '' as $$
declare actual uuid[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 15));
  select coalesce(array_agg(id order by id), '{}'::uuid[]) into actual from public.media_assets where owner_id = auth.uid() and collection_id = collection;
  if cardinality(photo_ids) > 20 or cardinality(photo_ids) <> cardinality(actual) or
    (select array_agg(id order by id) from unnest(photo_ids) id) is distinct from nullif(actual, '{}'::uuid[]) then
    raise exception 'Photos changed. Reload before reordering.';
  end if;
  update public.media_assets a set position = p.ordinality - 1
  from unnest(photo_ids) with ordinality p(id, ordinality)
  where a.id = p.id and a.owner_id = auth.uid() and a.collection_id = collection;
end $$;
revoke all on function public.reorder_media_photos(uuid, uuid[]) from public;
grant execute on function public.reorder_media_photos(uuid, uuid[]) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('property-photos', 'property-photos', false, 2097152, array['image/jpeg']);
-- Object paths are derived from a metadata reservation, never a filename.
create policy photo_owner_read on storage.objects for select to authenticated using (
  bucket_id = 'property-photos' and exists (select 1 from public.media_assets a where a.owner_id = (select auth.uid()) and name = a.owner_id::text || '/' || a.collection_id::text || '/' || a.id::text || '.jpg')
);
create policy photo_owner_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'property-photos' and exists (select 1 from public.media_assets a where a.owner_id = (select auth.uid()) and a.status = 'pending' and name = a.owner_id::text || '/' || a.collection_id::text || '/' || a.id::text || '.jpg')
);
create policy photo_owner_update on storage.objects for update to authenticated using (
  bucket_id = 'property-photos' and exists (select 1 from public.media_assets a where a.owner_id = (select auth.uid()) and a.status = 'pending' and name = a.owner_id::text || '/' || a.collection_id::text || '/' || a.id::text || '.jpg')
) with check (
  bucket_id = 'property-photos' and exists (select 1 from public.media_assets a where a.owner_id = (select auth.uid()) and a.status = 'pending' and name = a.owner_id::text || '/' || a.collection_id::text || '/' || a.id::text || '.jpg')
);
create policy photo_owner_delete on storage.objects for delete to authenticated using (
  bucket_id = 'property-photos' and exists (select 1 from public.media_assets a where a.owner_id = (select auth.uid()) and name = a.owner_id::text || '/' || a.collection_id::text || '/' || a.id::text || '.jpg')
);
