-- Privileged mutations live outside the exposed API schema. Public entry
-- points are invoker functions with strictly scoped arguments.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

alter function public.submit_enquiry(text,text,text,text,text) set schema private;
alter function private.submit_enquiry(text,text,text,text,text) rename to submit_enquiry_impl;
revoke all on function private.submit_enquiry_impl(text,text,text,text,text) from public, anon, authenticated;
grant execute on function private.submit_enquiry_impl(text,text,text,text,text) to anon, authenticated;
create function public.submit_enquiry(
  p_listing_public_id text, p_listing_title text, p_name text,
  p_phone text, p_message text default null
) returns table(enquiry_id uuid, repeated boolean, seller_notified boolean)
language sql security invoker set search_path = '' as $$
  select * from private.submit_enquiry_impl($1,$2,$3,$4,$5);
$$;
revoke all on function public.submit_enquiry(text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_enquiry(text,text,text,text,text) to anon, authenticated;

alter function public.update_lead_status(uuid,text) set schema private;
alter function private.update_lead_status(uuid,text) rename to update_lead_status_impl;
revoke all on function private.update_lead_status_impl(uuid,text) from public, anon, authenticated;
grant execute on function private.update_lead_status_impl(uuid,text) to authenticated;
create function public.update_lead_status(p_enquiry_id uuid, p_status text)
returns boolean language sql security invoker set search_path = '' as $$
  select private.update_lead_status_impl($1,$2);
$$;
revoke all on function public.update_lead_status(uuid,text) from public, anon, authenticated;
grant execute on function public.update_lead_status(uuid,text) to authenticated;
