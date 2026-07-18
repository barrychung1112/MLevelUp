# Phase 3 Supabase and OpenAI setup

This guide upgrades an existing Phase 2 database and enables authenticated Phase 3 AI feedback. Demo mode does not require these steps.

## 1. Configure local variables

Create `.env.local` from `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
OPENAI_API_KEY=your-server-only-openai-key
OPENAI_MODEL=gpt-5.6-terra
OPENAI_PROMPT_VERSION=phase3-v1
```

Use the Supabase publishable key, not a secret or `service_role` key. Keep `OPENAI_API_KEY` server-only: never prefix it with `NEXT_PUBLIC_`, commit it, or paste it into browser code.

The model and prompt version can be overridden through environment variables. If the OpenAI key is absent or a model request fails, the submission route returns deterministic fallback feedback and still applies the normal deterministic reward rules.

## 2. Apply database migrations

Open the Supabase Dashboard, choose the project, then open **SQL Editor**. Run each file once, in this order:

1. `supabase/migrations/202607160001_phase2_training.sql`
2. `supabase/migrations/202607170001_adaptive_courage_path.sql`
3. `supabase/migrations/202607180001_mainline_daily_missions.sql`
4. `supabase/migrations/202607180002_phase3_ai_feedback.sql`

For an existing Phase 2 project, only the fourth migration should be new. Do not rerun earlier migrations blindly if they have already been applied.

The Phase 3 migration adds feedback provenance and AI diagnostics, creates an idempotency index per submission/agent/prompt version, and replaces the earlier nullable agent-run access policy with strict user ownership.

## 3. Verify authentication settings

In Supabase Authentication URL settings, add the local callback URL:

```text
http://localhost:3000/auth/callback
```

Keep the production callback separate and add it only after a hosted URL exists.

## 4. Verify the application

Start the app:

```bash
npm run dev
```

Then verify:

1. Request a magic link and sign in.
2. Accept the challenge and open an assigned mission.
3. Submit valid evidence and a reflection.
4. Confirm the result displays `AI` when the model succeeds, or `Deterministic fallback` when it does not.
5. Confirm Agent Status shows separate Learning Strategist, Adjuster, and Coordinator diagnostics.
6. Confirm replaying the same submission does not award XP twice.

## Data sent to the model

The AI context is intentionally bounded to the current mission, deterministic evaluation, summarized evidence and reflection, seven skill values, training status, recent aggregate outcomes, available resources, and eligible quest IDs.

The workflow excludes access tokens, API keys, email addresses, raw ownership fields, and unrelated database records. Raw prompts are not stored. Persisted diagnostics contain redacted summaries, validated output, model/prompt metadata, latency, token counts when available, and sanitized error codes.

## Deterministic authority

Learning Strategist and Adjuster propose bounded changes; Coordinator produces learner-facing synthesis. A deterministic policy gate validates and clamps their output. Existing domain code remains the only authority for evidence hard failures, completion state, XP, skill deltas, deadlines, penalty creation, recovery, and reset.

## Phase boundary

Resource Collector remains mocked in Phase 3. Live web collection, nightly scheduling, deduplication, freshness, credibility, and resource quality scoring are Phase 4 work.
