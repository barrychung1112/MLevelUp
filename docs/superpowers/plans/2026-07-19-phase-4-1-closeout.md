# MLevelUp Phase 4.1 Resource Pipeline Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the production Resource Curator and URL verification into collection, expose sanitized collector telemetry, and enforce a 300-minute mainline plus an extra 60-minute daily quest.

**Architecture:** Keep collection orchestration inside the existing Next.js modular monolith. Inject URL-check and curation boundaries into the application service, persist aggregate diagnostics in Supabase, expose only a sanitized latest-run RPC, and make time capacity explicit at selector call sites.

**Tech Stack:** Next.js 16, TypeScript 6, React 19, Supabase/PostgreSQL, OpenAI Responses API, Zod, Vitest, Testing Library, Playwright, Vercel Cron.

---

## File structure

- Create `src/resource-collector/check-availability.ts`: bounded HEAD/GET URL availability adapter.
- Create `src/resource-collector/check-availability.test.ts`: positive, negative, fallback, and timeout contract tests.
- Modify `src/resource-collector/curator.ts`: preserve strict structured output and return deterministic fallback diagnostics.
- Modify `src/resource-collector/curator.test.ts`: AI success and invalid/timeout fallback tests.
- Modify `src/resource-collector/collect-resources.ts`: compose availability, curation, scoring, persistence, and aggregate diagnostics.
- Modify `src/resource-collector/collect-resources.test.ts`: service behavior and idempotency tests.
- Modify `src/resource-collector/supabase-catalog-repository.ts`: persist expanded run totals.
- Modify `src/app/api/cron/resources/route.ts`: construct live AI and availability dependencies.
- Modify `src/app/api/cron/resources/route.test.ts`: authorization and sanitized response tests.
- Create `supabase/migrations/202607190002_phase4_1_resource_closeout.sql`: diagnostic columns and sanitized authenticated RPC.
- Modify `supabase/migrations/phase2-schema.test.ts`: assert migration/RPC security contract.
- Modify `src/supabase-training/row-mappers.ts`: map sanitized collector status into `AgentStatus`.
- Modify `src/supabase-training/row-mappers.test.ts`: verify status and summary mapping.
- Modify `src/supabase-training/supabase-training-repository.ts`: load and merge the latest collector status.
- Modify `src/supabase-training/supabase-training-repository.test.ts`: verify replacement of the mock collector entry.
- Modify `src/domain/training/constants.ts`: add 300- and 60-minute capacity constants.
- Modify `src/domain/training/adaptive-selector.ts`: accept explicit `availableMinutes`.
- Modify `src/domain/training/adaptive-selector.test.ts`: enforce both time boundaries.
- Modify `src/application/training/generate-daily-training.ts`: pass the 60-minute daily capacity.
- Modify `src/application/training/generate-daily-training.test.ts`: reject daily missions beyond the complete 60-minute budget.
- Modify `src/mocks/training/mock-training-repository.ts` and `src/supabase-training/supabase-training-repository.ts`: pass 300 minutes for post-calibration mainline selection.
- Modify `src/domain/training/types.ts` and `src/domain/training/schemas.ts`: support persisted collector failure status.
- Modify `src/app/_helpers/training-view-models.ts` and tests: present real collector provenance and failure state.
- Modify `src/components/features/agents/agent-status-board.tsx` and tests: display aggregate collector telemetry without secrets.
- Modify `docs/phase-4-resource-collector-setup.md` and `README.md`: document new prompt variable, time policy, migration, and smoke checks.

### Task 1: Make training capacities explicit

**Files:**
- Modify: `src/domain/training/constants.ts`
- Modify: `src/domain/training/adaptive-selector.ts`
- Modify: `src/domain/training/adaptive-selector.test.ts`
- Modify: `src/application/training/generate-daily-training.ts`
- Modify: `src/application/training/generate-daily-training.test.ts`
- Modify: `src/mocks/training/mock-training-repository.ts`
- Modify: `src/supabase-training/supabase-training-repository.ts`

- [ ] **Step 1: Write failing boundary tests**

Add assertions that `selectHardestFeasibleQuest` accepts `availableMinutes`, that a daily quest plus required resources over 60 minutes is rejected, and that a mainline candidate can use 300 minutes.

