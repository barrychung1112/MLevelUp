alter table public.profiles
  add column if not exists challenge_accepted_at timestamptz;

update public.profiles
set challenge_accepted_at = coalesce(challenge_accepted_at, updated_at, now())
where onboarding_completed = true;

alter table public.quests
  add column if not exists purpose text not null default 'training';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quests_purpose_check'
      and conrelid = 'public.quests'::regclass
  ) then
    alter table public.quests
      add constraint quests_purpose_check
      check (purpose in ('calibration', 'training'));
  end if;
end
$$;

insert into public.quests (
  id,
  training_contract,
  purpose,
  title,
  summary,
  instructions,
  quest_type,
  difficulty,
  estimated_minutes,
  base_xp,
  optional,
  acceptance_criteria,
  evidence_requirements,
  reflection_min_chars,
  skill_weights,
  expected_artifact_type,
  resource_ids
) values (
  'quest-courage-challenge',
  'intensive',
  'calibration',
  '挑戰的勇氣',
  '用一份真實成果證明你願意踏上成長之路。',
  '檢查小型表格資料、建立可重現 baseline、說明 validation 方法與指標，並記錄完成與未完成的部分。',
  'modelExperiment',
  4,
  90,
  120,
  false,
  '["指出至少一項資料品質問題","建立 baseline 並回報 validation 指標","說明完成、未完成與下一步"]'::jsonb,
  '[{"id":"artifact","type":"githubCommit","required":true},{"id":"metric","type":"metricResult","required":true},{"id":"reflection","type":"writtenReflection","required":true}]'::jsonb,
  80,
  '{"dataHandling":0.2,"modeling":0.25,"evaluation":0.2,"engineering":0.15,"researchSense":0,"productThinking":0,"communication":0.2}'::jsonb,
  'githubRepository',
  array['resource-baseline', 'resource-validation']
)
on conflict (id) do update set
  purpose = excluded.purpose,
  title = excluded.title,
  summary = excluded.summary,
  instructions = excluded.instructions,
  difficulty = excluded.difficulty,
  estimated_minutes = excluded.estimated_minutes,
  acceptance_criteria = excluded.acceptance_criteria,
  evidence_requirements = excluded.evidence_requirements,
  reflection_min_chars = excluded.reflection_min_chars,
  skill_weights = excluded.skill_weights,
  expected_artifact_type = excluded.expected_artifact_type,
  resource_ids = excluded.resource_ids,
  updated_at = now();
