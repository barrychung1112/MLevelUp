# MLevelUp Phase 3 AI Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock submission feedback in Supabase mode with safe, server-side AI feedback and next-mission adjustment while preserving deterministic authority over completion, XP, skills, deadlines, penalties, recovery, and resets.

**Architecture:** The authenticated Next.js submission route loads user-owned state through a bearer-token-bound Supabase client, runs the existing deterministic evaluator, invokes three bounded OpenAI Responses API modules, applies a pure deterministic policy gate, and persists one auditable outcome. Demo mode stays local and deterministic. Any missing configuration, timeout, rate limit, or invalid model output falls back without blocking submission.

**Tech Stack:** Next.js 16 App Router, TypeScript 6, React 19, Supabase JS, OpenAI Responses API, Zod 4 structured outputs, Vitest, Testing Library, Playwright.

---

## Delivery rules

- Never expose `OPENAI_API_KEY` or call OpenAI from the browser.
- Never accept user ID, XP, skill deltas, progress, assignment status, deadlines, or penalties from the submission request.
- Never call a live model from automated tests.
- Keep Resource Collector mocked until Phase 4.
- Complete every task test-first: add a failing test, run it, implement the smallest change, rerun the focused test, then commit.
- Run the full verification suite before declaring Phase 3 complete.

### Task 1: Add server AI configuration and strict contracts

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Create: `src/ai/config.ts`
- Create: `src/ai/config.test.ts`
- Create: `src/ai/contracts.ts`
- Create: `src/ai/contracts.test.ts`

- [ ] Install the official `openai` package and record the server-only variables `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5.6-terra`, and `OPENAI_PROMPT_VERSION=phase3-v1` in `.env.example` without adding a real key.
- [ ] Write failing tests proving configuration is optional at runtime, defaults model and prompt version safely, and never reads a `NEXT_PUBLIC_OPENAI_API_KEY` fallback.
- [ ] Define strict Zod schemas for `LearningStrategyProposal`, `AdjustmentProposal`, `CoordinatorFeedback`, run diagnostics, and workflow results. Bound every string, array, enum, score, and confidence field.
- [ ] Add rejection tests for unknown keys and forbidden authority fields such as `xpAwarded`, `assignmentStatus`, `deadline`, `penalty`, and `recoveryDeadline`.
- [ ] Implement configuration parsing and contracts, then run `npm test -- src/ai/config.test.ts src/ai/contracts.test.ts`.
- [ ] Commit: `feat: add phase 3 AI contracts and configuration`.

### Task 2: Implement the deterministic AI policy gate

**Files:**
- Create: `src/domain/training/ai-policy.ts`
- Create: `src/domain/training/ai-policy.test.ts`
- Modify: `src/domain/training/rewards.ts` only if normalization needs a reusable exported helper

- [ ] Write failing table-driven tests for: hard failures remaining `needs_revision`; score capped at 59 on hard failure; confidence below 0.6 using the deterministic score; valid scores clamped to `deterministic - 15` and `deterministic + 5`; difficulty movement limited to one; no increase during recovery; open penalty debt taking priority.
- [ ] Write tests proving skill redistribution changes at most 20%, never adds weight to a zero-weight skill, produces non-negative normalized weights, and falls back to quest weights when invalid.
- [ ] Implement one pure `adjudicateAiFeedback` function returning only permitted overrides: final quality score, normalized skill weights, accepted adjustment, learner-facing explanation, recommendation, confidence, and provenance.
- [ ] Keep XP, state transitions, deadlines, penalty creation, recovery, and reset logic out of this module.
- [ ] Run `npm test -- src/domain/training/ai-policy.test.ts src/domain/training/rewards.test.ts`.
- [ ] Commit: `feat: enforce deterministic AI adjudication policy`.

### Task 3: Make the existing submission executor accept bounded enrichment

**Files:**
- Modify: `src/domain/training/types.ts`
- Modify: `src/domain/training/schemas.ts`
- Modify: `src/domain/training/schemas.test.ts`
- Modify: `src/application/training/submit-quest.ts`
- Modify: `src/application/training/submit-quest.test.ts`
- Modify: mapper and fixture files reported by TypeScript

