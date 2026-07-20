begin;

create table public.artifact_link_verifications (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.portfolio_artifacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('github', 'kaggle')),
  resource_type text not null
    check (resource_type in ('repository', 'commit', 'notebook', 'competition')),
  normalized_url text not null check (normalized_url ~ '^https://'),
  external_id text not null check (char_length(external_id) between 1 and 240),
  status text not null
    check (status in ('verified', 'unavailable', 'unsupported', 'error', 'stale')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  error_code text check (error_code is null or char_length(error_code) <= 80),
  verified_at timestamptz,
  stale_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artifact_id, normalized_url),
  check (
    (provider = 'github' and resource_type in ('repository', 'commit'))
    or (provider = 'kaggle' and resource_type in ('notebook', 'competition'))
  ),
  check (
    (status = 'verified' and verified_at is not null and stale_after > verified_at)
    or (status <> 'verified' and verified_at is null and stale_after is null)
  )
);

create index artifact_link_verifications_user_artifact_idx
  on public.artifact_link_verifications (user_id, artifact_id);

create table public.artifact_achievement_drafts (
  artifact_id uuid primary key references public.portfolio_artifacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  bullets jsonb not null default '[]'::jsonb
    check (jsonb_typeof(bullets) = 'array')
    check (jsonb_array_length(bullets) <= 5),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'outdated')),
  source_fingerprint text not null check (char_length(source_fingerprint) = 64),
  model text not null check (char_length(model) between 1 and 120),
  prompt_version text not null check (char_length(prompt_version) between 1 and 120),
  generated_at timestamptz not null default now(),
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    (status = 'approved' and approved_at is not null and jsonb_array_length(bullets) between 3 and 5)
    or (status <> 'approved' and approved_at is null)
  )
);

create index artifact_achievement_drafts_user_idx
  on public.artifact_achievement_drafts (user_id, updated_at desc);

alter table public.published_artifacts
  add column key_achievements text[] not null default '{}',
  add column link_existence_verified boolean not null default false,
  add column verification_provider text
    check (verification_provider is null or verification_provider in ('github', 'kaggle')),
  add column verification_resource_type text
    check (
      verification_resource_type is null
      or verification_resource_type in ('repository', 'commit', 'notebook', 'competition')
    ),
  add column link_verified_at timestamptz,
  add column verification_stale_after timestamptz;

alter table public.artifact_link_verifications enable row level security;
alter table public.artifact_achievement_drafts enable row level security;

create policy "owners read own artifact link verifications"
  on public.artifact_link_verifications
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "owners read own artifact achievement drafts"
  on public.artifact_achievement_drafts
  for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.artifact_link_verifications, public.artifact_achievement_drafts to authenticated;
revoke insert, update, delete on public.artifact_link_verifications, public.artifact_achievement_drafts from anon, authenticated;
revoke all on public.artifact_link_verifications, public.artifact_achievement_drafts from anon;

create or replace function public.validate_phase54_artifact_owner()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
      from public.portfolio_artifacts a
     where a.id = new.artifact_id
       and a.user_id = new.user_id
  ) then
    raise exception 'portfolio_artifact_not_found';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger artifact_link_verifications_validate_owner
before insert or update on public.artifact_link_verifications
for each row execute function public.validate_phase54_artifact_owner();

create trigger artifact_achievement_drafts_validate_owner
before insert or update on public.artifact_achievement_drafts
for each row execute function public.validate_phase54_artifact_owner();

create or replace function public.refresh_phase54_public_artifact(
  p_artifact_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_achievements text[] := '{}';
  v_verification public.artifact_link_verifications%rowtype;
begin
  select coalesce(array_agg(item->>'text' order by ordinal), '{}')
    into v_achievements
    from public.artifact_achievement_drafts d
    cross join lateral jsonb_array_elements(d.bullets)
      with ordinality as bullet(item, ordinal)
   where d.artifact_id = p_artifact_id
     and d.user_id = p_user_id
     and d.status = 'approved';

  select *
    into v_verification
    from public.artifact_link_verifications v
   where v.artifact_id = p_artifact_id
     and v.user_id = p_user_id
     and v.status = 'verified'
     and v.stale_after > now()
   order by v.verified_at desc
   limit 1;

  update public.published_artifacts
     set key_achievements = v_achievements,
         link_existence_verified = found,
         verification_provider = case when found then v_verification.provider else null end,
         verification_resource_type = case when found then v_verification.resource_type else null end,
         link_verified_at = case when found then v_verification.verified_at else null end,
         verification_stale_after = case when found then v_verification.stale_after else null end,
         updated_at = now()
   where artifact_id = p_artifact_id
     and user_id = p_user_id;
end;
$$;

create or replace function public.sync_phase54_public_artifact()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.refresh_phase54_public_artifact(
    coalesce(new.artifact_id, old.artifact_id),
    coalesce(new.user_id, old.user_id)
  );
  return coalesce(new, old);
end;
$$;

create trigger artifact_link_verifications_sync_public
after insert or update or delete on public.artifact_link_verifications
for each row execute function public.sync_phase54_public_artifact();

create trigger artifact_achievement_drafts_sync_public
after insert or update or delete on public.artifact_achievement_drafts
for each row execute function public.sync_phase54_public_artifact();

create or replace function public.hydrate_phase54_public_artifact()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.refresh_phase54_public_artifact(new.artifact_id, new.user_id);
  return new;
end;
$$;

create trigger published_artifacts_hydrate_phase54
after insert on public.published_artifacts
for each row execute function public.hydrate_phase54_public_artifact();

revoke all on function public.refresh_phase54_public_artifact(uuid, uuid) from public, anon, authenticated;
revoke all on function public.sync_phase54_public_artifact() from public, anon, authenticated;
revoke all on function public.hydrate_phase54_public_artifact() from public, anon, authenticated;

commit;
