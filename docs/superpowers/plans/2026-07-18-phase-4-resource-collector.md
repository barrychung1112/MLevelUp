# MLevelUp Phase 4 Resource Collector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a safe resource collection and daily quest generation workflow that turns verified GitHub/arXiv resources into mission-ready catalog entries and assigns at most one valid daily mission per learner/date.

**Architecture:** Keep the Next.js modular monolith. Pure domain modules canonicalize, deduplicate, score, and select. Injectable adapters fetch GitHub/arXiv fixtures or live data; an optional structured AI curator enriches candidates. Application services persist a shared catalog and generate daily assignments behind protected Vercel Cron route handlers.

**Tech Stack:** Next.js 16 App Router, TypeScript 6, Supabase, OpenAI Responses API, Zod 4, Vitest, Testing Library, Playwright, Vercel Cron.

---

## File structure

```text
src/domain/resources/                 Pure canonicalization, scoring, and deduplication
src/resource-collector/               Source adapters, AI enrichment, and collection workflow
src/application/training/             Daily mission generation use case
src/app/api/cron/                     Protected collection and daily-training route handlers
src/supabase-training/                Catalog/run persistence and Supabase mapping
supabase/migrations/                  Phase 4 schema and policies
src/components/features/resources/    Catalog quality and availability UI
docs/                                 Production setup and quality-evaluation instructions
```

### Task 1: Resource contracts, canonicalization, and deterministic quality gate

**Files:**
- Create: `src/domain/resources/resource-quality.ts`
- Create: `src/domain/resources/resource-quality.test.ts`
- Create: `src/domain/resources/resource-identity.ts`
- Create: `src/domain/resources/resource-identity.test.ts`
- Modify: `src/domain/training/types.ts`
- Modify: `src/domain/training/schemas.ts`
- Modify: `src/domain/training/schemas.test.ts`
- Modify: `src/domain/training/mission-readiness.ts`
- Modify: `src/domain/training/mission-readiness.test.ts`

- [ ] **Step 1: Write failing identity tests**

```ts
test("normalizes GitHub URLs and removes tracking query parameters", () => {
  expect(canonicalizeResourceUrl("https://github.com/org/repo/?utm_source=test#readme"))
    .toBe("https://github.com/org/repo");
});

test("creates a stable source identity and fingerprint", () => {
  expect(createResourceIdentity(githubCandidate)).toEqual({
    canonicalUrl: "https://github.com/org/repo",
    source: "github",
    externalId: "123",
    contentFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
  });
});
```

- [ ] **Step 2: Run the identity test and verify RED**

Run: `npm test -- --run --maxWorkers=1 src/domain/resources/resource-identity.test.ts`

Expected: FAIL because the identity module does not exist.

- [ ] **Step 3: Implement identity functions**

```ts
export function canonicalizeResourceUrl(rawUrl: string): string { /* normalize HTTPS, host case, trailing slash, fragments, tracking params */ }
export function createResourceIdentity(candidate: ResourceCandidate): ResourceIdentity { /* source + external id + SHA-256 stable fields */ }
```

- [ ] **Step 4: Run the identity test and verify GREEN**

Run: `npm test -- --run --maxWorkers=1 src/domain/resources/resource-identity.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing quality/readiness tests**

```ts
test("scores verified high-quality resources as mission eligible", () => {
  expect(scoreResourceQuality(resource)).toBe(86);
  expect(isMissionEligibleResource(resource, "2026-07-18T00:00:00.000Z")).toBe(true);
});

