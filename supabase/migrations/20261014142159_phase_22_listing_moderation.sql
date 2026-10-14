-- Phase 22: explicit, human decisions on immutable submitted copies.
alter table public.staff_members drop constraint staff_members_role_check;
alter table public.staff_members add constraint staff_members_role_check check (role in ('ADMIN','MODERATOR'));
create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff_members where user_id=(select auth.uid()) and role='ADMIN' and revoked_at is null);
$$;
create function private.is_reviewer() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff_members where user_id=(select auth.uid()) and role in ('ADMIN','MODERATOR') and revoked_at is null);
$$;
revoke all on function private.is_reviewer() from public,anon,authenticated,service_role;
grant usage on schema private to authenticated;
grant execute on function private.is_reviewer() to authenticated;

alter table public.property_listings drop constraint property_listings_status_check;
alter table public.property_listings add constraint property_listings_status_check check(status in ('DRAFT','UNDER_REVIEW','ACTIVE','REJECTED','CHANGES_REQUESTED','EXPIRED','DELETED'));
alter table public.property_listings add constraint listing_decision_reason check(status not in ('REJECTED','CHANGES_REQUESTED') or (rejection_reason is not null and length(trim(rejection_reason)) between 5 and 2000));

create table public.moderation_actions (
 id uuid primary key,
 listing_id uuid not null references public.property_listings(id),
 submission_id uuid not null,
 actor_id uuid not null references auth.users(id),
 action text not null check(action in ('APPROVE','REJECT','REQUEST_CORRECTION')),
 reason text,
 approval_days integer,
 expires_at timestamptz,
 version_before integer not null check(version_before>=0 and version_before<2147483647),
 version_after integer not null check(version_after=version_before+1),
 created_at timestamptz not null default now(),
 foreign key(listing_id,submission_id) references public.property_listing_submissions(listing_id,id),
 unique(listing_id,version_after),
 check(reason is null or length(trim(reason)) between 5 and 2000),
 check((action='APPROVE' and approval_days is not null and approval_days between 1 and 180 and expires_at is not null and expires_at>created_at)
   or (action in ('REJECT','REQUEST_CORRECTION') and reason is not null and approval_days is null and expires_at is null))
);
create index moderation_actions_listing on public.moderation_actions(listing_id,created_at desc,id);
create index moderation_actions_submission on public.moderation_actions(submission_id);
create index moderation_actions_actor on public.moderation_actions(actor_id);
alter table public.moderation_actions enable row level security;
revoke all on public.moderation_actions from public,anon,authenticated,service_role;
grant select on public.moderation_actions to authenticated,service_role;
create policy moderation_history_owner on public.moderation_actions for select to authenticated
 using(exists(select 1 from public.property_listings l where l.id=listing_id and l.owner_id=(select auth.uid())));
create policy moderation_history_reviewer on public.moderation_actions for select to authenticated
 using((select private.is_reviewer()));
create trigger immutable_moderation_action before update or delete on public.moderation_actions
 for each row execute function public.immutable_listing_content();

