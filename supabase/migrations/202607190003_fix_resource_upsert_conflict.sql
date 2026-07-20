begin;

-- PostgREST cannot infer ON CONFLICT (source, external_id) from the
-- previous partial index. PostgreSQL unique indexes already allow
-- multiple null values, so the predicate is unnecessary.
drop index if exists public.resources_source_external_uidx;
create unique index resources_source_external_uidx
  on public.resources (source, external_id);

commit;