- [ ] Add feedback provenance (`demo`, `deterministic`, `ai`, `ai_fallback`), optional model/prompt/confidence/adjustment/recommended quest fields, and real agent diagnostic fields. Change `AgentStatus.isMock` from literal `true` to boolean.
- [ ] Write schema tests that preserve backward compatibility with existing Phase 2 state while rejecting malformed provenance and diagnostics.
- [ ] Write failing executor tests for an optional adjudication object: its permitted score and skill-weight overrides affect existing reward math; its prose populates feedback; it cannot supply XP or state transitions; no adjudication produces byte-for-byte equivalent Demo behavior.
- [ ] Refactor `executeSubmitQuest` to calculate the deterministic evaluation first, accept only a policy-gate result, and continue using `calculateReward` and `transitionAssignment` as the sole reward and completion authorities.
- [ ] Run `npm test -- src/domain/training/schemas.test.ts src/application/training/submit-quest.test.ts` and `npm run typecheck`.
- [ ] Commit: `refactor: accept policy-gated submission enrichment`.

### Task 4: Build compact contexts and versioned prompts

**Files:**
- Create: `src/ai/context.ts`
- Create: `src/ai/context.test.ts`
- Create: `src/ai/prompts/shared.ts`
- Create: `src/ai/prompts/learning-strategist.ts`
- Create: `src/ai/prompts/adjuster.ts`
- Create: `src/ai/prompts/coordinator.ts`
- Create: `src/ai/prompts/prompts.test.ts`

- [ ] Write failing tests proving context builders include only the current quest, deterministic evaluation, bounded evidence/reflection summaries, seven skills, training status, recent outcome counts, available resources, and eligible quest IDs.
- [ ] Test hard limits: reflection and evidence text truncation, recent history cap, eligible catalog cap, unavailable resources excluded, and no user email/access token/raw secret fields.
- [ ] Add separate versioned instructions for Learning Strategist, Adjuster, and Coordinator. Each prompt must explicitly prohibit XP, status, deadline, penalty, recovery, reset, and invented quest/resource authority.
- [ ] Test that prompts contain the applicable authority boundaries and the configured prompt version.
- [ ] Run `npm test -- src/ai/context.test.ts src/ai/prompts/prompts.test.ts`.
- [ ] Commit: `feat: add bounded AI contexts and prompts`.

### Task 5: Implement the OpenAI gateway and three logical agents

**Files:**
- Create: `src/ai/openai-gateway.ts`
- Create: `src/ai/openai-gateway.test.ts`
- Create: `src/ai/learning-strategist.ts`
- Create: `src/ai/adjuster.ts`
- Create: `src/ai/coordinator.ts`
- Create: `src/ai/agents.test.ts`

- [ ] Verify the installed SDK's Responses API structured-output helper and encode it behind an injectable `StructuredResponseGateway`; do not leak SDK types into domain modules.
- [ ] Write gateway tests with a fake transport for valid parsed output, refusal, empty output, schema failure, timeout, 429/5xx retry classification, usage capture, model capture, and sanitized error codes.
- [ ] Implement a server-only OpenAI adapter with one request timeout and one retry only for explicitly retryable failures.
- [ ] Write agent tests proving each module receives only its own bounded context and validates its own schema before returning.
- [ ] Implement Learning Strategist and Adjuster as independent calls and Coordinator as a later synthesis call. Do not fabricate a missing specialist result.
- [ ] Run `npm test -- src/ai/openai-gateway.test.ts src/ai/agents.test.ts`.
- [ ] Commit: `feat: implement structured phase 3 agents`.

### Task 6: Orchestrate AI calls, fallback, and diagnostics

**Files:**
- Create: `src/ai/run-feedback-workflow.ts`
- Create: `src/ai/run-feedback-workflow.test.ts`

