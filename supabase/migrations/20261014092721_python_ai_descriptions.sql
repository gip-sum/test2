-- Optional prose belongs to the reviewed draft and immutable submitted copy.
alter table public.property_drafts add column description text
  check (description is null or (char_length(description) <= 2000 and description !~ '[[:cntrl:]]'));
alter table public.property_listing_submissions add column description text
  check (description is null or (char_length(description) <= 2000 and description !~ '[[:cntrl:]]'));
grant select(description) on public.property_listing_submissions to anon;

create table public.property_description_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  draft_id uuid not null references public.property_drafts(id) on delete cascade,
  draft_revision integer not null check (draft_revision > 0),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  model text not null check (model ~ '^[a-z0-9_-]+/[a-zA-Z0-9._:-]+$' and char_length(model) <= 120),
  facts jsonb not null check (jsonb_typeof(facts) = 'object' and octet_length(facts::text) <= 4000),
  status text not null default 'QUEUED' check (status in ('QUEUED','RUNNING','SUCCEEDED','FAILED')),
  dispatched boolean not null default false,
  attempts integer not null default 0 check (attempts between 0 and 3),
  lease_token uuid,
  lease_until timestamptz,
  result text check (result is null or (char_length(result) between 1 and 2000 and result !~ '[[:cntrl:]]')),
  error_code text check (error_code in ('PROVIDER_UNAVAILABLE','PROVIDER_REJECTED','INVALID_OUTPUT','CONFIGURATION','EXPIRED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (draft_id, content_hash, model)
);
create index property_description_jobs_owner_created on public.property_description_jobs(owner_id, created_at desc);
create index property_description_jobs_created on public.property_description_jobs(created_at);
alter table public.property_description_jobs enable row level security;
create policy description_job_owner_read on public.property_description_jobs
  for select to authenticated using (owner_id = (select auth.uid()));
revoke all on public.property_description_jobs from anon, authenticated;
grant select(id,owner_id,draft_id,draft_revision,status,dispatched,attempts,result,error_code,created_at,updated_at)
  on public.property_description_jobs to authenticated;
grant select,insert,update on public.property_description_jobs to service_role;

create function public.create_property_description_job(p_owner uuid,p_draft uuid,p_revision integer,p_hash text,p_model text,p_facts jsonb)
returns setof public.property_description_jobs language plpgsql security invoker set search_path = '' as $$
declare j public.property_description_jobs; d public.property_drafts;
begin
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

create function public.dispatch_property_description_job(p_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.property_description_jobs set dispatched=true,updated_at=now() where id=p_id;
  return found;
end $$;

create function public.claim_property_description_job(p_id uuid)
returns setof public.property_description_jobs language plpgsql security invoker set search_path = '' as $$
declare j public.property_description_jobs;
begin
  select * into j from public.property_description_jobs where id=p_id for update;
  if not found or j.status in ('SUCCEEDED','FAILED') then return; end if;
  if j.created_at < now()-interval '1 hour' or j.attempts >= 3 then
    -- A live third attempt must be allowed to finish before expiring it.
    if j.status='RUNNING' and j.lease_until > now() then return; end if;
    update public.property_description_jobs set status='FAILED',error_code='EXPIRED',lease_token=null,lease_until=null,updated_at=now() where id=p_id;
    return;
  end if;
  if j.status='RUNNING' and j.lease_until > now() then return; end if;
  update public.property_description_jobs set status='RUNNING',dispatched=true,attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',error_code=null,updated_at=now()
    where id=p_id returning * into j;
  return next j;
end $$;

create function public.finish_property_description_job(p_id uuid,p_lease uuid,p_result text,p_error text,p_retry boolean default false)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if (p_result is null) = (p_error is null) then raise exception 'INVALID_OUTCOME'; end if;
  update public.property_description_jobs set
    status=case when p_result is not null then 'SUCCEEDED' when p_retry and attempts < 3 then 'QUEUED' else 'FAILED' end,
    result=p_result,error_code=p_error,lease_token=null,lease_until=null,updated_at=now()
    where id=p_id and status='RUNNING' and lease_token=p_lease and lease_until > now();
  return found;
end $$;

revoke all on function public.create_property_description_job(uuid,uuid,integer,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.claim_property_description_job(uuid) from public,anon,authenticated;
revoke all on function public.dispatch_property_description_job(uuid) from public,anon,authenticated;
revoke all on function public.finish_property_description_job(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.create_property_description_job(uuid,uuid,integer,text,text,jsonb) to service_role;
grant execute on function public.claim_property_description_job(uuid) to service_role;
grant execute on function public.dispatch_property_description_job(uuid) to service_role;
grant execute on function public.finish_property_description_job(uuid,uuid,text,text,boolean) to service_role;
