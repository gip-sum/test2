-- Operator-only acceptance on the real database. Always roll back all fixtures.
-- Set phase23.acceptance_admin to the explicitly authorised existing ADMIN ID
-- before running this script. No real account is changed by these checks.
begin;
do $$
declare admin uuid:=nullif(current_setting('phase23.acceptance_admin',true),'')::uuid;
 subject uuid:=gen_random_uuid(); request uuid:=gen_random_uuid(); result jsonb; detail jsonb;
begin
 if admin is null or not exists(select 1 from public.staff_members where user_id=admin and role='ADMIN' and revoked_at is null)
 then raise exception 'An explicitly designated active ADMIN is required';end if;
 insert into auth.users(id,email) values(subject,'sample-phase23-rollback-'||subject::text||'@example.invalid');
 insert into public.buyer_profiles(id,full_name) values(subject,'SAMPLE Phase 23 rollback-only account');
 perform set_config('request.jwt.claim.sub',subject::text,true);
 execute 'set local role authenticated';
 if public.my_account_access() is distinct from true then raise exception 'New account access failed';end if;
 begin perform public.admin_users();raise exception 'Ordinary account could search users';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',admin::text,true);
 if public.my_staff_role() is distinct from 'ADMIN' then raise exception 'Admin role is not live';end if;
 detail:=public.admin_users(subject::text);
 if (detail->>'total')::integer<>1 then raise exception 'Account search failed';end if;
 detail:=public.admin_user(subject);
 if (detail->'listings'->>'total')::integer<>0 or (detail->'leads'->>'total')::integer<>0
 then raise exception 'Empty history was fabricated';end if;
 result:=public.manage_account(subject,0,'SUSPENDED','AGENT','SAMPLE rollback-only live suspension',request);
 if (result->>'version')::integer<>1 then raise exception 'Version failed';end if;
 if public.manage_account(subject,0,'SUSPENDED','AGENT','SAMPLE rollback-only live suspension',request)<>result
 then raise exception 'Identical retry was not idempotent';end if;
 begin perform public.manage_account(subject,0,'ACTIVE',null,'SAMPLE changed request',request);raise exception 'Changed retry accepted';exception when serialization_failure then null;end;
 begin perform public.manage_account(subject,0,'ACTIVE',null,'SAMPLE stale version',gen_random_uuid());raise exception 'Stale version accepted';exception when serialization_failure then null;end;
 begin perform public.manage_account(admin,0,'SUSPENDED',null,'SAMPLE self change',gen_random_uuid());raise exception 'Self management accepted';exception when insufficient_privilege then null;end;
 detail:=public.admin_user(subject);
 if detail->'account'->>'status'<>'SUSPENDED' or (detail->'changes'->>'total')::integer<>1
 then raise exception 'Suspension and history disagree';end if;
 perform set_config('request.jwt.claim.sub',subject::text,true);
 if public.my_account_access() is distinct from false then raise exception 'Suspension not immediate';end if;
 if exists(select 1 from public.buyer_profiles where id=subject) then raise exception 'Suspended profile leaked';end if;
 begin perform public.save_listing(gen_random_uuid());raise exception 'Suspended save accepted';exception when insufficient_privilege then null;end;
 begin perform public.update_lead_status(gen_random_uuid(),'closed');raise exception 'Suspended lead update accepted';exception when insufficient_privilege then null;end;
 begin delete from public.account_actions where user_id=subject;raise exception 'Audit deletion accepted';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',admin::text,true);
 perform public.manage_account(subject,1,'ACTIVE',null,'SAMPLE rollback-only live restoration',gen_random_uuid());
 perform set_config('request.jwt.claim.sub',subject::text,true);
 if public.my_account_access() is distinct from true then raise exception 'Restoration not immediate';end if;
 if not exists(select 1 from public.buyer_profiles where id=subject) then raise exception 'Restored profile missing';end if;
 execute 'reset role';
 begin update public.account_actions set reason=reason where user_id=subject;raise exception 'Audit edited';exception when raise_exception then if sqlerrm='Audit edited' then raise;end if;end;
 if (select count(*) from public.account_actions where user_id=subject)<>2 then raise exception 'Audit total mismatch';end if;
end $$;
rollback;
select jsonb_build_object('phase23_rollback_only_checks','passed') as verification;
