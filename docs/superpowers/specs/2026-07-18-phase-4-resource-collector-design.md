# MLevelUp Phase 4 Resource Collector and Daily Quest Design

## Goal

Turn the mocked Resource Collector into a production workflow that discovers, validates, deduplicates, scores, and persists trustworthy ML-engineering resources, then uses only verified resources when assigning the learner's next daily mission.

Phase 4 answers two questions that Phase 3 intentionally leaves open:

1. Which current resources can help this learner complete a concrete mission?
2. Which eligible mission should be assigned next without replacing the active mainline or violating penalty and recovery rules?

## Selected architecture

Use the existing Next.js modular monolith with two protected server workflows:

- `CollectResourcesService` discovers and refreshes catalog resources.
- `GenerateDailyTrainingService` reconciles obligations and creates at most one daily assignment for a learner and local date.

Vercel Cron invokes protected Next.js route handlers. Domain and application services remain transport-independent and injectable. Supabase stores the shared resource catalog, source/run diagnostics, and user-owned quest assignments.

This design does not add an MCP server, Supabase Edge Function, queue, or independent worker. Those remain later adapters if the bounded Vercel batch becomes insufficient.

## Alternatives considered

### Supabase Edge Functions

This keeps scheduled work close to PostgreSQL, but would duplicate TypeScript application boundaries and introduce a second runtime before it is needed. It is a migration option, not the Phase 4 default.

### Independent worker service

A long-running worker offers the most control for crawling and queues, but adds deployment, observability, authentication, and retry infrastructure. Phase 4 uses bounded API/RSS collection rather than crawling, so the additional service is not justified yet.

## Phase 4 scope

### Included

- GitHub repository discovery adapter.
- arXiv paper discovery adapter.
- Injectable source interfaces and deterministic fixtures; automated tests never call live sources.
- URL canonicalization, source identity, content fingerprinting, and deterministic deduplication.
- Deterministic quality score from credibility, relevance, freshness, difficulty fit, and availability.
- AI enrichment for compact summaries, difficulty, estimated time, skill tags, and prerequisites.
- Strict schema validation and deterministic fallback when AI enrichment fails.
- URL/source availability checks with bounded timeout and sanitized errors.
- Supabase resource persistence, source/run metadata, indexes, and catalog access policies.
- Protected manual and Vercel Cron resource-collection endpoint.
- Daily training generation using learner context, mission readiness, verified resources, Phase 3 strategist/adjuster proposals, and a deterministic assignment gate.
- Resource Library and Agent Status production provenance.
- Production runbook, metrics, and smoke-test instructions.

### Excluded

- General web crawling or browser automation.
- Autonomous creation of arbitrary quest definitions.
- Full MCP server.
- Kaggle rank verification or GitHub evidence verification.
- Queue infrastructure and long-running workers.
- Public leaderboard and portfolio export.
- AI authority over XP, assignment completion, deadlines, penalties, recovery, or reset.

## Resource model

The existing `Resource` remains the domain object used by mission readiness. Phase 4 extends it with catalog provenance:

- `canonicalUrl`
- `source`: `github`, `arxiv`, `official`, or `manual`
- `externalId`
- `contentFingerprint`
- `qualityScore`
- `taskFit`
- `availabilityStatus`: `available`, `unavailable`, `unchecked`, `stale`, or `manual_review`
- `lastCheckedAt`
- `publishedAt`
- `updatedAt`
- `ingestedAt`
- `metadataVersion`

Resource type remains bounded to the existing types. GitHub maps to `repository`; arXiv maps to `paper`. Skill tags remain limited to the seven existing skill keys. One resource must have at least one skill tag.

### Quality score

The deterministic score is an integer from 0 to 100:

```text
30% credibility
25% relevance
20% freshness
15% task fit
10% availability
```

Availability contributes 100 only when verified available, 30 when unchecked, and 0 when unavailable, stale, or manual review. A resource is mission-eligible only when:

- availability is `available`;
- relevance is at least 60;
- credibility is at least 60;
- quality score is at least 65;
- estimated time is positive;
- it is free in Phase 4;
- its last availability check is within seven days.

## Discovery and enrichment flow