```ts
expect(selectHardestFeasibleQuest({
  quests: [dailyQuest],
  skills: skills(50),
  availableMinutes: 60,
  excludedQuestIds: [],
  resources,
})).toBeUndefined();
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `npm test -- src/domain/training/adaptive-selector.test.ts src/application/training/generate-daily-training.test.ts`

Expected: FAIL because the selector still requires `weeklyMinutes` and derives a capped 180-minute budget.

- [ ] **Step 3: Implement explicit capacities**

Add the constants and change the selector contract:

```ts
export const MAINLINE_DAILY_MINUTES = 300;
export const DAILY_QUEST_MAX_MINUTES = 60;

type SelectorInput = {
  quests: readonly Quest[];
  skills: SkillStats;
  availableMinutes: number;
  excludedQuestIds: readonly string[];
  resources: readonly Resource[];
};
```

Use `DAILY_QUEST_MAX_MINUTES` in `generateDailyTraining`, and `state.profile.dailyMinutes` for post-calibration primary selection in both repositories.

- [ ] **Step 4: Run the focused tests and confirm GREEN**

Run: `npm test -- src/domain/training/adaptive-selector.test.ts src/application/training/generate-daily-training.test.ts src/mocks/training/mock-training-repository.test.ts src/supabase-training/supabase-training-repository.test.ts`

Expected: all selected test files pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain/training src/application/training src/mocks/training/mock-training-repository.ts src/supabase-training/supabase-training-repository.ts
git commit -m "fix: separate mainline and daily quest capacity"
```

### Task 2: Add bounded resource availability checks

**Files:**
- Create: `src/resource-collector/check-availability.ts`
- Create: `src/resource-collector/check-availability.test.ts`

- [ ] **Step 1: Write failing adapter tests**

Cover 204 as available, 404 and 410 as unavailable, 405 followed by successful GET, timeout as unchecked, and 429/500 as unchecked. Use injected fake fetch functions only.

```ts
await expect(checkResourceAvailability("https://example.com", fetcher, 25))
  .resolves.toMatchObject({ status: "available" });
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- src/resource-collector/check-availability.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the checker**

Implement this public contract:

```ts
export type AvailabilityCheck = {
  status: "available" | "unavailable" | "unchecked";
  errorCode?: "timeout" | "ambiguous_status" | "network_error";
};

export async function checkResourceAvailability(
  url: string,
  fetcher: FetchLike = fetch,
  timeoutMs = 5_000,
): Promise<AvailabilityCheck>;
```

Use one shared `AbortController`, HEAD first, GET only for 405/501, and never throw transport errors to the collection service.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `npm test -- src/resource-collector/check-availability.test.ts`

Expected: all availability classifications pass without network access.

- [ ] **Step 5: Commit**

```bash
git add src/resource-collector/check-availability.ts src/resource-collector/check-availability.test.ts
git commit -m "feat: verify resource URL availability"
```

### Task 3: Wire curation and availability into collection

**Files:**
- Modify: `src/resource-collector/curator.ts`
- Modify: `src/resource-collector/curator.test.ts`
- Modify: `src/resource-collector/collect-resources.ts`
- Modify: `src/resource-collector/collect-resources.test.ts`

- [ ] **Step 1: Write failing orchestration tests**

Add cases proving that validated curator fields are persisted, fallback increments its count and degrades the run, unavailable/unchecked resources are not marked available, one candidate failure does not stop the batch, and replay avoids source/checker/curator calls.

```ts
expect(catalog.upsertResource).toHaveBeenCalledWith(
  expect.objectContaining({
    difficulty: 5,
    estimatedMinutes: 55,
    availabilityStatus: "available",
  }),
);
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- src/resource-collector/curator.test.ts src/resource-collector/collect-resources.test.ts`

Expected: FAIL because collection currently hardcodes enrichment and availability.

- [ ] **Step 3: Add injectable service dependencies**

Extend input and outcome contracts:

```ts
type CurateResource = (candidate: ResourceCandidate) => Promise<ResourceCuration>;
type CheckAvailability = (url: string) => Promise<AvailabilityCheck>;

