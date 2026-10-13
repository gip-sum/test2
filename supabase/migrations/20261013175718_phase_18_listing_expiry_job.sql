create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
select cron.schedule('gharbazaar-expire-listings', '0 * * * *', 'select public.expire_property_listings();');