test("rejects stale, unchecked, paid, and low-quality resources", () => {
  expect(isMissionEligibleResource({ ...resource, availabilityStatus: "stale" }, now)).toBe(false);
});
```

- [ ] **Step 6: Run the quality test and verify RED**

Run: `npm test -- --run --maxWorkers=1 src/domain/resources/resource-quality.test.ts`

Expected: FAIL because quality functions and Phase 4 fields do not exist.

- [ ] **Step 7: Extend the resource contract and implement quality policy**

```ts
export const ResourceSourceSchema = z.enum(["github", "arxiv", "official", "manual"]);
export const ResourceAvailabilitySchema = z.enum(["available", "unavailable", "unchecked", "stale", "manual_review"]);
export function scoreResourceQuality(input: ResourceQualityInput): number { /* 30/25/20/15/10 weighted score */ }
export function isMissionEligibleResource(resource: Resource, now: string): boolean { /* thresholds plus 7-day freshness */ }
```

Update mission readiness to call `isMissionEligibleResource` instead of maintaining a divergent local check.

- [ ] **Step 8: Run focused domain tests and typecheck**

Run: `npm test -- --run --maxWorkers=1 src/domain/resources/resource-identity.test.ts src/domain/resources/resource-quality.test.ts src/domain/training/mission-readiness.test.ts src/domain/training/schemas.test.ts && npm run typecheck`

Expected: all tests pass and no type errors.

- [ ] **Step 9: Commit**

```bash
git add src/domain/resources src/domain/training/types.ts src/domain/training/schemas.ts src/domain/training/schemas.test.ts src/domain/training/mission-readiness.ts src/domain/training/mission-readiness.test.ts
git commit -m "feat: add resource quality and identity rules"
```

### Task 2: Bounded source adapters and deterministic deduplication

**Files:**
- Create: `src/resource-collector/contracts.ts`
- Create: `src/resource-collector/contracts.test.ts`
- Create: `src/resource-collector/github-source.ts`
- Create: `src/resource-collector/github-source.test.ts`
- Create: `src/resource-collector/arxiv-source.ts`
- Create: `src/resource-collector/arxiv-source.test.ts`
- Create: `src/resource-collector/deduplicate.ts`
- Create: `src/resource-collector/deduplicate.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write failing adapter fixture tests**

```ts
test("maps a GitHub repository response into a bounded candidate", async () => {
  await expect(source.search({ query: "mlops", limit: 2 })).resolves.toEqual([
    expect.objectContaining({ source: "github", externalId: "123", resourceType: "repository" }),
  ]);
});

test("maps an arXiv Atom entry into a bounded paper candidate", async () => {
  await expect(source.search({ query: "evaluation", limit: 2 })).resolves.toEqual([
    expect.objectContaining({ source: "arxiv", externalId: "2401.00001", resourceType: "paper" }),
  ]);
});
```

- [ ] **Step 2: Run adapter tests and verify RED**

Run: `npm test -- --run --maxWorkers=1 src/resource-collector/github-source.test.ts src/resource-collector/arxiv-source.test.ts`

Expected: FAIL because source modules do not exist.

- [ ] **Step 3: Implement injectable HTTP adapters**

```ts
export interface ResourceSource { readonly source: ResourceSourceName; search(input: ResourceSearchInput): Promise<ResourceCandidate[]>; }
export function createGitHubSource(fetcher: FetchLike, token?: string): ResourceSource { /* GitHub API, limit <= 20, timeout controlled by caller */ }
export function createArxivSource(fetcher: FetchLike): ResourceSource { /* Atom response, limit <= 20 */ }
```

Record no raw provider response in application state. Add optional `GITHUB_TOKEN` server-only documentation to `.env.example`.

- [ ] **Step 4: Write failing deduplication tests**

```ts
test("prefers source identity over canonical URL and fingerprint", () => {
  expect(deduplicateCandidates([sameSourceId, sameCanonicalUrl, sameFingerprint])).toMatchObject({ duplicates: 2, unique: [sameSourceId] });
});
```

- [ ] **Step 5: Run deduplication test and verify RED**

Run: `npm test -- --run --maxWorkers=1 src/resource-collector/deduplicate.test.ts`

Expected: FAIL because deduplication module does not exist.

- [ ] **Step 6: Implement deterministic deduplication**

```ts
export function deduplicateCandidates(candidates: readonly ResourceCandidate[]): DeduplicationResult { /* source+externalId, canonical URL, fingerprint; first stable item wins */ }
```

