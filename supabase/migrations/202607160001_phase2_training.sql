create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  goal text not null default '',
  contract text not null default 'standard' check (contract in ('foundation', 'standard', 'intensive')),
  weekly_minutes integer not null default 600 check (weekly_minutes >= 0),
  timezone text not null default 'America/Los_Angeles',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  level integer not null default 1 check (level >= 1),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_qualified_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skill_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_key text not null check (skill_key in (
    'dataHandling',
    'modeling',
    'evaluation',
    'engineering',
    'researchSense',
    'productThinking',
    'communication'
  )),
  score numeric not null default 20 check (score >= 0),
  skill_xp integer not null default 0 check (skill_xp >= 0),
  last_delta numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_key)
);

create table if not exists public.quests (
  id text primary key,
  training_contract text not null check (training_contract in ('foundation', 'standard', 'intensive')),
  title text not null,
  summary text not null,
  instructions text not null,
  quest_type text not null,
  difficulty integer not null check (difficulty between 1 and 5),
  estimated_minutes integer not null check (estimated_minutes > 0),
  base_xp integer not null check (base_xp >= 0),
  optional boolean not null default false,
  acceptance_criteria jsonb not null default '[]'::jsonb,
  evidence_requirements jsonb not null default '[]'::jsonb,
  reflection_min_chars integer not null default 40,
  skill_weights jsonb not null default '{}'::jsonb,
  expected_artifact_type text,
  resource_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quest_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text not null references public.quests(id),
  assigned_date date not null,
  slot text not null check (slot in ('primary', 'secondary', 'optional')),
  status text not null default 'assigned' check (status in (
    'assigned',
    'in_progress',
    'submitted',
    'reviewing',
    'needs_revision',
    'completed',
    'rejected',
    'skipped',
    'expired'
  )),
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  latest_submission_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.quest_assignments(id) on delete cascade,
  idempotency_key text not null,
  revision_no integer not null default 1 check (revision_no >= 1),
  evidence jsonb not null default '[]'::jsonb,
  self_reflection text not null default '',
  verification_status text not null default 'pending' check (verification_status in ('pending', 'needs_revision', 'verified', 'rejected')),
  verification_method text check (verification_method in ('mock', 'manual', 'automatic')),
  quality_score integer not null default 0 check (quality_score between 0 and 100),
  score_breakdown jsonb not null default '{}'::jsonb,
  hard_failures jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete cascade,
  kind text not null check (kind in ('submission', 'daily')),
  summary text not null,
  strengths jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  score_breakdown jsonb,
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  skill_deltas jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.resources (
  id text primary key,
  title text not null,
  summary text not null,
  url text not null,
  resource_type text not null check (resource_type in ('article', 'competition', 'repository', 'paper', 'course')),
  difficulty integer not null check (difficulty between 1 and 5),
  estimated_minutes integer not null check (estimated_minutes > 0),
  skill_tags text[] not null default '{}',
  relevance integer not null default 0 check (relevance between 0 and 100),
  freshness integer not null default 0 check (freshness between 0 and 100),
  credibility integer not null default 0 check (credibility between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete set null,
  assignment_id uuid references public.quest_assignments(id) on delete set null,
  artifact_type text not null,
  title text not null,
  description text not null default '',
  artifact_url text,
  skill_tags text[] not null default '{}',
  quality_score integer not null default 0 check (quality_score between 0 and 100),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'needs_revision', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  agent_type text not null check (agent_type in ('coordinator', 'learningStrategist', 'resourceCollector', 'adjuster')),
  status text not null default 'idle' check (status in ('idle', 'running', 'completed', 'degraded')),
  summary text not null default '',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  is_mock boolean not null default true,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.quest_assignments
  add constraint quest_assignments_latest_submission_fk
  foreign key (latest_submission_id) references public.submissions(id)
  deferrable initially deferred;

alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.skill_stats enable row level security;
alter table public.quests enable row level security;
alter table public.quest_assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.feedback enable row level security;
alter table public.resources enable row level security;
alter table public.portfolio_artifacts enable row level security;
alter table public.agent_runs enable row level security;

create policy "authenticated catalog read quests"
  on public.quests for select
  to authenticated using (true);

create policy "authenticated catalog read resources"
  on public.resources for select
  to authenticated using (true);

create policy "users manage own profiles"
  on public.profiles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own progress"
  on public.user_progress for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own skill stats"
  on public.skill_stats for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own quest assignments"
  on public.quest_assignments for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own submissions"
  on public.submissions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own feedback"
  on public.feedback for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own portfolio artifacts"
  on public.portfolio_artifacts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own agent runs"
  on public.agent_runs for all
  to authenticated
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

insert into public.resources (
  id,
  title,
  summary,
  url,
  resource_type,
  difficulty,
  estimated_minutes,
  skill_tags,
  relevance,
  freshness,
  credibility
) values
  ('resource-eda', 'Practical exploratory data analysis', 'A compact checklist for finding data-quality risks.', 'https://example.com/resources/eda', 'article', 1, 15, array['dataHandling'], 90, 82, 84),
  ('resource-validation', 'Validation strategies', 'Choose a split that matches the product decision.', 'https://example.com/resources/validation', 'article', 2, 20, array['evaluation'], 94, 78, 91),
  ('resource-baseline', 'Reproducible baselines', 'Turn the first model into a trustworthy experiment.', 'https://example.com/resources/baseline', 'repository', 3, 25, array['modeling', 'engineering'], 96, 86, 89),
  ('resource-evaluation', 'Model error analysis', 'Move from one metric to actionable error slices.', 'https://example.com/resources/error-analysis', 'article', 3, 30, array['evaluation', 'communication'], 93, 85, 88),
  ('resource-deployment', 'Model API deployment', 'Package inference behind a production-minded API.', 'https://example.com/resources/deployment', 'course', 4, 45, array['engineering', 'productThinking'], 91, 90, 87),
  ('resource-mlops', 'ML system design patterns', 'Design data, training, serving, and monitoring boundaries.', 'https://example.com/resources/mlops', 'paper', 5, 40, array['engineering', 'researchSense'], 89, 80, 92)
on conflict (id) do update set
  title = excluded.title,
  summary = excluded.summary,
  url = excluded.url,
  resource_type = excluded.resource_type,
  difficulty = excluded.difficulty,
  estimated_minutes = excluded.estimated_minutes,
  skill_tags = excluded.skill_tags,
  relevance = excluded.relevance,
  freshness = excluded.freshness,
  credibility = excluded.credibility,
  updated_at = now();

insert into public.quests (
  id,
  training_contract,
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
) values
  ('quest-foundation-eda', 'foundation', 'Inspect a small dataset', 'Find one data-quality issue and report a metric.', 'Inspect missing values, distributions, and one target relationship.', 'dataPractice', 1, 30, 17, false, '["Report one concrete data-quality observation"]', '[{"id":"metric","type":"metricResult","required":true}]', 40, '{"dataHandling":0.6,"modeling":0,"evaluation":0.1,"engineering":0.1,"researchSense":0,"productThinking":0.1,"communication":0.1}', null, array['resource-eda']),
  ('quest-foundation-note', 'foundation', 'Write a validation note', 'Explain why train and validation data must stay separate.', 'Write a concise explanation with one leakage example.', 'communicationExercise', 1, 15, 15, true, '["Include one leakage example"]', '[{"id":"note","type":"writtenReflection","required":true}]', 40, '{"dataHandling":0.1,"modeling":0,"evaluation":0.3,"engineering":0,"researchSense":0.1,"productThinking":0.1,"communication":0.4}', 'technicalWriteup', array['resource-validation']),
  ('quest-standard-baseline', 'standard', 'Ship a reproducible baseline', 'Train a baseline, document validation, and commit the experiment.', 'Create one reproducible training run and commit the result.', 'modelExperiment', 3, 70, 70, false, '["Commit code for a reproducible baseline"]', '[{"id":"commit","type":"githubCommit","required":true}]', 40, '{"dataHandling":0.1,"modeling":0.4,"evaluation":0.2,"engineering":0.2,"researchSense":0,"productThinking":0,"communication":0.1}', 'githubRepository', array['resource-baseline']),
  ('quest-standard-report', 'standard', 'Package an evaluation report', 'Turn experiment results into a concise model evaluation report.', 'Include the metric, one error slice, and a next experiment.', 'evaluationPractice', 2, 30, 23, true, '["Include metric, error slice, and next step"]', '[{"id":"report","type":"modelEvaluationReport","required":true}]', 40, '{"dataHandling":0.05,"modeling":0.1,"evaluation":0.45,"engineering":0.05,"researchSense":0.05,"productThinking":0.1,"communication":0.2}', 'modelEvaluationReport', array['resource-evaluation']),
  ('quest-intensive-deploy', 'intensive', 'Deploy a model inference service', 'Package a model behind an API and expose a working demo.', 'Build, validate, and deploy one inference endpoint.', 'engineeringBuild', 4, 120, 150, false, '["Expose one working HTTPS inference endpoint"]', '[{"id":"deployment","type":"deployedApp","required":true}]', 80, '{"dataHandling":0.05,"modeling":0.15,"evaluation":0.1,"engineering":0.45,"researchSense":0,"productThinking":0.15,"communication":0.1}', 'deployedDemo', array['resource-deployment']),
  ('quest-intensive-design', 'intensive', 'Design a production ML pipeline', 'Document data, training, deployment, and monitoring boundaries.', 'Write a system design note with failure and rollback paths.', 'engineeringBuild', 5, 75, 113, true, '["Cover monitoring and rollback"]', '[{"id":"design","type":"systemDesignNote","required":true}]', 80, '{"dataHandling":0.1,"modeling":0.1,"evaluation":0.1,"engineering":0.3,"researchSense":0.1,"productThinking":0.2,"communication":0.1}', 'systemDesignNote', array['resource-mlops'])
on conflict (id) do update set
  training_contract = excluded.training_contract,
  title = excluded.title,
  summary = excluded.summary,
  instructions = excluded.instructions,
  quest_type = excluded.quest_type,
  difficulty = excluded.difficulty,
  estimated_minutes = excluded.estimated_minutes,
  base_xp = excluded.base_xp,
  optional = excluded.optional,
  acceptance_criteria = excluded.acceptance_criteria,
  evidence_requirements = excluded.evidence_requirements,
  reflection_min_chars = excluded.reflection_min_chars,
  skill_weights = excluded.skill_weights,
  expected_artifact_type = excluded.expected_artifact_type,
  resource_ids = excluded.resource_ids,
  updated_at = now();