```text
Vercel Cron or authorized manual trigger
        |
        v
Source adapters (GitHub + arXiv)
        |
        v
Normalize URL and source identity
        |
        v
Deterministic exact/source/fingerprint deduplication
        |
        v
Bounded availability check
        |
        v
AI enrichment with strict structured output
        |
        v
Deterministic quality score and eligibility gate
        |
        v
Supabase catalog upsert + collector diagnostics
```

Each adapter returns a bounded `ResourceCandidate`; it never writes to Supabase. The application service owns normalization, validation, and persistence. AI enrichment cannot change canonical URL, source identity, availability result, or deterministic quality score.

### Deduplication order

1. Match `source + externalId`.
2. Match normalized canonical URL.
3. Match content fingerprint.
4. Otherwise insert a new resource.

Existing stable resource IDs are preserved on updates. Re-running the same batch is idempotent.

## Source policy

### GitHub

Search only repositories related to approved ML-engineering skill/query templates. Persist repository ID as `externalId`. Credibility considers owner/source allowlists, stars, archival status, license, and recent activity, but stars never become the sole quality signal.

### arXiv

Search bounded ML systems, evaluation, deployment, and applied modeling categories/query templates. Persist the stable arXiv identifier as `externalId`. Credibility is high for valid arXiv records but relevance, freshness, task fit, and estimated time still determine eligibility.

## AI enrichment

Add a Resource Curator structured output contract:

- summary, maximum 400 characters;
- difficulty, 1 through 5;
- estimated minutes, 5 through 300;
- one to four existing skill tags;
- zero to five prerequisites;
- relevance, 0 through 100;
- task fit, 0 through 100;
- short recommendation reason.

The model receives only normalized candidate metadata and approved taxonomy. It receives no database credentials, access tokens, user data, or raw HTML. Missing key, timeout, refusal, or invalid output uses deterministic source-specific enrichment and marks the collector run degraded without losing otherwise valid candidates.

Use a separate prompt version such as `phase4-resource-v1`; do not reuse `phase3-v1` because resource classification is an independently evaluable behavior.

## Persistence and authorization

### Shared catalog

Resources are shared catalog rows. Authenticated learners may read only mission-eligible fields. Browser clients cannot insert, update, or delete catalog resources.

Resource collection writes occur only from the protected server workflow. A server-side administrative credential may be scoped to this route only; it must never enter browser code, Agent context, logs, or persisted diagnostics.

### Collector runs

Add catalog-level collector run tables rather than misusing user-owned Phase 3 `agent_runs`:

- `resource_collection_runs`
- `resource_collection_items`

Run fields include source, status, started/completed time, candidate/new/updated/duplicate/rejected counts, model, prompt version, token usage, trace ID, and sanitized error code. Item records include candidate identity, disposition, resource ID, and sanitized rejection code; raw API credentials and raw model prompts are never stored.

The user-facing `resourceCollector` Agent Status is derived from the latest catalog run and marked non-mock.

## Protected routes and scheduling

### Resource collection

`POST /api/cron/resources`

- Requires `Authorization: Bearer <CRON_SECRET>`.
- Rejects missing or invalid secret before source or model calls.
- Accepts an optional bounded source selector only for authorized manual runs.
- Uses a run idempotency key derived from UTC schedule slot, source, and collector version.
- Returns counts and run status, never raw provider/model responses.

### Daily training generation

`POST /api/cron/daily-training`

- Requires the same protected scheduler boundary.
- Processes learners in bounded pages.
- Uses learner timezone to determine the local training date.
- Creates no more than one daily assignment per learner/date.
- Reconciles expired obligations and penalties before considering a new daily mission.
- Leaves an active mainline assignment intact.

The initial Vercel schedule runs resource collection first, then daily training after a safe delay. Manual triggers use the same application services and idempotency rules.

## Daily mission generation

The application service loads only the required learner context:

- fixed target role and five-hour daily capacity;
- seven skill values;
- active mainline checkpoint;
- open daily and penalty assignments;
- training/recovery status;
- recent 14-day outcome aggregates;
- eligible quest catalog entries;
- verified mission-ready resources.

The deterministic candidate selector runs before AI and enforces:

