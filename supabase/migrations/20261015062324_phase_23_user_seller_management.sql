-- Phase 23: marketplace account controls are separate from provider identity.
create table public.account_controls (
 user_id uuid primary key references auth.users(id) on delete restrict,
 status text not null default 'ACTIVE' check(status in ('ACTIVE','SUSPENDED')),
 seller_role text check(seller_role in ('OWNER','AGENT','BUILDER')),
 version integer not null check(version between 1 and 2147483647),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index account_controls_status on public.account_controls(status,user_id);
create index account_controls_role on public.account_controls(seller_role,user_id);
create table public.account_actions (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete restrict,
 actor_id uuid not null references auth.users(id) on delete restrict,
 reason text not null check(length(btrim(reason)) between 5 and 2000),
 status_before text not null check(status_before in ('ACTIVE','SUSPENDED')),
 status_after text not null check(status_after in ('ACTIVE','SUSPENDED')),
 role_before text check(role_before in ('OWNER','AGENT','BUILDER')),
 role_after text check(role_after in ('OWNER','AGENT','BUILDER')),
 version_before integer not null check(version_before>=0),
 version_after integer not null check(version_after=version_before+1),
 created_at timestamptz not null default now(), unique(user_id,version_after),
 check(user_id<>actor_id), check(status_before<>status_after or role_before is distinct from role_after)
);
create index account_actions_subject on public.account_actions(user_id,created_at desc,id);
create index account_actions_actor on public.account_actions(actor_id);
alter table public.account_controls enable row level security;
alter table public.account_actions enable row level security;
revoke all on public.account_controls,public.account_actions from public,anon,authenticated,service_role;
grant select on public.account_controls to authenticated;
grant select on public.account_controls,public.account_actions to service_role;
create policy account_controls_self on public.account_controls for select to authenticated using(user_id=(select auth.uid()));
create trigger immutable_account_action before update or delete on public.account_actions
 for each row execute function public.immutable_listing_content();

-- This narrowly scoped internal lookup intentionally bypasses RLS. Callers
-- cannot change controls; only the checked management function can write them.
create function private.account_active(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.account_controls where user_id=p_user and status='SUSPENDED');
$$;
revoke all on function private.account_active(uuid) from public,anon,authenticated,service_role;
grant usage on schema private to service_role;
grant execute on function private.account_active(uuid) to service_role;
create function private.current_account_active() returns boolean
language sql stable security definer set search_path='' as $$select private.account_active(auth.uid())$$;
revoke all on function private.current_account_active() from public,anon,authenticated;
grant execute on function private.current_account_active() to authenticated;
create function public.my_account_access() returns boolean
language sql stable security invoker set search_path='' as $$select auth.uid() is not null and private.current_account_active()$$;
revoke all on function public.my_account_access() from public,anon,authenticated;
grant execute on function public.my_account_access() to authenticated;

create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path='' as $$
 select private.account_active(auth.uid()) and exists(select 1 from public.staff_members where user_id=auth.uid() and role='ADMIN' and revoked_at is null);
$$;
create or replace function private.is_reviewer() returns boolean
language sql stable security definer set search_path='' as $$
 select private.account_active(auth.uid()) and exists(select 1 from public.staff_members where user_id=auth.uid() and revoked_at is null);
$$;

-- Restrictive policies combine with (never replace) the ownership policies.
-- Optional identity tables were installed outside the migration register.
do $$declare t text;begin
 foreach t in array array['buyer_profiles','saved_properties','listing_sellers','enquiries','lead_events','seller_notifications',
  'media_assets','property_drafts','property_draft_reviews','property_listings','property_listing_submissions',
  'property_listing_photos','property_listing_events','property_listing_daily_stats','property_listing_view_marks','listing_analytics_meta','saved_listings',
  'staff_members','moderation_actions','property_description_jobs','organisations','memberships'] loop
  if to_regclass('public.'||t) is not null then
   execute format('create policy active_account_required on public.%I as restrictive for all to authenticated using ((select private.current_account_active())) with check ((select private.current_account_active()))',t);
  end if;
 end loop;
end $$;
create policy active_account_required on storage.objects as restrictive for all to authenticated
 using((select private.current_account_active())) with check((select private.current_account_active()));

-- Explicit projection avoids sending provider secrets or metadata to staff.
create function private.account_summary(p_user uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',u.id,'email',u.email,'full_name',p.full_name,'created_at',u.created_at,
  'last_sign_in_at',u.last_sign_in_at,'status',coalesce(c.status,'ACTIVE'),'seller_role',c.seller_role,
  'version',coalesce(c.version,0),'staff_role',s.role,'operator_managed',exists(select 1 from public.staff_members where user_id=u.id))
 from auth.users u left join public.buyer_profiles p on p.id=u.id
 left join public.account_controls c on c.user_id=u.id
 left join public.staff_members s on s.user_id=u.id and s.revoked_at is null where u.id=p_user;
$$;
revoke all on function private.account_summary(uuid) from public,anon,authenticated,service_role;

create function private.admin_users(p_q text,p_status text,p_role text,p_page integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare n integer; pg integer; result jsonb;
begin
 if not private.is_staff() then raise exception 'Admin only' using errcode='42501'; end if;
 if p_q is null or length(p_q)>100 or p_q~'[[:cntrl:]]' or p_page is null or p_page not between 1 and 99999
  or p_status is null or p_status not in ('','ACTIVE','SUSPENDED') or p_role is null or p_role not in ('','unassigned','OWNER','AGENT','BUILDER')
 then raise exception 'Invalid account query' using errcode='22023';end if;
 -- strpos uses literal substrings: % and _ never become wildcards.
 with found as (select u.id from auth.users u left join public.buyer_profiles p on p.id=u.id left join public.account_controls c on c.user_id=u.id
  where (p_q='' or strpos(lower(coalesce(u.email,'')),lower(p_q))>0 or strpos(lower(coalesce(p.full_name,'')),lower(p_q))>0 or u.id::text=p_q)
  and (p_status='' or coalesce(c.status,'ACTIVE')=p_status)
  and (p_role='' or p_role='unassigned' and c.seller_role is null or c.seller_role=p_role)) select count(*) into n from found;
 pg:=least(p_page,greatest(1,(n+24)/25));
 select coalesce(jsonb_agg(private.account_summary(x.id) order by x.created_at desc,x.id),'[]'::jsonb) into result from (
  select u.id,u.created_at from auth.users u left join public.buyer_profiles p on p.id=u.id left join public.account_controls c on c.user_id=u.id
  where (p_q='' or strpos(lower(coalesce(u.email,'')),lower(p_q))>0 or strpos(lower(coalesce(p.full_name,'')),lower(p_q))>0 or u.id::text=p_q)
  and (p_status='' or coalesce(c.status,'ACTIVE')=p_status)
  and (p_role='' or p_role='unassigned' and c.seller_role is null or c.seller_role=p_role)
  order by u.created_at desc,u.id limit 25 offset (pg-1)*25) x;
 return jsonb_build_object('rows',result,'total',n,'page',pg);
end $$;
create function public.admin_users(p_q text default '',p_status text default '',p_role text default '',p_page integer default 1) returns jsonb
language sql stable security invoker set search_path='' as $$select private.admin_users(p_q,p_status,p_role,p_page)$$;
revoke all on function private.admin_users(text,text,text,integer),public.admin_users(text,text,text,integer) from public,anon,authenticated,service_role;
grant execute on function private.admin_users(text,text,text,integer),public.admin_users(text,text,text,integer) to authenticated;

create function private.account_history(p_user uuid,p_kind text,p_page integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare n integer;pg integer;result jsonb;
begin
 if not private.is_staff() then raise exception 'Admin only' using errcode='42501';end if;
 if p_page is null or p_page not between 1 and 99999 then raise exception 'Invalid history query' using errcode='22023';end if;
 if p_kind='listings' then
  select count(*) into n from public.property_listings where owner_id=p_user and current_submission_id is not null;
  pg:=least(p_page,greatest(1,(n+24)/25));
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) into result from (
   select l.id,s.title,private.admin_status(l) as status,s.seller_type,s.created_at from public.property_listings l
   join public.property_listing_submissions s on s.id=l.current_submission_id where l.owner_id=p_user
   order by s.created_at desc,l.id limit 25 offset (pg-1)*25) x;
 elsif p_kind='leads' then
  select count(*) into n from public.enquiries where buyer_id=p_user or seller_id=p_user;
  pg:=least(p_page,greatest(1,(n+24)/25));
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) into result from (
   select e.id,e.listing_id,e.listing_title,e.status,e.created_at,
   case when e.buyer_id=p_user and e.seller_id=p_user then 'both' when e.buyer_id=p_user then 'sent' else 'received' end as direction
   from public.enquiries e where e.buyer_id=p_user or e.seller_id=p_user order by e.created_at desc,e.id limit 25 offset (pg-1)*25) x;
 elsif p_kind='changes' then
  select count(*) into n from public.account_actions where user_id=p_user;
  pg:=least(p_page,greatest(1,(n+24)/25));
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) into result from (
   select id,actor_id,reason,status_before,status_after,role_before,role_after,version_before,version_after,created_at from public.account_actions
   where user_id=p_user order by created_at desc,id limit 25 offset (pg-1)*25) x;
 else raise exception 'Invalid history kind' using errcode='22023';end if;
 return jsonb_build_object('rows',result,'total',n,'page',pg);
