# AI Daily Quest Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate one validated, user-specific AI daily quest during the existing cron and fall back to the catalog on every failure.

**Architecture:** Extend the Learning Strategist with a separate strict generation contract, validate proposals in a pure deterministic policy gate, and orchestrate generation behind an injectable workflow. Persist accepted quests and assignments through one Supabase RPC while keeping the current catalog selector as fallback.

**Tech Stack:** Next.js 16, TypeScript 6, Zod 4, OpenAI Responses API, Supabase/PostgreSQL, Vitest

---

## File structure

- Create `src/ai/daily-quest-contracts.ts`: strict AI proposal schema and public types.
- Create `src/ai/daily-quest-context.ts`: bounded generation context builder.
- Create `src/ai/run-daily-quest-generator.ts`: one-call Learning Strategist adapter and diagnostics.
- Create `src/domain/training/validate-generated-daily-quest.ts`: pure deterministic policy gate.
- Create `src/application/training/generate-ai-daily-training.ts`: AI-first orchestration with catalog fallback.
- Create `src/supabase-training/generated-quest-writer.ts`: typed RPC adapter for atomic persistence.
- Modify `src/ai/prompts/learning-strategist.ts`: add generation-specific instructions.
- Modify `src/app/api/cron/daily-training/route.ts`: wire configuration, workflow, persistence, and counts.
- Modify `src/supabase-training/row-mappers.ts` and repository query behavior: map ownership/source and prevent service-role cross-user reads.
- Create `supabase/migrations/202607200003_ai_daily_quest_generation.sql`: columns, constraints, RLS, and atomic RPC.
- Update `README.md` and deployment documentation with the new prompt version and migration steps.

### Task 1: Strict generation contract

**Files:**
- Create: `src/ai/daily-quest-contracts.ts`
- Create: `src/ai/daily-quest-contracts.test.ts`
- Modify: `src/ai/prompts/learning-strategist.ts`
- Modify: `src/ai/prompts/prompts.test.ts`

- [ ] **Step 1: Write failing schema tests**

Cover a fully valid proposal and rejection of extra fields, more than five steps, no required evidence, unsupported enums, and skill-weight fields outside zero through one. The desired API is:

```ts
const result = GeneratedDailyQuestProposalSchema.safeParse(proposal);
expect(result.success).toBe(true);
```

- [ ] **Step 2: Verify RED**

Run `npm test -- src/ai/daily-quest-contracts.test.ts` and expect failure because the module does not exist.

- [ ] **Step 3: Implement the strict Zod contract and generation prompt**

Export `GeneratedDailyQuestProposalSchema` and `GeneratedDailyQuestProposal`. Reuse existing quest, evidence, artifact, and skill enum values. Keep policy decisions such as total weight and resource existence out of the structural schema. Add `dailyQuestGenerationInstructions(promptVersion)` that explicitly denies reward, identity, deadline, and verification authority.

- [ ] **Step 4: Verify GREEN**

Run `npm test -- src/ai/daily-quest-contracts.test.ts src/ai/prompts/prompts.test.ts` and expect all focused tests to pass.

- [ ] **Step 5: Commit**

Commit as `feat: define AI daily quest contract`.

### Task 2: Bounded context and deterministic policy gate

**Files:**
- Create: `src/ai/daily-quest-context.ts`
- Create: `src/ai/daily-quest-context.test.ts`
- Create: `src/domain/training/validate-generated-daily-quest.ts`
- Create: `src/domain/training/validate-generated-daily-quest.test.ts`

- [ ] **Step 1: Write failing context and policy tests**

Verify that context contains the deterministic difficulty ceiling, two weakest skills, at most seven recent daily quests, artifact type counts, and at most ten available resources without evidence text or private URLs. Verify rejection codes for excessive time/difficulty, missing required evidence, invalid weight totals, invalid resources, duplicates, and unsafe/paid dependencies. Verify a self-contained zero-resource proposal passes.

- [ ] **Step 2: Verify RED**

Run `npm test -- src/ai/daily-quest-context.test.ts src/domain/training/validate-generated-daily-quest.test.ts` and expect missing-module failures.

- [ ] **Step 3: Implement minimal pure functions**

Expose:

```ts
buildDailyQuestGenerationContext(state: TrainingState): DailyQuestGenerationContext
validateGeneratedDailyQuest(input: {
  proposal: GeneratedDailyQuestProposal;
  context: DailyQuestGenerationContext;
}): { accepted: true } | { accepted: false; code: GeneratedQuestRejectionCode };
```

Use normalized lexical token overlap for recent-title duplication. Match any supplied resource ID to the bounded available resources and targeted skills. Detect forbidden paid-only, credential, destructive, and privilege-escalation terms conservatively.

- [ ] **Step 4: Verify GREEN and refactor**

Run the two focused test files and keep limits/constants named and local to the feature.

- [ ] **Step 5: Commit**

Commit as `feat: validate generated daily quests`.

### Task 3: AI generation workflow with fallback

**Files:**
- Create: `src/ai/run-daily-quest-generator.ts`
- Create: `src/ai/run-daily-quest-generator.test.ts`
- Create: `src/application/training/generate-ai-daily-training.ts`
- Create: `src/application/training/generate-ai-daily-training.test.ts`

- [ ] **Step 1: Write failing workflow tests**

Cover accepted AI output, missing AI configuration, gateway failure, invalid policy output, no-resource accepted output, existing daily assignment, penalty priority, and no fallback candidate. Assert that the model is called at most once and never called when idempotency or penalty rules already block generation.

