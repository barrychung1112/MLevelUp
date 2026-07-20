begin;

alter table public.resource_collection_runs
  add column if not exists fallback_count integer not null default 0 check (fallback_count >= 0),
  add column if not exists unavailable_count integer not null default 0 check (unavailable_count >= 0),
  add column if not exists unchecked_count integer not null default 0 check (unchecked_count >= 0);

create or replace function public.get_latest_resource_collector_status()
returns table (
  status text,
  candidate_count integer,
  inserted_count integer,
  updated_count integer,
  duplicate_count integer,
  rejected_count integer,
  fallback_count integer,
  unavailable_count integer,
  unchecked_count integer,
  model text,
  prompt_version text,
  error_code text,
  started_at timestamptz,
  completed_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    runs.status,
    runs.candidate_count,
    runs.inserted_count,
    runs.updated_count,
    runs.duplicate_count,
    runs.rejected_count,
    runs.fallback_count,
    runs.unavailable_count,
    runs.unchecked_count,
    runs.model,
    runs.prompt_version,
    runs.error_code,
    runs.started_at,
    runs.completed_at
  from public.resource_collection_runs as runs
  order by runs.started_at desc
  limit 1
$$;

revoke all on function public.get_latest_resource_collector_status() from public;
grant execute on function public.get_latest_resource_collector_status() to authenticated;

commit;
