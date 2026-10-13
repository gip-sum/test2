grant select,update on public.property_drafts,public.property_draft_reviews,public.media_assets to service_role;
create table public.property_listings (
 id uuid primary key,
 owner_id uuid not null references auth.users(id),
 draft_id uuid not null unique references public.property_drafts(id),
 current_submission_id uuid,
 status text not null default 'DRAFT' check(status in ('DRAFT','UNDER_REVIEW','ACTIVE','REJECTED','EXPIRED','DELETED')),
 version integer not null default 0 check(version>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 activated_at timestamptz, expires_at timestamptz, rejection_reason text,
 check(status <> 'ACTIVE' or (current_submission_id is not null and activated_at is not null and expires_at>activated_at)),
 check(status <> 'REJECTED' or length(trim(rejection_reason)) between 5 and 2000)
);
create index property_listings_owner on public.property_listings(owner_id,updated_at desc);
create index property_listings_expiry on public.property_listings(expires_at) where status='ACTIVE';
create table public.property_listing_submissions (
 id uuid primary key, listing_id uuid not null references public.property_listings(id),
 draft_revision integer not null check(draft_revision>0), preview_hash text not null check(preview_hash ~ '^[a-f0-9]{64}$'),
 title text not null check(length(title) between 1 and 400), seller_name text not null check(length(trim(seller_name)) between 1 and 120),
 seller_type text not null check(seller_type in ('OWNER','AGENT','BUILDER')),intent text not null check(intent in ('buy','rent')),
 property_type text not null check(property_type in ('APARTMENT','INDEPENDENT_HOUSE','BUILDER_FLOOR','VILLA','STUDIO')),
 bedrooms integer check(bedrooms between 1 and 10),bathrooms integer not null check(bathrooms between 1 and 10),
 area_unit text not null check(area_unit in ('sqft','sqm','sqyd')),carpet_area numeric not null check(carpet_area>0),
 built_up_area numeric check(built_up_area>=carpet_area),super_area numeric check(super_area>=carpet_area),
 furnishing text not null check(furnishing in ('UNFURNISHED','SEMI_FURNISHED','FURNISHED')),
 floor integer check(floor between 0 and 98),total_floors integer not null check(total_floors between 1 and 99),
 construction_status text not null check(construction_status in ('READY','UNDER_CONSTRUCTION')),
 age_years integer check(age_years between 0 and 150),possession_by text,available_from text,
 city_name text not null,locality_name text not null,city_id text not null,locality_id text not null,
 sub_locality_id text,society_name text,address text not null check(length(address) between 5 and 240),latitude numeric,longitude numeric,
 price bigint not null check(price between 1 and 10000000000),deposit bigint check(deposit between 0 and 100000000),
 maintenance_status text not null check(maintenance_status in ('none','unknown','included','separate')),
 maintenance_monthly bigint check(maintenance_monthly between 1 and 1000000),negotiable boolean not null,
 created_at timestamptz not null default now(),
 unique(listing_id,id),
 check((intent='rent' and deposit is not null) or (intent='buy' and deposit is null)),
 check((maintenance_status='separate' and maintenance_monthly is not null) or (maintenance_status<>'separate' and maintenance_monthly is null))
);
alter table public.property_listings add constraint listing_current_submission foreign key(id,current_submission_id) references public.property_listing_submissions(listing_id,id);
create index property_listing_submissions_listing on public.property_listing_submissions(listing_id);
create table public.property_listing_photos (
 submission_id uuid not null references public.property_listing_submissions(id),id uuid not null,source_id uuid not null,
 object_path text not null unique,position integer not null check(position between 0 and 19),
 width integer not null check(width between 320 and 1920),height integer not null check(height between 320 and 1920),
 bytes integer not null check(bytes between 1 and 2097152),sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 primary key(submission_id,id),unique(submission_id,position),
 check(object_path=submission_id::text||'/'||id::text||'.jpg'),check(id=source_id)
);
create table public.property_listing_events (
 id bigint generated always as identity primary key,listing_id uuid not null references public.property_listings(id),
 from_status text,to_status text not null,reason text,actor_type text not null check(actor_type in ('OWNER','OPERATOR','SYSTEM')),actor_id uuid references auth.users(id),created_at timestamptz not null default now()
);
create index property_listing_events_listing on public.property_listing_events(listing_id,id desc);
alter table public.property_listings enable row level security;
alter table public.property_listing_submissions enable row level security;
alter table public.property_listing_photos enable row level security;
alter table public.property_listing_events enable row level security;
revoke all on public.property_listings,public.property_listing_submissions,public.property_listing_photos,public.property_listing_events from anon,authenticated;
grant select on public.property_listings,public.property_listing_submissions,public.property_listing_photos,public.property_listing_events to authenticated;
grant select(id,status,current_submission_id,activated_at,expires_at) on public.property_listings to anon;
grant select(id,listing_id,title,seller_name,seller_type,intent,property_type,bedrooms,bathrooms,area_unit,carpet_area,built_up_area,super_area,furnishing,floor,total_floors,construction_status,age_years,possession_by,available_from,city_name,locality_name,city_id,locality_id,sub_locality_id,society_name,address,latitude,longitude,price,deposit,maintenance_status,maintenance_monthly,negotiable,created_at) on public.property_listing_submissions to anon;
grant select(id,submission_id,object_path,position,width,height,bytes) on public.property_listing_photos to anon;
grant all on public.property_listings,public.property_listing_submissions,public.property_listing_photos,public.property_listing_events to service_role;
grant usage,select on sequence public.property_listing_events_id_seq to service_role;
create policy listing_owner on public.property_listings for select to authenticated using(owner_id=(select auth.uid()));
create policy listing_public on public.property_listings for select to anon using(status='ACTIVE' and expires_at>now());
-- SQL policies use only columns anon may read. Historical submissions stay private.
create policy submission_owner on public.property_listing_submissions for select to authenticated using(exists(select 1 from public.property_listings l where l.id=listing_id and l.owner_id=(select auth.uid())));
create policy submission_public on public.property_listing_submissions for select to anon using(exists(select 1 from public.property_listings l where l.id=listing_id and l.current_submission_id=property_listing_submissions.id and l.status='ACTIVE' and l.expires_at>now()));
create policy listing_photo_owner on public.property_listing_photos for select to authenticated using(exists(select 1 from public.property_listing_submissions s where s.id=submission_id));
create policy listing_photo_public on public.property_listing_photos for select to anon using(exists(select 1 from public.property_listing_submissions s where s.id=submission_id));
create policy listing_event_owner on public.property_listing_events for select to authenticated using(exists(select 1 from public.property_listings l where l.id=listing_id and l.owner_id=(select auth.uid())));
create function public.immutable_listing_content() returns trigger language plpgsql security invoker set search_path='' as $$
begin raise exception 'Submitted content and history are immutable'; end $$;
revoke all on function public.immutable_listing_content() from public,anon,authenticated;
create trigger immutable_submission before update or delete on public.property_listing_submissions for each row execute function public.immutable_listing_content();
create trigger immutable_listing_photo before update or delete on public.property_listing_photos for each row execute function public.immutable_listing_content();
create trigger immutable_listing_history before update or delete on public.property_listing_events for each row execute function public.immutable_listing_content();

create function public.submit_property_listing(p_owner uuid,p_draft uuid,p_listing uuid,p_request uuid,p_version integer,p_snapshot jsonb,p_photos jsonb) returns public.property_listings
language plpgsql security invoker set search_path='' as $$
declare l public.property_listings;d public.property_drafts;s public.property_listing_submissions;r public.property_draft_reviews;photo jsonb;old_status text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_draft::text,18));
 select * into d from public.property_drafts where id=p_draft and owner_id=p_owner for update;
 if not found then raise exception 'Draft not found'; end if;
 select * into l from public.property_listings where draft_id=p_draft for update;
 if found then
  if l.owner_id<>p_owner or l.id<>p_listing then raise exception 'Owner mismatch'; end if;
  if l.current_submission_id=p_request then return l; end if;
  if l.status='ACTIVE' and l.expires_at<=now() then
   insert into public.property_listing_events(listing_id,from_status,to_status,reason,actor_type) values(l.id,'ACTIVE','EXPIRED','Listing validity ended','SYSTEM');
   update public.property_listings set status='EXPIRED',updated_at=now() where id=l.id returning * into l;
  end if;
  if l.version<>p_version or l.status not in ('DRAFT','REJECTED','EXPIRED') then raise exception 'Listing changed'; end if;
 else
  if p_version<>0 then raise exception 'Listing changed'; end if;
  insert into public.property_listings(id,owner_id,draft_id) values(p_listing,p_owner,p_draft) returning * into l;
  insert into public.property_listing_events(listing_id,to_status,actor_type,actor_id) values(l.id,'DRAFT','OWNER',p_owner);
 end if;
 select * into r from public.property_draft_reviews where draft_id=p_draft and owner_id=p_owner for share;
 perform 1 from public.media_assets where owner_id=p_owner and collection_id=d.collection_id for share;
 s:=jsonb_populate_record(null::public.property_listing_submissions,p_snapshot);
 if r.draft_revision is distinct from d.revision or s.draft_revision is distinct from d.revision or r.content_hash is distinct from s.preview_hash then raise exception 'Current review required'; end if;
 if jsonb_typeof(p_photos)<>'array' or jsonb_array_length(p_photos) not between 1 and 20 then raise exception 'Photos required'; end if;
 -- Every manifest entry must still be reserved by this owner and unchanged.
 if (select count(*) from public.media_assets where owner_id=p_owner and collection_id=d.collection_id)<>jsonb_array_length(p_photos) then raise exception 'Photos changed'; end if;
 for photo in select value from jsonb_array_elements(p_photos) loop
  if not exists(select 1 from public.media_assets a where a.owner_id=p_owner and a.collection_id=d.collection_id and a.id=(photo->>'source_id')::uuid and a.status='ready' and a.sha256=photo->>'sha256' and a.width=(photo->>'width')::integer and a.height=(photo->>'height')::integer and a.bytes=(photo->>'bytes')::integer and a.position=(photo->>'position')::integer) then raise exception 'Photos changed'; end if;
 end loop;
 s.id:=p_request;s.listing_id:=l.id;s.created_at:=now();
 insert into public.property_listing_submissions select s.*;
 insert into public.property_listing_photos select p_request,(p->>'id')::uuid,(p->>'source_id')::uuid,p->>'object_path',(p->>'position')::integer,(p->>'width')::integer,(p->>'height')::integer,(p->>'bytes')::integer,p->>'sha256' from jsonb_array_elements(p_photos) p;
 old_status:=l.status;
 update public.property_listings set current_submission_id=p_request,status='UNDER_REVIEW',version=version+1,updated_at=now(),activated_at=null,expires_at=null,rejection_reason=null where id=l.id returning * into l;
 insert into public.property_listing_events(listing_id,from_status,to_status,actor_type,actor_id) values(l.id,old_status,'UNDER_REVIEW','OWNER',p_owner);
 return l;
