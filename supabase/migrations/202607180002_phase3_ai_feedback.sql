begin;

alter table public.agent_runs
  add column if not exists submission_id uuid references public.submissions(id) on delete cascade,
  add column if not exists model text,
  add column if not exists prompt_version text not null default 'phase3-v1',
  add column if not exists latency_ms integer check (latency_ms >= 0),
  add column if not exists input_tokens integer check (input_tokens >= 0),
  add column if not exists output_tokens integer check (output_tokens >= 0),
  add column if not exists error_code text,
  add column if not exists fallback_used boolean not null default false,
  add column if not exists trace_id text;

-- Phase 2 permitted global mock rows. Phase 3 agent runs are always user-owned.
delete from public.agent_runs where user_id is null;
alter table public.agent_runs alter column user_id set not null;

alter table public.feedback
  add column if not exists source text not null default 'deterministic',
  add column if not exists model text,
  add column if not exists prompt_version text,
  add column if not exists ai_confidence numeric,
  add column if not exists adjustment_explanation text,
  add column if not exists recommended_quest_id text references public.quests(id) on delete set null;

alter table public.feedback drop constraint if exists feedback_source_check;
alter table public.feedback
  add constraint feedback_source_check
  check (source in ('deterministic', 'ai', 'ai_fallback'));

alter table public.feedback drop constraint if exists feedback_ai_confidence_check;
alter table public.feedback
  add constraint feedback_ai_confidence_check
  check (ai_confidence is null or ai_confidence between 0 and 1);

create unique index if not exists agent_runs_submission_prompt_uidx
  on public.agent_runs (user_id, submission_id, agent_type, prompt_version)
  where submission_id is not null;

create index if not exists agent_runs_user_created_idx
  on public.agent_runs (user_id, created_at desc);

create index if not exists feedback_user_created_idx
  on public.feedback (user_id, created_at desc);

drop policy if exists "users manage own agent runs" on public.agent_runs;
create policy "users manage own agent runs"
  on public.agent_runs for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