create function private.moderation_decide(p_listing uuid,p_submission uuid,p_version integer,p_action text,p_reason text,p_days integer,p_request uuid)
returns public.moderation_actions language plpgsql security definer set search_path='' as $$
declare l public.property_listings; a public.moderation_actions; reviewer uuid:=auth.uid(); clean_reason text:=nullif(btrim(p_reason),''); decision_status text;
begin
 -- Fence a simultaneous revocation, then serialize reviewers and seller changes.
 perform 1 from public.staff_members where user_id=reviewer and role in ('ADMIN','MODERATOR') and revoked_at is null for share;
 if not found then raise exception 'Reviewer only' using errcode='42501'; end if;
 if p_listing is null or p_submission is null or p_request is null or p_version is null or p_version<0 or p_version>=2147483647
   or p_action is null or p_action not in ('APPROVE','REJECT','REQUEST_CORRECTION') then raise exception 'Invalid decision' using errcode='22023'; end if;
 if (clean_reason is not null and (length(clean_reason) not between 5 and 2000 or regexp_replace(clean_reason,E'[\n\t]','','g') ~ '[[:cntrl:]]'))
   or (p_action<>'APPROVE' and clean_reason is null)
   or (p_action='APPROVE' and (p_days is null or p_days not between 1 and 180))
   or (p_action<>'APPROVE' and p_days is not null) then raise exception 'Invalid reason or validity' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,22));
 select * into l from public.property_listings where id=p_listing for update;
 if not found then raise exception 'Listing not found' using errcode='P0002'; end if;
 if l.owner_id=reviewer then raise exception 'Independent reviewer required' using errcode='42501'; end if;
 select * into a from public.moderation_actions where id=p_request;
 if found then
  if a.actor_id=reviewer and a.listing_id=p_listing and a.submission_id=p_submission and a.version_before=p_version and a.action=p_action
    and a.reason is not distinct from clean_reason and a.approval_days is not distinct from p_days then return a; end if;
  raise exception 'Decision request changed' using errcode='40001';
 end if;
 if l.status<>'UNDER_REVIEW' or l.version<>p_version or l.current_submission_id is distinct from p_submission then raise exception 'Listing changed' using errcode='40001'; end if;
 decision_status:=case p_action when 'APPROVE' then 'ACTIVE' when 'REJECT' then 'REJECTED' else 'CHANGES_REQUESTED' end;
 update public.property_listings set status=decision_status,version=version+1,updated_at=now(),
  activated_at=case when p_action='APPROVE' then now() end,
  expires_at=case when p_action='APPROVE' then now()+make_interval(days=>p_days) end,
  rejection_reason=case when p_action<>'APPROVE' then clean_reason end where id=l.id returning * into l;
 if p_action<>'APPROVE' then delete from public.property_draft_reviews where draft_id=l.draft_id; end if;
 insert into public.property_listing_events(listing_id,from_status,to_status,reason,actor_type,actor_id)
  values(l.id,'UNDER_REVIEW',decision_status,clean_reason,'OPERATOR',reviewer);
 insert into public.moderation_actions(id,listing_id,submission_id,actor_id,action,reason,approval_days,expires_at,version_before,version_after)
  values(p_request,l.id,p_submission,reviewer,p_action,clean_reason,p_days,l.expires_at,p_version,l.version) returning * into a;
 return a;
end $$;
revoke all on function private.moderation_decide(uuid,uuid,integer,text,text,integer,uuid) from public,anon,authenticated,service_role;
grant execute on function private.moderation_decide(uuid,uuid,integer,text,text,integer,uuid) to authenticated;
create function public.moderation_decide(p_listing uuid,p_submission uuid,p_version integer,p_action text,p_reason text,p_days integer,p_request uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select to_jsonb(private.moderation_decide(p_listing,p_submission,p_version,p_action,p_reason,p_days,p_request));
$$;
revoke all on function public.moderation_decide(uuid,uuid,integer,text,text,integer,uuid) from public,anon,authenticated,service_role;
grant execute on function public.moderation_decide(uuid,uuid,integer,text,text,integer,uuid) to authenticated;

create function private.moderation_queue(p_limit integer,p_offset integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare total bigint; offset_rows bigint; result jsonb;
begin
 if not private.is_reviewer() then raise exception 'Reviewer only' using errcode='42501'; end if;
 if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset<0 then raise exception 'Invalid page' using errcode='22023'; end if;
 select count(*) into total from public.property_listings where status='UNDER_REVIEW';
 offset_rows:=least(p_offset,greatest(0,((total-1)/p_limit)*p_limit));
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into result from (
  select l.id,l.status,s.title,s.seller_name,s.seller_type,s.intent,s.price,s.locality_name,s.city_name,
   s.created_at as submitted_at,l.updated_at,l.activated_at,l.expires_at,total as total
  from public.property_listings l join public.property_listing_submissions s on s.id=l.current_submission_id
  where l.status='UNDER_REVIEW' order by s.created_at,l.id limit p_limit offset offset_rows
 ) r;
 return jsonb_build_object('rows',result,'total',total);
end $$;
revoke all on function private.moderation_queue(integer,integer) from public,anon,authenticated,service_role;
grant execute on function private.moderation_queue(integer,integer) to authenticated;
create function public.moderation_queue(p_limit integer,p_offset integer) returns jsonb
language sql stable security invoker set search_path='' as $$select private.moderation_queue(p_limit,p_offset)$$;
revoke all on function public.moderation_queue(integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.moderation_queue(integer,integer) to authenticated;

create function private.moderation_review(p_listing uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare l public.property_listings; s jsonb; photos jsonb; history jsonb;
begin
 if not private.is_reviewer() then raise exception 'Reviewer only' using errcode='42501'; end if;
 select * into l from public.property_listings where id=p_listing;
 if not found or l.current_submission_id is null then raise exception 'Review not found' using errcode='P0002'; end if;
 select to_jsonb(copy)-array['draft_revision','preview_hash'] into s from public.property_listing_submissions copy where id=l.current_submission_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'submission_id',submission_id,'position',position,'width',width,'height',height,'bytes',bytes) order by position),'[]'::jsonb)
  into photos from public.property_listing_photos where submission_id=l.current_submission_id;
 select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) into history from (select * from public.moderation_actions where listing_id=l.id order by created_at desc,id limit 100) a;
 return jsonb_build_object('listing',to_jsonb(l),'submission',s,'photos',photos,'history',history);
