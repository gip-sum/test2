create index enquiries_duplicate_parent_idx on public.enquiries (duplicate_of) where duplicate_of is not null;
create index lead_events_actor_idx on public.lead_events (actor_id) where actor_id is not null;
create index seller_notifications_enquiry_idx on public.seller_notifications (enquiry_id);