- [ ] **Step 7: Run focused tests and commit**

Run: `npm test -- --run --maxWorkers=1 src/resource-collector/contracts.test.ts src/resource-collector/github-source.test.ts src/resource-collector/arxiv-source.test.ts src/resource-collector/deduplicate.test.ts`

Expected: all pass.

```bash
git add src/resource-collector .env.example
git commit -m "feat: add bounded resource source adapters"
```

### Task 3: Structured AI resource curation with safe fallback

**Files:**
- Create: `src/resource-collector/curator.ts`
- Create: `src/resource-collector/curator.test.ts`
- Create: `src/ai/prompts/resource-curator.ts`
- Modify: `src/ai/contracts.ts`
- Modify: `src/ai/contracts.test.ts`
- Modify: `src/ai/config.ts`
- Modify: `src/ai/config.test.ts`

- [ ] **Step 1: Write failing contract/fallback tests**

```ts
test("rejects unknown fields and authority fields from resource curation", () => {
  expect(() => ResourceCurationSchema.parse({ ...valid, qualityScore: 100 })).toThrow();
});

test("uses deterministic source enrichment when the curator is unavailable", async () => {
  await expect(curateCandidate(candidate, unavailableGateway)).resolves.toMatchObject({ fallbackUsed: true, difficulty: 3 });
});
```

- [ ] **Step 2: Run curator tests and verify RED**

Run: `npm test -- --run --maxWorkers=1 src/resource-collector/curator.test.ts src/ai/contracts.test.ts`

Expected: FAIL because the resource curator contract does not exist.

- [ ] **Step 3: Add strict schema, prompt, and curator**

```ts
export const ResourceCurationSchema = z.strictObject({ summary: z.string().min(20).max(400), difficulty: DifficultySchema, estimatedMinutes: z.number().int().min(5).max(300), skillTags: z.array(SkillKeySchema).min(1).max(4), prerequisites: z.array(z.string().max(100)).max(5), relevance: z.number().int().min(0).max(100), taskFit: z.number().int().min(0).max(100), reason: z.string().min(10).max(240) });
```

The prompt prohibits altering source identity, URL, availability, or quality score. Derive `phase4-resource-v1` as the default prompt version when no explicit resource-curator version is set.

- [ ] **Step 4: Run curator tests and commit**

Run: `npm test -- --run --maxWorkers=1 src/resource-collector/curator.test.ts src/ai/contracts.test.ts src/ai/config.test.ts`

Expected: all pass.

```bash
git add src/resource-collector/curator.ts src/resource-collector/curator.test.ts src/ai
git commit -m "feat: add safe AI resource curation"
```

### Task 4: Persist catalog collection runs with strict access policy

**Files:**
- Create: `supabase/migrations/202607180003_phase4_resource_collector.sql`
- Modify: `supabase/migrations/phase2-schema.test.ts`
- Modify: `src/supabase-training/row-mappers.ts`
- Modify: `src/supabase-training/row-mappers.test.ts`
- Modify: `src/supabase-training/supabase-training-repository.ts`
- Modify: `src/supabase-training/supabase-training-repository.test.ts`

- [ ] **Step 1: Write failing migration contract tests**

```ts
expect(sql).toContain("create table if not exists public.resource_collection_runs");
expect(sql).toContain("create table if not exists public.resource_collection_items");
expect(sql).toContain("resources_write_service_only");
```

- [ ] **Step 2: Run migration test and verify RED**

Run: `npm test -- --run --maxWorkers=1 supabase/migrations/phase2-schema.test.ts`

Expected: FAIL because the Phase 4 migration does not exist.

- [ ] **Step 3: Write migration and mappings**

```sql
alter table public.resources add column if not exists canonical_url text, add column if not exists source text, add column if not exists external_id text, add column if not exists content_fingerprint text, add column if not exists quality_score integer not null default 0, add column if not exists task_fit integer not null default 0, add column if not exists published_at timestamptz, add column if not exists updated_at timestamptz, add column if not exists ingested_at timestamptz;
create unique index if not exists resources_source_external_uidx on public.resources(source, external_id) where external_id is not null;
create unique index if not exists resources_canonical_url_uidx on public.resources(canonical_url) where canonical_url is not null;
```