end $$;
revoke all on function public.submit_property_listing(uuid,uuid,uuid,uuid,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.submit_property_listing(uuid,uuid,uuid,uuid,integer,jsonb,jsonb) to service_role;

create function public.change_property_listing(p_owner uuid,p_listing uuid,p_version integer,p_action text) returns public.property_listings
language plpgsql security invoker set search_path='' as $$
declare l public.property_listings;next_status text;old_status text;
begin
 select * into l from public.property_listings where id=p_listing and owner_id=p_owner for update;
 if not found then raise exception 'Listing not found'; end if;
 if p_action not in ('withdraw','delete') then raise exception 'Invalid owner action'; end if;
 next_status:=case when p_action='delete' then 'DELETED' else 'DRAFT' end;
 if l.status=next_status then return l; end if;
 if l.status='DELETED' or l.version<>p_version then raise exception 'Listing changed'; end if;
 old_status:=l.status;
 update public.property_listings set status=next_status,version=version+1,updated_at=now(),activated_at=null,expires_at=null,rejection_reason=null where id=l.id returning * into l;
 insert into public.property_listing_events(listing_id,from_status,to_status,actor_type,actor_id) values(l.id,old_status,next_status,'OWNER',p_owner);
 return l;
end $$;
revoke all on function public.change_property_listing(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.change_property_listing(uuid,uuid,integer,text) to service_role;

-- Trusted operator interface; no user-facing moderation route exists in Phase 18.
create function public.moderate_property_listing(p_listing uuid,p_version integer,p_decision text,p_reason text default null,p_expires_at timestamptz default now()+interval '90 days',p_reviewer uuid default null) returns public.property_listings
language plpgsql security invoker set search_path='' as $$
declare l public.property_listings;
begin
 select * into l from public.property_listings where id=p_listing for update;
 if not found or l.status<>'UNDER_REVIEW' or l.version<>p_version then raise exception 'Listing changed'; end if;
 if p_decision not in ('ACTIVE','REJECTED') then raise exception 'Invalid decision'; end if;
 if p_decision='REJECTED' and (p_reason is null or length(trim(p_reason)) not between 5 and 2000) then raise exception 'Rejection reason required'; end if;
 if p_decision='ACTIVE' and (p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '180 days') then raise exception 'Invalid expiry'; end if;
 update public.property_listings set status=p_decision,version=version+1,updated_at=now(),activated_at=case when p_decision='ACTIVE' then now() end,expires_at=case when p_decision='ACTIVE' then p_expires_at end,rejection_reason=case when p_decision='REJECTED' then trim(p_reason) end where id=l.id returning * into l;
 insert into public.property_listing_events(listing_id,from_status,to_status,reason,actor_type,actor_id) values(l.id,'UNDER_REVIEW',p_decision,case when p_decision='REJECTED' then trim(p_reason) end,'OPERATOR',p_reviewer);
 return l;
end $$;
revoke all on function public.moderate_property_listing(uuid,integer,text,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.moderate_property_listing(uuid,integer,text,text,timestamptz,uuid) to service_role;
create function public.expire_property_listings() returns integer language plpgsql security invoker set search_path='' as $$
declare l public.property_listings;count_expired integer:=0;
begin
 for l in select * from public.property_listings where status='ACTIVE' and expires_at<=now() for update skip locked loop
  update public.property_listings set status='EXPIRED',version=version+1,updated_at=now() where id=l.id;
  insert into public.property_listing_events(listing_id,from_status,to_status,reason,actor_type) values(l.id,'ACTIVE','EXPIRED','Listing validity ended','SYSTEM');
  count_expired:=count_expired+1;
 end loop;
 return count_expired;
end $$;
revoke all on function public.expire_property_listings() from public,anon,authenticated;
grant execute on function public.expire_property_listings() to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('listing-photos','listing-photos',false,2097152,array['image/jpeg']);
create policy listing_object_public on storage.objects for select to anon using(bucket_id='listing-photos' and exists(select 1 from public.property_listing_photos p where p.object_path=name));
create policy listing_object_owner on storage.objects for select to authenticated using(bucket_id='listing-photos' and exists(select 1 from public.property_listing_photos p where p.object_path=name));