end $$;
revoke all on function private.account_history(uuid,text,integer) from public,anon,authenticated,service_role;
create function private.admin_user(p_user uuid,p_listings integer,p_leads integer,p_changes integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare summary jsonb;
begin
 if not private.is_staff() then raise exception 'Admin only' using errcode='42501';end if;
 summary:=private.account_summary(p_user);
 if summary is null then raise exception 'Account not found' using errcode='P0002';end if;
 return jsonb_build_object('account',summary,'contact_phone',(select contact_phone from public.buyer_profiles where id=p_user),
  'preferred_intent',(select preferred_intent from public.buyer_profiles where id=p_user),
  'listings',private.account_history(p_user,'listings',p_listings),'leads',private.account_history(p_user,'leads',p_leads),'changes',private.account_history(p_user,'changes',p_changes));
end $$;
create function public.admin_user(p_user uuid,p_listings integer default 1,p_leads integer default 1,p_changes integer default 1) returns jsonb
language sql stable security invoker set search_path='' as $$select private.admin_user(p_user,p_listings,p_leads,p_changes)$$;
revoke all on function private.admin_user(uuid,integer,integer,integer),public.admin_user(uuid,integer,integer,integer) from public,anon,authenticated,service_role;
grant execute on function private.admin_user(uuid,integer,integer,integer),public.admin_user(uuid,integer,integer,integer) to authenticated;

create function private.manage_account(p_user uuid,p_version integer,p_status text,p_role text,p_reason text,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();c public.account_controls;a public.account_actions;reason text:=btrim(p_reason);
begin
 -- Share lock fences revocation; lock the subject identity before controls so
 -- the absent-row (version zero) case is serialized as well.
 perform 1 from public.staff_members where user_id=actor and role='ADMIN' and revoked_at is null for share;
 if not found or not private.account_active(actor) then raise exception 'Admin only' using errcode='42501';end if;
 if p_user is null or p_request is null or p_version is null or p_version not between 0 and 2147483646
  or p_status is null or p_status not in ('ACTIVE','SUSPENDED') or (p_role is not null and p_role not in ('OWNER','AGENT','BUILDER'))
  or reason is null or length(reason) not between 5 and 2000 or regexp_replace(reason,E'[\n\t]','','g')~'[[:cntrl:]]'
 then raise exception 'Invalid account change' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,23));
 perform 1 from auth.users where id=p_user for update;
 if not found then raise exception 'Account not found' using errcode='P0002';end if;
 if p_user=actor or exists(select 1 from public.staff_members where user_id=p_user) then raise exception 'Staff accounts are operator-managed' using errcode='42501';end if;
 select * into a from public.account_actions where id=p_request;
 if found then
  if a.user_id=p_user and a.actor_id=actor and a.version_before=p_version and a.status_after=p_status and a.role_after is not distinct from p_role and a.reason=reason
  then return jsonb_build_object('id',a.id,'version',a.version_after);end if;
  raise exception 'Request changed' using errcode='40001';
 end if;
 select * into c from public.account_controls where user_id=p_user for update;
 if coalesce(c.version,0)<>p_version then raise exception 'Account changed' using errcode='40001';end if;
 if coalesce(c.status,'ACTIVE')=p_status and c.seller_role is not distinct from p_role then raise exception 'No account change' using errcode='22023';end if;
 insert into public.account_actions(id,user_id,actor_id,reason,status_before,status_after,role_before,role_after,version_before,version_after)
 values(p_request,p_user,actor,reason,coalesce(c.status,'ACTIVE'),p_status,c.seller_role,p_role,p_version,p_version+1);
 insert into public.account_controls(user_id,status,seller_role,version) values(p_user,p_status,p_role,p_version+1)
 on conflict(user_id) do update set status=excluded.status,seller_role=excluded.seller_role,version=excluded.version,updated_at=now();
 return jsonb_build_object('id',p_request,'version',p_version+1);
