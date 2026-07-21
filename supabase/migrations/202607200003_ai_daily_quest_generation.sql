alter table public.quests
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists source text not null default 'catalog',
  add column if not exists generation_trace_id text,
  add column if not exists generation_model text,
  add column if not exists generation_prompt_version text;

update public.quests set source = 'catalog' where source is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quests_source_check') then
    alter table public.quests
      add constraint quests_source_check check (source in ('catalog', 'ai_generated'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quests_owner_source_check') then
    alter table public.quests
      add constraint quests_owner_source_check check (
        (source = 'catalog' and owner_user_id is null)
        or (source = 'ai_generated' and owner_user_id is not null)
      );
  end if;
end $$;

create index if not exists quests_owner_user_idx on public.quests (owner_user_id)
  where owner_user_id is not null;

drop policy if exists "authenticated catalog read quests" on public.quests;
drop policy if exists "authenticated visible quests" on public.quests;
create policy "authenticated visible quests"
  on public.quests for select to authenticated
  using (source = 'catalog' or owner_user_id = auth.uid());

create or replace function public.get_visible_quests(p_user_id uuid)
returns setof public.quests
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'quest_scope_forbidden' using errcode = '42501';
  end if;
  return query
    select q.* from public.quests q
    where q.source = 'catalog' or q.owner_user_id = p_user_id
    order by q.id;
end;
$$;

revoke all on function public.get_visible_quests(uuid) from public;
grant execute on function public.get_visible_quests(uuid) to authenticated, service_role;

create or replace function public.create_generated_daily_quest(
  p_user_id uuid,
  p_quest jsonb,
  p_assignment_id uuid,
  p_assigned_date date,
  p_assigned_at timestamptz,
  p_due_at timestamptz,
  p_generation_key text,
  p_model text,
  p_prompt_version text,
  p_trace_id text
)
returns table (quest_id text, assignment_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_quest_id text := p_quest->>'id';
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'generated_quest_service_only' using errcode = '42501';
  end if;

  insert into public.quests (
    id, training_contract, purpose, title, summary, instructions, quest_type,
    difficulty, estimated_minutes, base_xp, optional, acceptance_criteria,
    evidence_requirements, reflection_min_chars, skill_weights,
    expected_artifact_type, resource_ids, scope, duration_days, execution_steps,
    success_metrics, out_of_scope, owner_user_id, source, generation_trace_id,
    generation_model, generation_prompt_version
  ) values (
    v_quest_id,
    p_quest->>'trainingContract',
    'training',
    p_quest->>'title',
    p_quest->>'summary',
    p_quest->>'instructions',
    p_quest->>'questType',
    (p_quest->>'difficulty')::integer,
    (p_quest->>'estimatedMinutes')::integer,
    (p_quest->>'baseXp')::integer,
    false,
    p_quest->'acceptanceCriteria',
    p_quest->'evidenceRequirements',
    (p_quest->>'reflectionMinChars')::integer,
    p_quest->'skillWeights',
    p_quest->>'expectedArtifactType',
    array(select jsonb_array_elements_text(p_quest->'resourceIds')),
    'daily',
    1,
    p_quest->'executionSteps',
    p_quest->'successMetrics',
    p_quest->'outOfScope',
    p_user_id,
    'ai_generated',
    p_trace_id,
    p_model,
    p_prompt_version
  );

  insert into public.quest_assignments (
    id, user_id, quest_id, assigned_date, slot, status, assigned_at, due_at,
    generation_key, updated_at
  ) values (
    p_assignment_id, p_user_id, v_quest_id, p_assigned_date, 'secondary',
    'assigned', p_assigned_at, p_due_at, p_generation_key, p_assigned_at
  );

  return query select v_quest_id, p_assignment_id;
end;
$$;

revoke all on function public.create_generated_daily_quest(
  uuid, jsonb, uuid, date, timestamptz, timestamptz, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_generated_daily_quest(
  uuid, jsonb, uuid, date, timestamptz, timestamptz, text, text, text, text
) to service_role;
