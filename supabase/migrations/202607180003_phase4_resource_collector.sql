begin;

alter table public.resources
  add column if not exists canonical_url text,
  add column if not exists source text,
  add column if not exists external_id text,
  add column if not exists content_fingerprint text,
  add column if not exists quality_score integer not null default 0,
  add column if not exists task_fit integer not null default 0,
  add column if not exists published_at timestamptz,
  add column if not exists updated_at timestamptz,
  add column if not exists ingested_at timestamptz,
  add column if not exists metadata_version text;

alter table public.resources drop constraint if exists resources_availability_status_check;
alter table public.resources
  add constraint resources_availability_status_check
  check (availability_status in ('available', 'unavailable', 'unchecked', 'stale', 'manual_review'));

alter table public.resources drop constraint if exists resources_source_check;
alter table public.resources
  add constraint resources_source_check
  check (source is null or source in ('github', 'arxiv', 'official', 'manual'));

alter table public.resources drop constraint if exists resources_quality_score_check;
alter table public.resources
  add constraint resources_quality_score_check
  check (quality_score between 0 and 100 and task_fit between 0 and 100);

create unique index if not exists resources_source_external_uidx
  on public.resources (source, external_id)
  where external_id is not null;
create unique index if not exists resources_canonical_url_uidx
  on public.resources (canonical_url)
  where canonical_url is not null;

create table if not exists public.resource_collection_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  source text not null,
  status text not null check (status in ('running', 'completed', 'degraded', 'failed')),
  candidate_count integer not null default 0 check (candidate_count >= 0),
  inserted_count integer not null default 0 check (inserted_count >= 0),
  updated_count integer not null default 0 check (updated_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  rejected_count integer not null default 0 check (rejected_count >= 0),
  model text,
  prompt_version text,
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  error_code text,
  trace_id text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.resource_collection_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.resource_collection_runs(id) on delete cascade,
  source text not null,
  external_id text,
  canonical_url text,
  resource_id text references public.resources(id) on delete set null,
  disposition text not null check (disposition in ('inserted', 'updated', 'duplicate', 'rejected', 'unavailable', 'fallback')),
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists resource_collection_runs_started_idx
  on public.resource_collection_runs (started_at desc);
create index if not exists resource_collection_items_run_idx
  on public.resource_collection_items (run_id, created_at);

alter table public.resource_collection_runs enable row level security;
alter table public.resource_collection_items enable row level security;

drop policy if exists "resources_write_service_only" on public.resources;
create policy "resources_write_service_only"
  on public.resources for all to service_role
  using (true) with check (true);

create policy "resource_collection_runs_service_only"
  on public.resource_collection_runs for all to service_role
  using (true) with check (true);
create policy "resource_collection_items_service_only"
  on public.resource_collection_items for all to service_role
  using (true) with check (true);

commit;