- [ ] Write failing tests for the successful order: Learning Strategist and Adjuster complete, Coordinator consumes both validated proposals, then the deterministic policy gate adjudicates the result.
- [ ] Test missing key, timeout, rate limit exhaustion, refusal, invalid schema, specialist failure, Coordinator failure, and policy rejection. Every case must return deterministic fallback feedback without throwing a user-visible AI error.
- [ ] Test diagnostic records for all attempted agents: agent type, status, model, prompt version, latency, tokens when present, sanitized error code, fallback flag, trace ID, and redacted input/output summaries.
- [ ] Implement `runFeedbackWorkflow` with injected clock, gateway, and trace-ID generator so tests stay deterministic.
- [ ] Run `npm test -- src/ai/run-feedback-workflow.test.ts`.
- [ ] Commit: `feat: orchestrate AI feedback with safe fallback`.

### Task 7: Add Phase 3 Supabase persistence and strict RLS

**Files:**
- Create: `supabase/migrations/202607180002_phase3_ai_feedback.sql`
- Modify: `supabase/migrations/phase2-schema.test.ts`
- Modify: `src/supabase-training/row-mappers.ts`
- Modify: `src/supabase-training/row-mappers.test.ts`
- Modify: `src/supabase-training/supabase-training-repository.ts`
- Modify: `src/supabase-training/supabase-training-repository.test.ts`

- [ ] Add failing SQL contract tests for the new feedback and agent-run columns, indexes, constraints, strict user ownership, and removal of the `user_id is null` agent policy.
- [ ] Add `submission_id`, model/prompt/latency/token/error/fallback/trace diagnostics to `agent_runs`; add source/model/prompt/confidence/adjustment/recommendation fields to `feedback`; enforce allowed enums and numeric ranges.
- [ ] Add an idempotency constraint that permits one run per user, submission, agent type, and prompt version, while preserving all three agent records.
- [ ] Write mapper/repository tests proving Phase 2 rows still map safely, Phase 3 fields round-trip, and no raw prompt or API key is persisted.
- [ ] Expose one narrowly named persistence operation for an already-produced `SubmissionOutcome` plus agent diagnostics; keep ownership derived from the authenticated repository user.
- [ ] Run `npm test -- supabase/migrations/phase2-schema.test.ts src/supabase-training/row-mappers.test.ts src/supabase-training/supabase-training-repository.test.ts`.
- [ ] Commit: `feat: persist AI feedback and agent diagnostics`.

### Task 8: Add the authenticated server submission boundary

**Files:**
- Create: `src/lib/supabase/server.ts`
- Create: `src/app/api/training/submit/route.ts`
- Create: `src/app/api/training/submit/route.test.ts`
- Create: `src/application/training/submit-with-feedback.ts`
- Create: `src/application/training/submit-with-feedback.test.ts`

- [ ] Extract an application service that performs: idempotency lookup, snapshot load, deterministic evaluation, optional AI workflow, policy adjudication, `executeSubmitQuest`, calibration handling, persistence, and result reload.
- [ ] Write service tests showing duplicate idempotency keys return the previous result without another model call, deterministic hard failure skips unauthorized enrichment, persistence failure is retryable, and successful calls persist feedback plus diagnostics atomically from the caller's perspective.
- [ ] Write route tests for malformed/oversized body (400/413), missing or invalid bearer token (401), unknown or foreign assignment (404), success (200), idempotent replay (200), and persistence failure (503). Assert authentication and validation happen before any model call.
- [ ] Implement a bearer-token-bound Supabase client using the public project URL/key and validate the token through `auth.getUser(token)`. Never use a service-role key.
- [ ] Implement the route with `SubmitQuestInputSchema`, explicit request-size limits, sanitized errors, and no raw model output returned to the browser.
- [ ] Run `npm test -- src/application/training/submit-with-feedback.test.ts src/app/api/training/submit/route.test.ts`.
- [ ] Commit: `feat: add authenticated AI submission endpoint`.

### Task 9: Delegate Supabase-mode submissions to the server

**Files:**
- Create: `src/supabase-training/server-submit-client.ts`
- Create: `src/supabase-training/server-submit-client.test.ts`
- Modify: `src/supabase-training/supabase-training-repository.ts`
- Modify: `src/supabase-training/supabase-training-repository.test.ts`
- Modify: `src/providers/training-provider.tsx`
- Modify: `src/providers/training-provider.test.tsx`

