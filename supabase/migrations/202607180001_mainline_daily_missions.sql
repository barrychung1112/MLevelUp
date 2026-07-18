alter table public.profiles
  add column if not exists target_role text not null default 'machine-learning-engineer',
  add column if not exists daily_minutes integer not null default 300,
  add column if not exists consecutive_failure_days integer not null default 0,
  add column if not exists training_status text not null default 'normal',
  add column if not exists recovery_started_at timestamptz,
  add column if not exists recovery_deadline timestamptz;

update public.profiles
set target_role = 'machine-learning-engineer', daily_minutes = 300;

alter table public.quests
  add column if not exists scope text not null default 'daily',
  add column if not exists duration_days integer not null default 1,
  add column if not exists execution_steps jsonb not null default '[]'::jsonb,
  add column if not exists success_metrics jsonb not null default '[]'::jsonb,
  add column if not exists out_of_scope jsonb not null default '[]'::jsonb;

update public.quests
set scope = case when purpose = 'calibration' then 'calibration' else scope end,
    execution_steps = case when execution_steps = '[]'::jsonb then jsonb_build_array(instructions) else execution_steps end,
    success_metrics = case when success_metrics = '[]'::jsonb then acceptance_criteria else success_metrics end;

alter table public.quest_assignments
  add column if not exists parent_assignment_id uuid,
  add column if not exists checkpoint_index integer,
  add column if not exists due_at timestamptz,
  add column if not exists expired_at timestamptz,
  add column if not exists penalty_source_assignment_id uuid;