- open penalty debt has priority;
- recovery cannot increase difficulty;
- an active mainline is never replaced;
- the quest fits the remaining daily capacity;
- all referenced resources are mission-eligible;
- the quest has concrete steps, success metrics, evidence requirements, and one to three resources;
- already-active or recently repeated quests are excluded.

Learning Strategist may choose only an eligible quest ID and explain why. Adjuster may recommend bounded difficulty/granularity. The assignment gate revalidates both proposals and falls back to the deterministic top candidate. Only the assignment writer creates the deadline and row.

Phase 4 selects and assigns existing quest definitions. Generating arbitrary new quest definitions remains excluded.

## Failure behavior

- One source fails: persist valid results from other sources and mark run degraded.
- AI enrichment fails: use deterministic enrichment and continue.
- Availability check fails: mark candidate unchecked/manual review; do not make it mission-eligible.
- Supabase persistence fails: mark run failed and allow safe retry with the same run key.
- No eligible resource: do not assign a quest that depends on missing resources; record `resource_gap`.
- No eligible daily quest: keep existing obligations and record a no-assignment reason.
- Cron repeats: return the existing run/assignment without duplicate rows.

## User interface

### Resource Library

Show:

- source and resource type;
- quality, credibility, relevance, and freshness;
- difficulty and estimated time;
- skill tags and prerequisites;
- availability and last verified time;
- recommendation reason.

Unavailable, stale, and manual-review resources are not shown as recommended resources.

### Agent Status

Resource Collector displays running, completed, degraded, or failed status with last run time and aggregate counts. Status uses text as well as color. The other Phase 3 agents remain unchanged.

## Testing strategy

### Domain

- Canonical URL normalization and fingerprint stability.
- Exact/source/fingerprint deduplication.
- Quality score weights, bounds, and eligibility threshold.
- Seven-day availability freshness boundary.
- Mission readiness rejects stale and low-quality resources.
- Daily assignment preserves mainline, prioritizes penalties, respects recovery, and is idempotent.

### Adapters and AI

- GitHub and arXiv fixture parsing.
- Pagination and bounded result counts.
- Provider timeout/rate-limit/sanitized error behavior.
- Resource Curator schema and prompt authority boundaries.
- AI fallback and no-secret context.

### Persistence and routes

- Migration columns, constraints, indexes, RLS, and write restrictions.
- Catalog upsert dispositions and stable IDs.
- Collector run/item diagnostics.
- Unauthorized cron requests cause zero provider/model/database mutations.
- Duplicate cron and daily-generation calls remain idempotent.

### Browser

- Resource Library shows quality/provenance/availability on desktop and mobile.
- Agent Status shows a real Resource Collector run rather than Demo.
- Existing onboarding, submission, penalty, recovery, and Phase 3 feedback flows remain green.

Automated tests use fixtures and fake transports. A separate opt-in production smoke test may call live GitHub/arXiv/OpenAI endpoints.

## Acceptance criteria

1. A protected collection run ingests GitHub and arXiv candidates without duplicate resources.
2. Every persisted resource satisfies the strict schema and records source identity and quality provenance.
3. At least 95% of resources exposed as recommended pass a live availability check in the production evaluation sample.
4. Duplicate resource ratio after canonical/source/fingerprint deduplication is below 3% in the evaluation sample.
5. Missing/invalid AI output never blocks deterministic ingestion.
6. A resource cannot become mission-eligible when unavailable, stale, low-quality, paid, or unchecked.
7. Daily generation creates at most one assignment per learner/local date, preserves the mainline, and prioritizes penalty/recovery rules.
8. No task references a missing or ineligible resource.
9. Collector runs are fully traceable without storing secrets or raw prompts.
10. Lint, typecheck, unit/integration tests, production build, browser tests, secret scan, and migration contract checks pass.

## Delivery sequence

Phase 4 is implemented as four independently testable vertical slices:

1. Resource contracts, canonicalization, scoring, and deduplication.
2. GitHub/arXiv adapters, AI enrichment, persistence, and protected collection route.
3. Daily training generation and protected scheduled route.
4. Resource/Agent UI, production runbook, quality evaluation, and complete verification.