interface CollectionOutcome extends StoredCollectionRun {
  replayed: boolean;
  sourceFailures: string[];
  candidateCount: number;
  fallbackCount: number;
  unavailableCount: number;
  uncheckedCount: number;
}
```

Create resource fields from the curation result and availability result, then calculate quality with `scoreResourceQuality`. A fallback or any source/rejection/unavailable/unchecked result makes the run degraded.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `npm test -- src/resource-collector/curator.test.ts src/resource-collector/collect-resources.test.ts src/domain/resources/resource-quality.test.ts`

Expected: all tests pass, including idempotent replay.

- [ ] **Step 5: Commit**

```bash
git add src/resource-collector/curator.ts src/resource-collector/curator.test.ts src/resource-collector/collect-resources.ts src/resource-collector/collect-resources.test.ts
git commit -m "feat: curate verified resources during collection"
```

### Task 4: Persist expanded run diagnostics and expose a sanitized RPC

**Files:**
- Create: `supabase/migrations/202607190002_phase4_1_resource_closeout.sql`
- Modify: `supabase/migrations/phase2-schema.test.ts`
- Modify: `src/resource-collector/supabase-catalog-repository.ts`
- Create: `src/resource-collector/supabase-catalog-repository.test.ts`

- [ ] **Step 1: Write failing persistence and migration tests**

Assert the repository persists `candidate_count`, `fallback_count`, `unavailable_count`, and `unchecked_count`; assert the migration creates `get_latest_resource_collector_status`, revokes public execution, and grants only `authenticated` execution.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- src/resource-collector/supabase-catalog-repository.test.ts supabase/migrations/phase2-schema.test.ts`

Expected: FAIL because the columns, RPC, and repository mappings are absent.

- [ ] **Step 3: Add the additive migration**

Use additive columns and a fixed sanitized RPC projection:

```sql
alter table public.resource_collection_runs
  add column if not exists fallback_count integer not null default 0 check (fallback_count >= 0),
  add column if not exists unavailable_count integer not null default 0 check (unavailable_count >= 0),
  add column if not exists unchecked_count integer not null default 0 check (unchecked_count >= 0);

create or replace function public.get_latest_resource_collector_status()
returns table (
  status text,
  candidate_count integer,
  inserted_count integer,
  updated_count integer,
  duplicate_count integer,
  rejected_count integer,
  fallback_count integer,
  unavailable_count integer,
  unchecked_count integer,
  model text,
  prompt_version text,
  error_code text,
  started_at timestamptz,
  completed_at timestamptz
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select status, candidate_count, inserted_count, updated_count,
         duplicate_count, rejected_count, fallback_count,
         unavailable_count, unchecked_count, model, prompt_version,
         error_code, started_at, completed_at
  from public.resource_collection_runs
  order by started_at desc
  limit 1
$$;

revoke all on function public.get_latest_resource_collector_status() from public;
grant execute on function public.get_latest_resource_collector_status() to authenticated;
```

- [ ] **Step 4: Update repository persistence and run tests**

Run: `npm test -- src/resource-collector/supabase-catalog-repository.test.ts supabase/migrations/phase2-schema.test.ts`

Expected: repository mappings and SQL security contract pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations src/resource-collector/supabase-catalog-repository.ts src/resource-collector/supabase-catalog-repository.test.ts
git commit -m "feat: persist sanitized collector diagnostics"
```

### Task 5: Compose the live cron safely

**Files:**
- Modify: `src/app/api/cron/resources/route.ts`
- Modify: `src/app/api/cron/resources/route.test.ts`

- [ ] **Step 1: Write failing route composition tests**

Assert unauthorized calls do no work, authorized output includes only aggregate counts, and configured collection receives an AI curator using `OPENAI_RESOURCE_PROMPT_VERSION` rather than the Phase 3 prompt version.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- src/app/api/cron/resources/route.test.ts`

Expected: FAIL because live collection does not create availability or AI dependencies.

- [ ] **Step 3: Compose existing adapters**

Read `readAiConfig()`, override only its resource prompt version, construct `createOpenAiGateway(config)` when configured, and inject:

```ts
curate: (candidate) => curateCandidate(candidate, gateway, resourceConfig),
checkAvailability: (url) => checkResourceAvailability(url, fetch, 5_000),
```

Return candidate/fallback/unavailable/unchecked totals while preserving sanitized errors and the initial secret check.

- [ ] **Step 4: Run route and collector tests**

