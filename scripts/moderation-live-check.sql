-- Trusted SQL-operator verification only. Synthetic records; always rolled back.
begin;
do $$
declare seller uuid:=gen_random_uuid(); reviewer uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid();
 d uuid; l uuid; s uuid; photo uuid; copies uuid[]:='{}'; listings uuid[]:='{}'; a jsonb; before_count integer;
begin
 select count(*) into before_count from public.moderation_actions;
 insert into auth.users(id) values(seller),(reviewer),(outsider);
 insert into public.staff_members(user_id,role) values(reviewer,'MODERATOR');
 for n in 1..3 loop
  d:=gen_random_uuid();l:=gen_random_uuid();s:=gen_random_uuid();photo:=gen_random_uuid();
  insert into public.property_drafts(id,owner_id,collection_id,page_path) values(d,seller,gen_random_uuid(),'/post');
  insert into public.property_draft_reviews(draft_id,owner_id,draft_revision,content_hash) values(d,seller,1,repeat('a',64));
  insert into public.property_listings(id,owner_id,draft_id) values(l,seller,d);
  insert into public.property_listing_submissions(id,listing_id,draft_revision,preview_hash,title,seller_name,seller_type,intent,property_type,bedrooms,bathrooms,area_unit,carpet_area,furnishing,total_floors,construction_status,city_name,locality_name,city_id,locality_id,address,price,maintenance_status,negotiable)
  values(s,l,1,repeat('a',64),'SAMPLE rollback-only listing','SAMPLE seller','OWNER','buy','APARTMENT',2,2,'sqft',1000,'UNFURNISHED',8,'READY','Kolkata','New Town','kolkata','new-town','SAMPLE rollback-only address',6000000,'none',true);
  update public.property_listings set current_submission_id=s,status='UNDER_REVIEW',version=1 where id=l;
  insert into public.property_listing_photos(submission_id,id,source_id,object_path,position,width,height,bytes,sha256)
   values(s,photo,photo,s::text||'/'||photo::text||'.jpg',0,640,480,1000,repeat('a',64));
  copies:=array_append(copies,s);listings:=array_append(listings,l);
 end loop;
 perform set_config('request.jwt.claim.sub',outsider::text,true);
 execute 'set local role authenticated';
 begin perform public.moderation_review(listings[1]);raise exception 'Nonstaff review was allowed';exception when insufficient_privilege then null;end;
 begin perform public.moderation_decide(listings[1],copies[1],1,'APPROVE',null,90,gen_random_uuid());raise exception 'Nonstaff decision was allowed';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',reviewer::text,true);
 if public.my_staff_role()<>'MODERATOR' then raise exception 'Moderator role missing';end if;
 begin perform public.admin_overview();raise exception 'Moderator admin access was allowed';exception when insufficient_privilege then null;end;
 a:=public.moderation_decide(listings[1],copies[1],1,'APPROVE',null,90,gen_random_uuid());
 if a->>'actor_id'<>reviewer::text or (a->>'version_after')::integer<>2 then raise exception 'Approval provenance failed';end if;
 if public.moderation_decide(listings[1],copies[1],1,'APPROVE',null,90,(a->>'id')::uuid)<>a then raise exception 'Retry was not idempotent';end if;
 begin perform public.moderation_decide(listings[1],copies[1],1,'REJECT','SAMPLE valid reason',null,gen_random_uuid());raise exception 'Stale decision allowed';exception when serialization_failure then null;end;
 perform public.moderation_decide(listings[2],copies[2],1,'REJECT','SAMPLE unclear photos',null,gen_random_uuid());
 perform public.moderation_decide(listings[3],copies[3],1,'REQUEST_CORRECTION','SAMPLE replace unclear photos',null,gen_random_uuid());
 if public.moderation_review(listings[3])->'listing'->>'status'<>'CHANGES_REQUESTED' then raise exception 'Correction state failed';end if;
 perform set_config('request.jwt.claim.sub',seller::text,true);
 if (select count(*) from public.moderation_actions where listing_id=any(listings))<>3 then raise exception 'Owner audit read failed';end if;
 if exists(select 1 from public.property_draft_reviews r join public.property_listings p on p.draft_id=r.draft_id where p.id=listings[3]) then raise exception 'Old preview confirmation retained';end if;
 begin delete from public.moderation_actions where listing_id=listings[3];raise exception 'Owner deleted audit';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',outsider::text,true);
 if exists(select 1 from public.moderation_actions where listing_id=any(listings)) then raise exception 'Foreign audit leaked';end if;
 execute 'reset role';
 update public.staff_members set revoked_at=now() where user_id=reviewer;
 perform set_config('request.jwt.claim.sub',reviewer::text,true);execute 'set local role authenticated';
 begin perform public.moderation_review(listings[3]);raise exception 'Revoked review was allowed';exception when insufficient_privilege then null;end;
 execute 'reset role';
 if (select count(*) from public.moderation_actions)<>before_count+3 then raise exception 'Audit count mismatch';end if;
end $$;
rollback;
select jsonb_build_object('rollback_only_checks','passed','active_staff_accounts',(select count(*) from public.staff_members where revoked_at is null)) as verification;
