# Phase 4 Resource Collector operations

## Required production settings

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `CRON_SECRET` (server only; use a long random value)
- `GITHUB_TOKEN` (optional, server only)
- `OPENAI_API_KEY` and `RESOURCE_COLLECTOR_PROMPT_VERSION` (optional curation)

Never add service-role, cron, GitHub, or OpenAI secrets to browser variables.

## Deployment order

1. Apply all SQL migrations, including `202607190001_daily_assignment_idempotency.sql`.
2. Add the server-only variables in Vercel.
3. Deploy `vercel.json`; Vercel invokes resource collection at `09:00 UTC` and daily training at `09:20 UTC`.

## Smoke test

Use a private terminal and replace the placeholder locally:

```sh
curl -X POST https://YOUR_DOMAIN/api/cron/resources -H "Authorization: Bearer $CRON_SECRET"
curl -X POST https://YOUR_DOMAIN/api/cron/daily-training -H "Authorization: Bearer $CRON_SECRET"
```

Expect only aggregate counters. Do not log the authorization header.

## Operational checks

- Inspect `resource_collection_runs` for completed or degraded runs and item counts.
- Inspect `resources` for `availability_status = 'available'`, quality score at least 65, and recent `last_checked_at`.
- A duplicate scheduler delivery is safe: `quest_assignments` has a per-user `generation_key` unique index for daily assignments.
- A degraded source run is acceptable when at least one source remains available; investigate repeated failures or a rising rejected count.

## Scope boundary

Phase 4 uses GitHub and arXiv adapters only. It does not crawl arbitrary sites, expose database access through MCP, or generate arbitrary quest definitions.