Run: `npm test -- src/app/api/cron/resources/route.test.ts src/resource-collector/collect-resources.test.ts`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/resources
git commit -m "feat: run AI curation in resource cron"
```

### Task 6: Merge real collector telemetry into training state

**Files:**
- Modify: `src/domain/training/types.ts`
- Modify: `src/domain/training/schemas.ts`
- Modify: `src/supabase-training/row-mappers.ts`
- Modify: `src/supabase-training/row-mappers.test.ts`
- Modify: `src/supabase-training/supabase-training-repository.ts`
- Modify: `src/supabase-training/supabase-training-repository.test.ts`
- Modify: `src/app/_helpers/training-view-models.ts`
- Modify: `src/app/_helpers/training-view-models.test.ts`

- [ ] **Step 1: Write failing mapper and repository tests**

Provide a sanitized RPC row and assert it maps to a non-mock `resourceCollector`, replaces only the mock collector entry, preserves other agents, reports counts in its summary, and supports `failed`.

```ts
expect(state.agents.find((agent) => agent.agentType === "resourceCollector"))
  .toMatchObject({ isMock: false, status: "degraded", fallbackUsed: true });
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- src/supabase-training/row-mappers.test.ts src/supabase-training/supabase-training-repository.test.ts src/app/_helpers/training-view-models.test.ts`

Expected: FAIL because the RPC row is not loaded and `failed` is outside the current domain schema.

- [ ] **Step 3: Implement sanitized telemetry mapping**

Add `failed` to the status union/schema, define the RPC row type and mapper, call `.rpc("get_latest_resource_collector_status")` during snapshot loading, and replace the mock `resourceCollector` entry only when a row exists.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `npm test -- src/supabase-training/row-mappers.test.ts src/supabase-training/supabase-training-repository.test.ts src/app/_helpers/training-view-models.test.ts`

Expected: all status mapping and repository tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain/training src/supabase-training src/app/_helpers
git commit -m "feat: show real resource collector telemetry"
```

### Task 7: Verify Agent Status presentation and documentation

**Files:**
- Modify: `src/components/features/agents/agent-status-board.tsx`
- Modify: `src/components/features/agents/agent-status-board.test.tsx`
- Modify: `docs/phase-4-resource-collector-setup.md`
- Modify: `README.md`

- [ ] **Step 1: Write failing presentation test**

Render a degraded collector result and assert visible text contains its status, aggregate summary, fallback provenance, prompt version, and last-run time without exposing trace IDs or tokens.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- src/components/features/agents/agent-status-board.test.tsx`

Expected: FAIL for the newly required collector metadata.

- [ ] **Step 3: Implement the smallest UI and runbook changes**

Reuse the existing card and status components. Document `OPENAI_RESOURCE_PROMPT_VERSION=phase4-resource-v1`, the new migration, the 300+60 time model, authorized manual cron invocation, and how to compare the JSON counts with Agent Status.

- [ ] **Step 4: Run focused UI tests and confirm GREEN**

Run: `npm test -- src/components/features/agents/agent-status-board.test.tsx src/components/features/dashboard/dashboard.test.tsx src/app/routes.integration.test.tsx`

Expected: all UI and route integration tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/agents docs README.md
git commit -m "docs: finish phase 4 collector operations"
```

### Task 8: Complete regression and production verification

**Files:**
- Modify only if a verification failure identifies an in-scope defect.

- [ ] **Step 1: Run static checks**

Run: `npm run lint && npm run typecheck`

Expected: both exit successfully with zero warnings or type errors.

- [ ] **Step 2: Run all unit and integration tests**

Run: `npm run test:unit`

Expected: every Vitest file and test passes.

- [ ] **Step 3: Run production build and browser tests**

Run: `npm run test:e2e`

Expected: Next.js production build succeeds and every Playwright test passes.

- [ ] **Step 4: Check the patch**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intentional files are modified.

- [ ] **Step 5: Apply and probe production migration**

Apply `202607190002_phase4_1_resource_closeout.sql` in Supabase, then execute the RPC while authenticated.

Expected: the RPC returns either zero rows before a run or exactly one sanitized latest-run row.

- [ ] **Step 6: Run positive and negative production cron smoke tests**

Negative request without `Authorization` must return HTTP 401. Authorized request must return a sanitized aggregate, create or replay one run key, and never reveal secrets or raw provider responses.

- [ ] **Step 7: Compare database and UI evidence**

Open `/agents` on the production deployment and compare status, last run, and aggregate counts with the authorized cron response and the sanitized RPC row.

Expected: all three sources agree; a fallback or uncertain URL produces degraded rather than completed.

- [ ] **Step 8: Commit verification-only fixes if required**

```bash
git add <only-the-files-fixed-after-verification>
git commit -m "fix: close phase 4 verification gaps"
```

## Plan self-review

- Spec coverage: curation, fallback, availability, idempotency, sanitized telemetry, 300+60 capacity, security, docs, and production verification each map to a task.
- Scope: no MCP, queue, crawler, competition, portfolio export, or reward-policy rewrite is introduced.
- Placeholder scan: the implementation steps define concrete contracts, commands, and expected results; the final conditional verification commit intentionally stages only files actually fixed.
- Type consistency: `availableMinutes`, `AvailabilityCheck`, expanded `CollectionOutcome`, and collector RPC fields use the same names across service, persistence, and mapping tasks.
- Security consistency: service-only tables remain service-only; authenticated users receive only the fixed RPC projection.