Create catalog-run/item tables, indexes, and RLS policies that allow authenticated read-only catalog access and reject browser catalog writes. Keep privileged persistence behind a server-only repository adapter.

- [ ] **Step 4: Write failing mapper/repository persistence tests**

```ts
test("round trips Phase 4 resource provenance and quality fields", async () => { /* map row then assert canonical URL, source, quality, and dates */ });
test("persists one collection run and stable resource upserts", async () => { /* second source/external identity updates, not inserts */ });
```

- [ ] **Step 5: Run tests, implement repository methods, and verify GREEN**

Run: `npm test -- --run --maxWorkers=1 supabase/migrations/phase2-schema.test.ts src/supabase-training/row-mappers.test.ts src/supabase-training/supabase-training-repository.test.ts`

Expected: PASS with catalog upsert and run/item tests.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations src/supabase-training
git commit -m "feat: persist resource collection catalog runs"
```

### Task 5: Resource collection application service and protected route

**Files:**
- Create: `src/resource-collector/collect-resources.ts`
- Create: `src/resource-collector/collect-resources.test.ts`
- Create: `src/app/api/cron/resources/route.ts`
- Create: `src/app/api/cron/resources/route.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write failing workflow tests**

```ts
test("continues when arXiv fails and records a degraded run", async () => {
  const outcome = await collectResources({ sources: [github, failingArxiv], now, repository, curator });
  expect(outcome).toMatchObject({ status: "degraded", inserted: 1, sourceFailures: ["arxiv"] });
});

test("replaying the same run key does not call sources twice", async () => {
  await collectResources(input); await collectResources(input);
  expect(github.search).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run workflow test and verify RED**

Run: `npm test -- --run --maxWorkers=1 src/resource-collector/collect-resources.test.ts`

Expected: FAIL because the collection service does not exist.

- [ ] **Step 3: Implement collection orchestration**

```ts
export async function collectResources(input: CollectResourcesInput): Promise<CollectionOutcome> { /* idempotency lookup, bounded parallel source calls, dedupe, availability, curate/fallback, score, persist */ }
```

Never persist raw provider payloads or model prompts. Treat source error, invalid candidate, unavailable URL, enrichment fallback, inserted, updated, and duplicate as explicit item dispositions.

- [ ] **Step 4: Write failing route authorization tests**

```ts
test("rejects absent cron secret before source calls", async () => {
  const response = await POST(new Request("http://test/api/cron/resources", { method: "POST" }));
  expect(response.status).toBe(401);
});
```

- [ ] **Step 5: Run route test and verify RED**

Run: `npm test -- --run --maxWorkers=1 src/app/api/cron/resources/route.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 6: Implement protected route and configuration**

```ts
const authorization = request.headers.get("authorization");
if (authorization !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
```

Add `CRON_SECRET`, optional `GITHUB_TOKEN`, and `RESOURCE_COLLECTOR_PROMPT_VERSION=phase4-resource-v1` placeholders to `.env.example`.

- [ ] **Step 7: Run focused tests and commit**

Run: `npm test -- --run --maxWorkers=1 src/resource-collector/collect-resources.test.ts src/app/api/cron/resources/route.test.ts`

Expected: all pass.

```bash
git add src/resource-collector src/app/api/cron/resources .env.example
git commit -m "feat: add protected resource collection workflow"
```

### Task 6: Deterministic daily mission generation

**Files:**
- Create: `src/application/training/generate-daily-training.ts`
- Create: `src/application/training/generate-daily-training.test.ts`
- Create: `src/app/api/cron/daily-training/route.ts`
- Create: `src/app/api/cron/daily-training/route.test.ts`
- Modify: `src/application/training/training-repository.ts`
- Modify: `src/supabase-training/supabase-training-repository.ts`
- Modify: `src/supabase-training/supabase-training-repository.test.ts`

