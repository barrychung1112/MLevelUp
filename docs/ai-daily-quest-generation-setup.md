# AI daily quest generation operations

This feature generates one private, evidence-producing daily quest per learner. A deterministic policy gate accepts or rejects the proposal. Missing configuration, model errors, invalid output, or rejected content use the existing catalog selector.

## Deployment order

1. Apply `supabase/migrations/202607200003_ai_daily_quest_generation.sql` to production Supabase.
2. Confirm the migration completed before deploying the application. The application reads quests through `get_visible_quests`, which is introduced by this migration.
3. Configure the server-only Vercel variables:

```env
OPENAI_API_KEY=your-server-only-openai-key
OPENAI_MODEL=gpt-5.6-terra
OPENAI_DAILY_QUEST_PROMPT_VERSION=daily-quest-v1
CRON_SECRET=your-long-random-secret
```

4. Redeploy the application.

Do not prefix the OpenAI key with `NEXT_PUBLIC_`. The browser never receives this key. If `OPENAI_API_KEY` is absent, daily assignment remains available through catalog fallback.

## Authorized smoke test

Run the daily endpoint once with the production domain and secret:

```powershell
$headers = @{ Authorization = "Bearer $env:CRON_SECRET" }
Invoke-RestMethod -Method Post -Uri "https://m-level-up.vercel.app/api/cron/daily-training" -Headers $headers
```

The response contains aggregate data only:

```json
{
  "processed": 1,
  "assigned": 1,
  "aiGenerated": 1,
  "catalogFallback": 0,
  "degraded": 0,
  "skipped": 0,
  "failures": 0
}
```

`aiGenerated` confirms an accepted AI quest. `catalogFallback` confirms safe fallback. `degraded` counts learners whose model call or policy validation failed. `skipped` includes learners who already have a daily assignment, have penalty priority, have no eligible fallback, or lost an idempotency race.

## Database checks

Use the Supabase SQL editor after a smoke test:

```sql
select id, owner_user_id, source, generation_model,
       generation_prompt_version, generation_trace_id, created_at
from public.quests
where source = 'ai_generated'
order by created_at desc
limit 10;

select user_id, quest_id, assigned_date, due_at, generation_key
from public.quest_assignments
where generation_key is not null
order by assigned_at desc
limit 10;

select user_id, status, model, prompt_version, error_code,
       fallback_used, trace_id, created_at
from public.agent_runs
where agent_type = 'learningStrategist'
order by created_at desc
limit 10;
```

For an AI-generated assignment, the quest owner and assignment user must match, `source` must be `ai_generated`, and `due_at` must be 24 hours after `assigned_at`.

## Positive checks

- The generated task is visible to its owner on the dashboard and quest detail page.
- It contains three to five steps, three to five acceptance criteria, a concrete success metric, and mandatory evidence.
- A second signed-in user cannot read the generated quest.
- Repeating the cron on the same local date does not create another daily assignment.

## Fallback check

Temporarily remove `OPENAI_API_KEY` in a non-production environment, redeploy, and run the cron. Expect `catalogFallback` and `degraded` to increase while `failures` remains zero when an eligible catalog quest exists. Restore the key after the test.

Do not deliberately corrupt the production prompt or database to test fallback.

## Rollback

Application rollback is safe after reverting to a version that reads the quest table directly; catalog and generated rows remain valid records. Do not drop generated quests while assignments or submissions reference them. To disable generation without a code rollback, remove `OPENAI_API_KEY`; the scheduler will use catalog fallback.