- [ ] **Step 2: Verify RED**

Run `npm test -- src/ai/run-daily-quest-generator.test.ts src/application/training/generate-ai-daily-training.test.ts` and expect missing-module failures.

- [ ] **Step 3: Implement the AI adapter and orchestration**

The adapter makes one structured response request and returns sanitized diagnostics. The application workflow first applies existing assignment/penalty guards, then attempts AI generation, supplies trusted quest fields and deterministic base XP, and otherwise calls `generateDailyTraining()` for catalog fallback.

Return a discriminated outcome with `source: "ai_generated" | "catalog_fallback" | "none"`, optional generated quest/assignment, fallback reason, and diagnostic.

- [ ] **Step 4: Verify GREEN**

Run the focused workflow tests and the existing `generate-daily-training.test.ts` regression tests.

- [ ] **Step 5: Commit**

Commit as `feat: orchestrate AI daily quest generation`.

### Task 4: Database ownership, RLS, and atomic persistence

**Files:**
- Create: `supabase/migrations/202607200003_ai_daily_quest_generation.sql`
- Modify: `supabase/migrations/phase2-schema.test.ts`
- Create: `src/supabase-training/generated-quest-writer.ts`
- Create: `src/supabase-training/generated-quest-writer.test.ts`
- Modify: `src/supabase-training/row-mappers.ts`
- Modify: `src/supabase-training/row-mappers.test.ts`
- Modify: `src/supabase-training/supabase-training-repository.ts`
- Modify: `src/supabase-training/supabase-training-repository.test.ts`
- Modify: `src/domain/training/types.ts`
- Modify: `src/domain/training/schemas.ts`

- [ ] **Step 1: Write failing persistence and migration tests**

Assert the migration adds ownership/source/generation metadata, replaces the broad quest read policy, constrains catalog versus generated ownership, and defines one atomic `create_generated_daily_quest` RPC. Assert the writer passes trusted fields, and quest mapping preserves source/owner metadata. Assert repository reads explicitly scope catalog quests plus the current user's generated quests even under service role.

- [ ] **Step 2: Verify RED**

Run `npm test -- supabase/migrations/phase2-schema.test.ts src/supabase-training/generated-quest-writer.test.ts src/supabase-training/row-mappers.test.ts src/supabase-training/supabase-training-repository.test.ts` and expect targeted failures.

- [ ] **Step 3: Implement migration and adapters**

The RPC accepts a complete trusted quest JSON object, assignment ID/date/deadline, and generation key; it derives the authenticated/explicit server user safely, inserts both rows in one PostgreSQL transaction, and respects the unique daily generation constraint. Grant execution only to the service role. Replace the authenticated quest read policy with catalog-or-owner visibility and add an owner/source consistency constraint.

- [ ] **Step 4: Verify GREEN**

Run the focused tests plus `git diff --check`.

- [ ] **Step 5: Commit**

Commit as `feat: persist private generated quests atomically`.

### Task 5: Daily cron integration and diagnostics

**Files:**
- Modify: `src/app/api/cron/daily-training/route.ts`
- Modify: `src/app/api/cron/daily-training/route.test.ts`
- Modify: `src/ai/config.ts`
- Modify: `src/ai/config.test.ts`

- [ ] **Step 1: Write failing cron tests**

Inject learner processing dependencies and verify AI acceptance writes through the generated writer, AI rejection assigns the catalog fallback, a missing key marks degraded fallback, one learner failure does not stop the batch, and aggregate output includes `aiGenerated`, `catalogFallback`, and `degraded` without exposing private task data.

- [ ] **Step 2: Verify RED**

Run `npm test -- src/app/api/cron/daily-training/route.test.ts src/ai/config.test.ts` and expect assertion failures for the absent behavior.

- [ ] **Step 3: Wire the workflow**

Create the OpenAI gateway only when configuration exists, load each user's scoped snapshot, execute one generation workflow, persist the accepted private quest through the RPC, persist a catalog fallback assignment through the existing path, and write a Learning Strategist diagnostic to `agent_runs` with a generation-specific prompt version.

- [ ] **Step 4: Verify GREEN**

Run cron, AI configuration, workflow, and existing Phase 3 feedback tests.

- [ ] **Step 5: Commit**

Commit as `feat: generate daily quests from cron`.

### Task 6: Documentation and full verification

**Files:**
- Modify: `README.md`
- Create: `docs/ai-daily-quest-generation-setup.md`

- [ ] **Step 1: Document deployment and smoke testing**

Document migration order, `OPENAI_API_KEY`, `OPENAI_MODEL`, the new generation prompt version, `CRON_SECRET`, authorized cron invocation, expected aggregate counters, database verification queries, fallback testing, and rollback behavior.

- [ ] **Step 2: Run focused feature verification**

Run all new contract, context, policy, workflow, persistence, migration, and cron tests. Expected result: zero failures.

- [ ] **Step 3: Run repository verification**

Run, in order:

```text
npm run lint
npm run typecheck
npm run test:unit
npm run build
git diff --check
```

Expected result: every command exits zero. Playwright remains excluded unless the user requests it.

- [ ] **Step 4: Review requirements against the approved design**

Confirm user-specific visibility, mandatory evidence, optional resources, one-call generation, deterministic policy authority, atomic persistence, daily idempotency, and catalog fallback with direct test evidence.

- [ ] **Step 5: Commit**

Commit as `docs: document AI daily quest deployment`.