- [ ] **Step 1: Write failing assignment-gate tests**

```ts
test("preserves an active mainline and assigns at most one daily quest", async () => {
  const result = await generateDailyTraining({ state, localDate: "2026-07-18", now });
  expect(result.createdAssignment?.slot).toBe("daily");
  expect(result.state.assignments[mainline.id]).toEqual(mainline);
});

test("prioritizes open penalty debt and blocks recovery difficulty increases", async () => {
  expect((await generateDailyTraining({ state: recoveryState, localDate, now })).reason).toBe("penalty_priority");
});

test("returns resource_gap when no eligible quest has mission-ready resources", async () => {
  expect((await generateDailyTraining({ state: noResourceState, localDate, now })).reason).toBe("resource_gap");
});
```

- [ ] **Step 2: Run the daily-generation test and verify RED**

Run: `npm test -- --run --maxWorkers=1 src/application/training/generate-daily-training.test.ts`

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement deterministic service**

```ts
export async function generateDailyTraining(input: GenerateDailyTrainingInput): Promise<DailyGenerationOutcome> { /* reconcile obligations, detect existing local-date daily assignment, choose mission-ready candidate, create exactly one assignment */ }
```

Use existing `selectHardestFeasibleQuest`, `evaluateMissionReadiness`, calendar helpers, and Phase 3 policy boundaries. Do not generate new quest definitions or modify mainline assignments.

- [ ] **Step 4: Write failing protected route tests**

```ts
test("rejects an invalid cron secret without loading learner pages", async () => { /* expect 401 and repository method not called */ });
test("returns processed, assigned, and skipped counts for an authorized run", async () => { /* expect 200 */ });
```

- [ ] **Step 5: Run route test and verify RED**

Run: `npm test -- --run --maxWorkers=1 src/app/api/cron/daily-training/route.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 6: Implement repository page processing and route**

```ts
export const POST = createDailyTrainingHandler({ verifyCronSecret, processLearnerPage });
```

Use bounded pagination, per-learner/local-date idempotency, and sanitized aggregate response counts. Do not accept a user ID from the scheduler request.

- [ ] **Step 7: Run focused tests and commit**

Run: `npm test -- --run --maxWorkers=1 src/application/training/generate-daily-training.test.ts src/app/api/cron/daily-training/route.test.ts src/supabase-training/supabase-training-repository.test.ts`

Expected: all pass.

```bash
git add src/application/training src/app/api/cron/daily-training src/supabase-training
git commit -m "feat: generate daily training assignments safely"
```

### Task 7: Production resource and agent status interface

**Files:**
- Modify: `src/components/features/view-models.ts`
- Modify: `src/app/_helpers/training-view-models.ts`
- Modify: `src/app/_helpers/training-view-models.test.ts`
- Modify: `src/components/features/resources/resource-library.tsx`
- Modify: `src/components/features/resources/resource-library.test.tsx`
- Modify: `src/components/features/agents/agent-status-board.tsx`
- Modify: `src/components/features/agents/agent-status-board.test.tsx`
- Modify: `src/app/resources/page.tsx`
- Modify: `src/app/agents/page.tsx`

- [ ] **Step 1: Write failing view-model/component tests**

```tsx
test("shows source, quality score, availability, and last verified time", () => {
  render(<ResourceLibrary resources={[resource]} />);
  expect(screen.getByText("GitHub")).toBeVisible();
  expect(screen.getByText("Quality 86")).toBeVisible();
});