end $$;
revoke all on function private.moderation_review(uuid) from public,anon,authenticated,service_role;
grant execute on function private.moderation_review(uuid) to authenticated;
create function public.moderation_review(p_listing uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.moderation_review(p_listing)$$;
revoke all on function public.moderation_review(uuid) from public,anon,authenticated,service_role;
grant execute on function public.moderation_review(uuid) to authenticated;

create function private.moderation_photo(p_listing uuid,p_submission uuid,p_photo uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare path text;
begin
 if not private.is_reviewer() then raise exception 'Reviewer only' using errcode='42501'; end if;
 select p.object_path into path from public.property_listing_photos p join public.property_listings l on l.current_submission_id=p.submission_id
  where l.id=p_listing and p.submission_id=p_submission and p.id=p_photo;
 if not found then raise exception 'Photo not found' using errcode='P0002'; end if;
 return path;
end $$;
revoke all on function private.moderation_photo(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function private.moderation_photo(uuid,uuid,uuid) to authenticated;
create function public.moderation_photo(p_listing uuid,p_submission uuid,p_photo uuid) returns text language sql stable security invoker set search_path='' as $$select private.moderation_photo(p_listing,p_submission,p_photo)$$;
revoke all on function public.moderation_photo(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.moderation_photo(uuid,uuid,uuid) to authenticated;

create function private.reviewer_photo_access(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_reviewer() and exists(select 1 from public.property_listing_photos p join public.property_listings l on l.current_submission_id=p.submission_id where p.object_path=object_name);
$$;
revoke all on function private.reviewer_photo_access(text) from public,anon,authenticated,service_role;
grant execute on function private.reviewer_photo_access(text) to authenticated;
create policy listing_object_reviewer on storage.objects for select to authenticated
 using(bucket_id='listing-photos' and private.reviewer_photo_access(name));

-- Correction recovery preserves the existing confirmed-preview submission transaction.
create or replace function public.submit_property_listing(p_owner uuid,p_draft uuid,p_listing uuid,p_request uuid,p_version integer,p_snapshot jsonb,p_photos jsonb) returns public.property_listings
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
  if l.version<>p_version or l.status not in ('DRAFT','REJECTED','CHANGES_REQUESTED','EXPIRED') then raise exception 'Listing changed'; end if;
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


-- Admin filtering recognises the distinct private correction state.
create or replace function public.admin_listings(p_status text default null, p_limit integer default 25, p_offset integer default 0)
returns table(id uuid, status text, title text, seller_name text, seller_type text, intent text, price bigint,
  locality_name text, city_name text, submitted_at timestamptz, updated_at timestamptz,
  activated_at timestamptz, expires_at timestamptz, total bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not private.is_staff() then raise exception 'Staff only' using errcode = '42501'; end if;
  if (p_status is not null and p_status not in ('DRAFT','UNDER_REVIEW','ACTIVE','EXPIRED','REJECTED','CHANGES_REQUESTED','WITHDRAWN','REMOVED'))
    or p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset < 0 then
    raise exception 'Invalid listing query' using errcode = '22023';
  end if;
  return query
  with x as (
    select l.id as lid, private.admin_status(l) as st, l.current_submission_id as sid,
      l.updated_at as changed, l.activated_at as live, l.expires_at as ends
    from public.property_listings l where l.current_submission_id is not null
  )
  select x.lid, x.st, s.title, s.seller_name, s.seller_type, s.intent, s.price, s.locality_name, s.city_name,
    s.created_at, x.changed, x.live, x.ends, count(*) over ()
  from x join public.property_listing_submissions s on s.id = x.sid
  where p_status is null or x.st = p_status
  order by case when p_status = 'UNDER_REVIEW' then s.created_at end asc nulls last, x.changed desc, x.lid
  limit p_limit offset p_offset;
end $$;
revoke all on function public.admin_listings(text,integer,integer) from public, anon, authenticated;
grant execute on function public.admin_listings(text,integer,integer) to authenticated;