alter table public.resources
  add column if not exists prerequisites text[] not null default '{}',
  add column if not exists required_tools text[] not null default '{}',
  add column if not exists cost_tier text not null default 'free',
  add column if not exists availability_status text not null default 'unchecked',
  add column if not exists last_checked_at timestamptz,
  add column if not exists fallback_resource_id text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_target_role_check') then
    alter table public.profiles add constraint profiles_target_role_check check (target_role = 'machine-learning-engineer');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_daily_minutes_check') then
    alter table public.profiles add constraint profiles_daily_minutes_check check (daily_minutes = 300);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_training_status_check') then
    alter table public.profiles add constraint profiles_training_status_check check (training_status in ('normal', 'failure_review', 'recovery'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quests_scope_check') then
    alter table public.quests add constraint quests_scope_check check (scope in ('main', 'daily', 'penalty', 'calibration'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quest_assignments_parent_fk') then
    alter table public.quest_assignments add constraint quest_assignments_parent_fk foreign key (parent_assignment_id) references public.quest_assignments(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quest_assignments_penalty_source_fk') then
    alter table public.quest_assignments add constraint quest_assignments_penalty_source_fk foreign key (penalty_source_assignment_id) references public.quest_assignments(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'resources_fallback_fk') then
    alter table public.resources add constraint resources_fallback_fk foreign key (fallback_resource_id) references public.resources(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'resources_cost_tier_check') then
    alter table public.resources add constraint resources_cost_tier_check check (cost_tier in ('free', 'paid'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'resources_availability_status_check') then
    alter table public.resources add constraint resources_availability_status_check check (availability_status in ('available', 'unavailable', 'unchecked'));
  end if;
end $$;

create index if not exists quest_assignments_user_due_idx
  on public.quest_assignments (user_id, due_at);
create index if not exists quest_assignments_penalty_source_idx
  on public.quest_assignments (penalty_source_assignment_id);

update public.resources
set prerequisites = case id
      when 'resource-baseline' then array['Python and scikit-learn']
      when 'resource-evaluation' then array['A trained baseline']
      else array['Python basics'] end,
    required_tools = case id
      when 'resource-baseline' then array['Python', 'Git']
      else array['Python'] end,
    cost_tier = 'free',
    availability_status = 'available',
    last_checked_at = now();

insert into public.quests (
  id, training_contract, purpose, scope, duration_days, title, summary, instructions,
  quest_type, difficulty, estimated_minutes, base_xp, optional, acceptance_criteria,
  evidence_requirements, reflection_min_chars, skill_weights, expected_artifact_type,
  resource_ids, execution_steps, success_metrics, out_of_scope
) values
  ('quest-standard-main-2','standard','training','main',5,'Audit data quality','Document measurable data risks.','Audit and commit the findings.','dataPractice',3,70,70,false,'["Three findings"]','[{"id":"artifact","type":"githubCommit","required":true}]',40,'{"dataHandling":0.6,"modeling":0.1,"evaluation":0.1,"engineering":0.1,"researchSense":0,"productThinking":0,"communication":0.1}','githubRepository',array['resource-eda'],'["Audit data","Record evidence","Commit results"]','["Three measurable findings"]','["Deployment"]'),
  ('quest-standard-main-3','standard','training','main',5,'Design validation','Justify validation and leakage controls.','Write and commit the validation design.','evaluationPractice',3,70,70,false,'["Validation justified"]','[{"id":"report","type":"modelEvaluationReport","required":true}]',40,'{"dataHandling":0.1,"modeling":0.1,"evaluation":0.5,"engineering":0.1,"researchSense":0,"productThinking":0.1,"communication":0.1}','modelEvaluationReport',array['resource-validation'],'["Choose strategy","Check leakage","Commit design"]','["Strategy and leakage control documented"]','["Deployment"]'),
  ('quest-standard-main-4','standard','training','main',5,'Run error analysis','Find actionable model errors.','Analyze two slices and commit the report.','evaluationPractice',3,70,70,false,'["Two slices"]','[{"id":"report","type":"modelEvaluationReport","required":true}]',40,'{"dataHandling":0.1,"modeling":0.1,"evaluation":0.5,"engineering":0,"researchSense":0,"productThinking":0.1,"communication":0.2}','modelEvaluationReport',array['resource-evaluation'],'["Choose slices","Measure errors","Commit report"]','["Two error slices and next experiment"]','["Retraining"]'),
  ('quest-standard-main-5','standard','training','main',5,'Publish retrospective','Publish results and limitations.','Write and publish the retrospective.','communicationExercise',3,70,70,false,'["Retrospective published"]','[{"id":"reflection","type":"writtenReflection","required":true}]',80,'{"dataHandling":0,"modeling":0.1,"evaluation":0.1,"engineering":0.1,"researchSense":0.1,"productThinking":0.2,"communication":0.4}','projectRetrospective',array['resource-evaluation'],'["Summarize results","State limitations","Publish next steps"]','["Results, limitations, and next steps included"]','["New experiments"]'),
  ('quest-standard-daily-communication','standard','training','daily',1,'Explain one model decision','Write one concise decision note.','Publish a decision, tradeoff, and consequence.','communicationExercise',2,30,25,false,'["Decision note complete"]','[{"id":"note","type":"writtenReflection","required":true}]',40,'{"dataHandling":0,"modeling":0.1,"evaluation":0.1,"engineering":0,"researchSense":0,"productThinking":0.3,"communication":0.5}','technicalWriteup',array['resource-validation'],'["Choose decision","Explain tradeoff","Publish note"]','["Decision, tradeoff, and consequence stated"]','["Implementation"]'),
  ('quest-penalty-main','standard','training','penalty',1,'Repair missed mainline checkpoint','Recover one missed checkpoint.','Complete the smallest measurable recovery slice.','communicationExercise',2,45,0,false,'["Debt cleared"]','[{"id":"reflection","type":"writtenReflection","required":true}]',40,'{"dataHandling":0,"modeling":0,"evaluation":0,"engineering":0.2,"researchSense":0,"productThinking":0.2,"communication":0.6}',null,array['resource-validation'],'["Identify gap","Complete recovery slice","Submit proof"]','["Missed checkpoint debt is cleared"]','["New feature work"]'),
  ('quest-penalty-daily','standard','training','penalty',1,'Recover missed daily mission','Recover one missed daily mission.','Complete and document the recovery.','communicationExercise',2,30,0,false,'["Debt cleared"]','[{"id":"reflection","type":"writtenReflection","required":true}]',40,'{"dataHandling":0,"modeling":0,"evaluation":0,"engineering":0.2,"researchSense":0,"productThinking":0.2,"communication":0.6}',null,array['resource-validation'],'["Identify gap","Complete recovery","Submit proof"]','["Missed daily debt is cleared"]','["New feature work"]')
on conflict (id) do update set
  scope = excluded.scope,
  duration_days = excluded.duration_days,
  execution_steps = excluded.execution_steps,
  success_metrics = excluded.success_metrics,
  out_of_scope = excluded.out_of_scope,
  updated_at = now();