end $$;
create function public.manage_account(p_user uuid,p_version integer,p_status text,p_role text,p_reason text,p_request uuid) returns jsonb
language sql security invoker set search_path='' as $$select private.manage_account(p_user,p_version,p_status,p_role,p_reason,p_request)$$;
revoke all on function private.manage_account(uuid,integer,text,text,text,uuid),public.manage_account(uuid,integer,text,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function private.manage_account(uuid,integer,text,text,text,uuid),public.manage_account(uuid,integer,text,text,text,uuid) to authenticated;

-- Existing privileged entry points repeat the live account check.
-- Full definitions keep this migration deterministic and reviewable.
create or replace function private.submit_enquiry_impl(
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
 if not private.account_active(auth.uid()) then raise exception 'Account suspended' using errcode='42501';end if;
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
create or replace function private.update_lead_status_impl(p_enquiry_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_updated uuid;
begin
 if not private.account_active(auth.uid()) then raise exception 'Account suspended' using errcode='42501';end if;
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
create or replace function private.submit_listing_enquiry_impl(
  p_listing uuid, p_name text, p_phone text, p_message text default null
) returns table(enquiry_id uuid, repeated boolean, seller_notified boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_listing public.property_listings;
  v_title text;
  v_previous uuid;
  v_enquiry uuid;
  v_name text := trim(p_name);
  v_message text := nullif(trim(p_message), '');
begin
 if not private.account_active(auth.uid()) then raise exception 'Account suspended' using errcode='42501';end if;
  if p_listing is null
    or char_length(coalesce(v_name, '')) not between 1 and 80
    or coalesce(p_phone, '') !~ '^\+91[6-9][0-9]{9}$'
    or char_length(coalesce(v_message, '')) > 1000 then
    raise exception 'Invalid enquiry details' using errcode = '22023';
  end if;
  -- FOR SHARE makes a concurrent withdrawal, removal or expiry (all FOR
  -- UPDATE) wait for this transaction, so a lead is never recorded against a
  -- listing that left public view at the same instant. The expiry time is
  -- checked directly because the hourly job may not have run yet.
  select * into v_listing from public.property_listings where id = p_listing for share;
  if not found or v_listing.status <> 'ACTIVE' or v_listing.expires_at <= now() then
    raise exception 'Listing not available' using errcode = 'PT410';
  end if;
  if auth.uid() is not null and auth.uid() = v_listing.owner_id then
    raise exception 'Owners cannot enquire about their own listing' using errcode = 'PT403';
  end if;
  -- The title buyers saw: the current immutable submission, never the
  -- working draft. Phase 9 caps stored titles at 150 characters.
  select left(trim(s.title), 150) into v_title from public.property_listing_submissions s
    where s.id = v_listing.current_submission_id and s.listing_id = v_listing.id;
  if v_title is null or v_title = '' then
    raise exception 'Listing not available' using errcode = 'PT410';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_listing::text || ':' || p_phone, 0));
  -- The same limits as Phase 9; the per-number daily limit is shared across
  -- demo and real listings.
  if (select count(*) from public.enquiries where buyer_phone = p_phone
      and created_at > now() - interval '1 day') >= 20
    or (select count(*) from public.enquiries where buyer_phone = p_phone
      and listing_id = p_listing and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Too many recent enquiries' using errcode = 'PT429';
  end if;
  select e.id into v_previous from public.enquiries e
    where e.listing_id = p_listing and e.buyer_phone = p_phone
    order by e.created_at asc limit 1;
  insert into public.enquiries(listing_id, listing_title, buyer_id, seller_id,
    buyer_name, buyer_phone, message, duplicate_of)
    values (p_listing, v_title, auth.uid(), v_listing.owner_id,
      v_name, p_phone, v_message, v_previous)
    returning id into v_enquiry;
  insert into public.lead_events(enquiry_id, actor_id, event_type, status)
    values (v_enquiry, auth.uid(), case when v_previous is null then 'created' else 'repeated' end, 'new');
  insert into public.seller_notifications(seller_id, enquiry_id) values (v_listing.owner_id, v_enquiry);
  return query select v_enquiry, v_previous is not null, true;
end;
$$;
create or replace function private.save_listing_impl(p_listing uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare l public.property_listings; v_user uuid := auth.uid();
begin
 if not private.account_active(auth.uid()) then raise exception 'Account suspended' using errcode='42501';end if;
  if v_user is null then raise exception 'Sign in to save listings' using errcode = 'PT401'; end if;
  select * into l from public.property_listings where id = p_listing for share;
  if not found or l.status <> 'ACTIVE' or l.expires_at <= now() then
    raise exception 'Listing not available' using errcode = 'PT410';
  end if;
  if l.owner_id = v_user then raise exception 'Owners cannot save their own listing' using errcode = 'PT403'; end if;
  if (select count(*) from public.saved_listings where user_id = v_user) >= 500 then
    raise exception 'Too many saved listings' using errcode = 'PT429';
  end if;
  insert into public.saved_listings(user_id, listing_id) values (v_user, p_listing) on conflict do nothing;
  return true;
end $$;
create or replace function private.moderation_decide(p_listing uuid,p_submission uuid,p_version integer,p_action text,p_reason text,p_days integer,p_request uuid)
returns public.moderation_actions language plpgsql security definer set search_path='' as $$
declare l public.property_listings; a public.moderation_actions; reviewer uuid:=auth.uid(); clean_reason text:=nullif(btrim(p_reason),''); decision_status text;
begin
 if not private.account_active(auth.uid()) then raise exception 'Account suspended' using errcode='42501';end if;
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
create or replace function public.submit_property_listing(p_owner uuid,p_draft uuid,p_listing uuid,p_request uuid,p_version integer,p_snapshot jsonb,p_photos jsonb) returns public.property_listings
language plpgsql security invoker set search_path='' as $$
declare l public.property_listings;d public.property_drafts;s public.property_listing_submissions;r public.property_draft_reviews;photo jsonb;old_status text;
begin
 if not private.account_active(p_owner) then raise exception 'Account suspended' using errcode='42501';end if;
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
create or replace function public.change_property_listing(p_owner uuid,p_listing uuid,p_version integer,p_action text) returns public.property_listings
language plpgsql security invoker set search_path='' as $$
declare l public.property_listings;next_status text;old_status text;
begin
 if not private.account_active(p_owner) then raise exception 'Account suspended' using errcode='42501';end if;
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
create or replace function public.create_property_description_job(p_owner uuid,p_draft uuid,p_revision integer,p_hash text,p_model text,p_facts jsonb)
returns setof public.property_description_jobs language plpgsql security invoker set search_path = '' as $$
declare j public.property_description_jobs; d public.property_drafts;
begin
 if not private.account_active(p_owner) then raise exception 'Account suspended' using errcode='42501';end if;
  -- Serialize quota reservations and duplicate requests in one transaction.
  perform pg_advisory_xact_lock(19614301);
  select * into d from public.property_drafts where id=p_draft and owner_id=p_owner for share;
  if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
  if d.revision <> p_revision then raise exception 'STALE_DRAFT'; end if;
  select * into j from public.property_description_jobs where draft_id=p_draft and content_hash=p_hash and model=p_model;
  if found then return next j; return; end if;
  if (select count(*) from public.property_description_jobs where owner_id=p_owner and created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC') >= 5
    or (select count(*) from public.property_description_jobs where created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC') >= 100 then
    raise exception 'DAILY_LIMIT';
  end if;
  insert into public.property_description_jobs(owner_id,draft_id,draft_revision,content_hash,model,facts)
    values(p_owner,p_draft,p_revision,p_hash,p_model,p_facts) returning * into j;
  return next j;
end $$;
create or replace function private.seller_listing_save_counts_impl() returns table(listing_id uuid, saves integer)
language sql stable security definer set search_path = '' as $$
  select s.listing_id, count(*)::integer from public.saved_listings s
  join public.property_listings l on l.id = s.listing_id
  where private.account_active(auth.uid()) and l.owner_id = (select auth.uid())
  group by s.listing_id;
$$;
