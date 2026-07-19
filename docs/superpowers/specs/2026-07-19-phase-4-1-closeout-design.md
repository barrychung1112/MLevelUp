# MLevelUp Phase 4.1 Resource Pipeline Closeout Design

## Goal

Complete the production resource pipeline without adding new infrastructure: collected resources must be checked, curated, scored, persisted, and observable, while daily quest selection must enforce the approved five-hour mainline plus at most one extra sixty-minute daily quest.

## Approved approach

Use the existing Next.js modular monolith, protected Vercel cron routes, OpenAI structured-output gateway, and Supabase catalog. No MCP server, queue, worker service, or general web crawler is added.

The closeout has four bounded changes:

1. Wire the existing Resource Curator into `collectResources`, with deterministic fallback.
2. Check each canonical resource URL before scoring it.
3. expose a sanitized latest collector-run summary through a read-only Supabase RPC and merge it into Agent Status.
4. Separate the 300-minute mainline capacity from the extra 60-minute daily-quest capacity.

## Resource collection flow

```text
GitHub and arXiv adapters
        |
        v
normalize and deduplicate
        |
        v
bounded URL availability check
        |
        v
AI Resource Curator
        |
        +---- invalid, refused, timed out, or unconfigured
        |                       |
        |                       v
        |             deterministic fallback
        v
construct Resource and deterministic quality score
        |
        v
catalog upsert, item diagnostic, and aggregate run status
```

The application service receives injectable availability and curation functions. Unit tests use fakes and never call external services. The live cron composes real adapters, a bounded availability checker, and the existing OpenAI structured response gateway.

### Curation authority

AI may provide only:

- summary;
- difficulty;
- estimated minutes;
- skill tags;
- prerequisites;
- relevance;
- task fit;
- recommendation reason.

AI cannot change URL identity, source identity, availability, cost tier, deterministic quality score, or persistence disposition. The curator uses `OPENAI_RESOURCE_PROMPT_VERSION`, defaulting to `phase4-resource-v1`, so the Phase 3 feedback prompt version remains independent.

When AI is unavailable or its output fails schema validation, the existing source-specific deterministic enrichment is used. The resource may still be persisted, but the run is marked `degraded` and increments `fallback_count`.

## Availability policy

The checker uses a five-second timeout by default:

- HTTP 200 through 399: `available`;
- HTTP 404 or 410: `unavailable`;
- HEAD rejected with 405 or 501: retry once using a minimal GET request;
- timeout, rate limit, bot protection, server error, or ambiguous response: `unchecked`.

`unchecked` is intentionally different from `unavailable`: an uncertain network result must not label a resource as dead. Neither state is mission-eligible. A failed check never aborts the whole batch.

## Run diagnostics and Agent Status

`resource_collection_runs` gains aggregate counts for candidates, fallbacks, unavailable URLs, and unchecked URLs. The existing run remains the single source of truth.

Because the run table is service-only, authenticated browsers do not receive direct table access. A `security definer` SQL function returns only the latest sanitized fields needed for UI telemetry:

- status and timestamps;
- candidate, inserted, updated, duplicate, rejected, fallback, unavailable, and unchecked counts;
- model, prompt version, and sanitized error code.

The Supabase training repository calls that function while loading the normal snapshot. A real `resourceCollector` status replaces only the mock collector entry; learner-specific coordinator, strategist, and adjuster runs remain unchanged.

Status mapping is:

- completed without fallback or uncertain URLs: `completed`;
- fallback, source failure, rejection, unavailable, or unchecked result: `degraded`;
- persisted fatal run failure: `failed`.

The UI summary reports aggregate counts. It never displays raw prompts, provider responses, credentials, or trace internals.

## Training time policy

Time capacities are explicit domain constants:

```text
MAINLINE_DAILY_MINUTES = 300
DAILY_QUEST_MAX_MINUTES = 60
```

The adaptive selector receives `availableMinutes` directly rather than deriving a single budget from `weeklyMinutes`.

- Mainline selection receives the profile's fixed `dailyMinutes` value, currently 300.
- Scheduled daily selection always receives 60.
- Daily mission readiness includes the quest and its required resources within that 60-minute ceiling.
- Penalty time remains additional and is governed by existing reconciliation rules.
- Mainline and daily completion, deadlines, and penalties remain independent.

This change removes the obsolete 180-minute clamp without changing XP, evidence validation, recovery, or reset rules.

## Failure behavior

- One source fails: keep valid results from other sources and mark the run degraded.
- One URL check fails: persist as unchecked and continue.
- One AI curation fails: use deterministic fallback and continue.
- One resource persistence fails: count it as rejected and continue.
- Run persistence fails: fail the request so the protected cron can retry.
- Replayed run key: return the existing aggregate without provider, checker, or model calls.

## Security

- `CRON_SECRET` is checked before external or database work.
- `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` remain server-only.
- The collector status RPC is executable only by authenticated users and returns a fixed sanitized projection.
- AI receives normalized public candidate metadata only.
- Logs and database error fields use stable codes rather than raw provider responses.

## Excluded

- MCP server or separate worker.
- Queue infrastructure and per-item background retries.
- Arbitrary-site crawling or HTML extraction.
- Kaggle, hackathon, leaderboard, badge, and public portfolio work.
- Changes to deterministic XP, submission completion, penalty, recovery, or reset authority.

## Acceptance criteria

1. Live collection calls the Resource Curator when configured and persists its validated fields.
2. Invalid output, refusal, timeout, or missing AI configuration uses deterministic fallback without dropping the candidate.
3. Available, unavailable, and uncertain URLs are classified according to the bounded policy.
4. A resource cannot become mission-ready unless its availability is verified as available.
5. Replaying a run remains idempotent and performs no external calls.
6. Agent Status shows the latest real collector run using a sanitized authenticated RPC.
7. Daily quest selection never exceeds 60 minutes including required resource time.
8. Mainline selection retains a 300-minute daily capacity.
9. Existing mainline, penalty, recovery, submission, and feedback behavior remains green.
10. Lint, TypeScript, unit/integration tests, production build, Playwright tests, migration contract checks, and an authorized production cron smoke test pass.