- [ ] Define an injectable browser submission client. It obtains the current Supabase access token, posts only `SubmitQuestInput`, maps the bounded outcome, and handles authentication expiry, abort, retryable server failure, and malformed responses.
- [ ] Write repository/provider tests proving configured Supabase mode uses the server delegate exactly once, Demo mode remains local, and the OpenAI key/model never enters a client bundle or request.
- [ ] Keep a deterministic repository path injectable for server/application tests; do not duplicate reward or transition logic in the browser client.
- [ ] Implement provider wiring and user-facing retry behavior without silently submitting twice under a new idempotency key.
- [ ] Run `npm test -- src/supabase-training/server-submit-client.test.ts src/supabase-training/supabase-training-repository.test.ts src/providers/training-provider.test.tsx`.
- [ ] Commit: `feat: route authenticated submissions through server`.

### Task 10: Show trustworthy feedback provenance and agent status

**Files:**
- Modify: `src/application/dashboard/dashboard-view-model.ts`
- Modify: `src/application/dashboard/dashboard-view-model.test.ts`
- Modify: `src/components/features/dashboard/dashboard.tsx`
- Modify: `src/components/features/dashboard/dashboard.test.tsx`
- Modify: `src/components/features/agents/agent-status-board.tsx`
- Modify: `src/components/features/agents/agent-status-board.test.tsx`
- Modify related quest result components if feedback is shown there

- [ ] Add view-model tests for `AI`, `Deterministic fallback`, and `Demo` provenance; concise adjustment explanation; recommended next mission; and useful confidence only when available.
- [ ] Add component tests for running/completed/degraded states for Learning Strategist, Adjuster, and Coordinator. Keep Resource Collector visibly mocked for Phase 4.
- [ ] Replace the hardcoded Demo feedback badge with data-driven provenance and add a retry action only for retryable generation failures.
- [ ] Verify narrow mobile layouts do not overflow and all badges/status messages have text labels rather than color-only meaning.
- [ ] Run the focused dashboard/agent tests and `npm run typecheck`.
- [ ] Commit: `feat: display AI feedback provenance and status`.

### Task 11: Documentation, migration handoff, and end-to-end verification

**Files:**
- Modify: `README.md`
- Modify: `.gitignore` only if required to protect local environment files
- Modify: `tests/e2e/training-loop.spec.ts` or the current equivalent
- Create: `docs/phase-3-supabase-setup.md`

- [ ] Document local variables, supported fallback behavior, the SQL migration procedure, model override, data/privacy boundaries, and the fact that Resource Collector remains mocked.
- [ ] Add an integration/E2E assertion that Demo mode still submits deterministically and labels feedback Demo. Add server-route integration coverage with a fake gateway; never require a real OpenAI call in CI.
- [ ] Run all focused Phase 3 tests and inspect failures rather than updating snapshots blindly.
- [ ] Run `npm run lint` and require exit code 0 with zero warnings.
- [ ] Run `npm run typecheck` and require exit code 0.
- [ ] Run `npm run test:unit` and record passed file/test counts.
- [ ] Run `npm run build` and require a successful production build with the API route included.
- [ ] Run `npm run test:e2e` and record passed scenario count.
- [ ] Search tracked files and the built client assets for `sk-`, `OPENAI_API_KEY=`, service-role keys, and the user's Supabase access token; require no secret values.
- [ ] Run `git diff --check`, inspect every changed file against the approved design, and verify the working tree contains no unrelated user changes.
- [ ] Commit: `docs: add phase 3 setup and verification guidance`.

## Final acceptance evidence

Phase 3 is complete only when all of the following are demonstrated from fresh commands:

- Supabase-mode submission is authenticated and server-side.
- AI outputs are schema-validated and policy-gated.
- XP and state transitions are computed only by deterministic domain code.
- Missing/failed AI degrades to deterministic feedback without blocking a valid submission.
- Duplicate submission requests do not double-award XP or repeat model calls.
- Feedback and agent diagnostics persist under strict user-owned RLS.
- Dashboard clearly distinguishes AI, fallback, and Demo output.
- Lint, typecheck, unit tests, production build, E2E tests, secret scan, and `git diff --check` all pass.