test("shows a non-Demo degraded Resource Collector run with aggregate counts", () => {
  render(<AgentStatusBoard agents={[collectorRun]} />);
  expect(screen.getByText("Fallback")).toBeVisible();
});
```

- [ ] **Step 2: Run component tests and verify RED**

Run: `npm test -- --run --maxWorkers=1 src/components/features/resources/resource-library.test.tsx src/components/features/agents/agent-status-board.test.tsx src/app/_helpers/training-view-models.test.ts`

Expected: FAIL because Phase 4 fields are not mapped or rendered.

- [ ] **Step 3: Implement narrow responsive presentation changes**

Expose only non-sensitive provenance fields. Hide unavailable/stale/manual-review catalog rows from recommended sections while retaining clear status in the full library. Add text labels alongside all status colors.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npm test -- --run --maxWorkers=1 src/components/features/resources/resource-library.test.tsx src/components/features/agents/agent-status-board.test.tsx src/app/_helpers/training-view-models.test.ts && npm run typecheck`

Expected: all pass and no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/resources src/components/features/agents src/components/features/view-models.ts src/app/_helpers src/app/resources src/app/agents
git commit -m "feat: show verified resource intelligence"
```

### Task 8: Scheduling, documentation, and complete verification

**Files:**
- Create: `vercel.json`
- Create: `docs/phase-4-resource-collector-setup.md`
- Create: `src/resource-collector/vercel-config.test.ts`
- Modify: `README.md`
- Modify: `e2e/quest-submission.spec.ts` or add `e2e/resource-collector.spec.ts`

- [ ] **Step 1: Write failing schedule/configuration contract test**

```ts
test("Vercel schedule invokes resource collection before daily training", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  expect(config.crons).toEqual(expect.arrayContaining([
    expect.objectContaining({ path: "/api/cron/resources" }),
    expect.objectContaining({ path: "/api/cron/daily-training" }),
  ]));
});
```

- [ ] **Step 2: Run configuration test and verify RED**

Run: `npm test -- --run --maxWorkers=1 src/resource-collector/vercel-config.test.ts`

Expected: FAIL because `vercel.json` does not exist.

- [ ] **Step 3: Add protected schedules and runbook**

```json
{ "crons": [
  { "path": "/api/cron/resources", "schedule": "0 9 * * *" },
  { "path": "/api/cron/daily-training", "schedule": "20 9 * * *" }
] }
```

Document required environment variables, migration order, manual curl trigger format with secret redacted, idempotency behavior, monitoring queries, quality evaluation sample, and production smoke test. Update README Phase 4 status and exclusions.

- [ ] **Step 4: Add browser regression coverage**

```ts
test("resources page exposes verified quality and availability without horizontal overflow", async ({ page }) => { /* use Demo fixture with Phase 4 fields; assert labels at 375px */ });
```

- [ ] **Step 5: Run full verification**

Run: `npm run lint && npm run typecheck && npm run test:unit -- --maxWorkers=1 && npm run build && npm run test:e2e`

Expected: lint has zero warnings, TypeScript has zero errors, all unit/integration tests pass, build includes both cron routes, and all desktop/mobile browser scenarios pass.

- [ ] **Step 6: Run security and migration checks**

Run: `git grep -n -E "sk-[A-Za-z0-9_-]{16,}|sb_secret_|service_role"; git diff --check`

Expected: no committed secret values, no client-side secret exposure, and no whitespace errors. Inspect migration RLS policies manually before commit.

- [ ] **Step 7: Commit**

```bash
git add vercel.json docs README.md e2e src/resource-collector/vercel-config.test.ts
git commit -m "docs: add phase 4 operations guidance"
```

## Plan self-review

- Spec coverage: Tasks 1–3 cover resource contract, source adapters, deduplication, AI enrichment, and fallback. Tasks 4–5 cover persistence, traceability, RLS, and protected collection. Task 6 covers daily assignment. Tasks 7–8 cover UI, scheduling, documentation, browser coverage, and acceptance verification.
- Scope: no task introduces crawling, MCP, arbitrary quest generation, or a worker service.
- Type consistency: `ResourceCandidate`, `ResourceIdentity`, `ResourceCuration`, `CollectResourcesInput`, `CollectionOutcome`, and `DailyGenerationOutcome` are introduced before their consuming tasks.
- Placeholder scan: no incomplete implementation markers are used; each task has focused test-first commands and explicit commit boundaries.
