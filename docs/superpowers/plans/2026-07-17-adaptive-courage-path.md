# Adaptive Courage Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace user-selected training contracts with a courage oath, a difficult calibration quest, and deterministic selection of the hardest feasible next quest.

**Architecture:** Keep quest difficulty as catalog metadata while removing contract selection from the profile and assignment flow. A focused adaptive selector uses skill scores and weekly time; repositories call the same selector so mock and Supabase behavior remain equivalent. The first calibration quest uses the normal submission pipeline with a calibration-specific scoring branch that accepts partial evidence.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase JS, Postgres migrations, Zod, Vitest, Playwright.

---

## File map

- `src/domain/training/adaptive-selector.ts`: pure calculation of daily budget, challenge ceiling, and next quest.
- `src/domain/training/calibration.ts`: converts the first submission score breakdown into initial skill scores.
- `src/components/features/onboarding/courage-oath-dialog.tsx`: first-login oath UI only.
- `src/components/features/onboarding/onboarding.tsx`: identity, goal, weekly time, and timezone only.
- `src/mocks/training/mock-training-repository.ts` and `src/supabase-training/supabase-training-repository.ts`: persist acceptance, create the calibration assignment, and call the shared selector.
- `supabase/migrations/202607170001_adaptive_courage_path.sql`: schema transition and calibration quest seed.

### Task 1: Remove training contracts from the domain boundary

**Files:**
- Modify: `src/domain/training/types.ts`
- Modify: `src/domain/training/schemas.ts`
- Modify: `src/domain/training/constants.ts`
- Test: `src/domain/training/schemas.test.ts`
- Test: `src/domain/training/constants.test.ts`

- [ ] Write failing schema tests proving `UserProfile` and `CompleteOnboardingInput` reject a `contract` field while quests accept `purpose: "calibration" | "training"`.
- [ ] Run `npx.cmd vitest run src/domain/training/schemas.test.ts src/domain/training/constants.test.ts --maxWorkers=1`; expect failures referencing the old required contract and missing purpose.
- [ ] Remove `TrainingContract` from user-facing profile/input types, add `QuestPurpose`, and add `purpose` to `QuestSchema`.
- [ ] Keep `DifficultySchema` unchanged because task/resource difficulty remains visible and used by rewards.
- [ ] Run the focused tests; expect all passing.
- [ ] Commit with `git commit -m "refactor: replace training contracts with quest purpose"`.

### Task 2: Add the adaptive selector

**Files:**
- Create: `src/domain/training/adaptive-selector.ts`
- Create: `src/domain/training/adaptive-selector.test.ts`

- [ ] Write failing tests for daily budgets clamped to 30–180 minutes and ceilings `2/3/4/5` at skill boundaries `0/30/45/65`.
- [ ] Write failing tests proving selection orders candidates by feasible difficulty, weakest-skill coverage, then closeness to the time budget.
- [ ] Write a failing fallback test proving a lower-difficulty quest is returned when no candidate fits the initial ceiling and budget.
- [ ] Run `npx.cmd vitest run src/domain/training/adaptive-selector.test.ts --maxWorkers=1`; expect module-not-found failure.
- [ ] Implement `dailyBudget(weeklyMinutes)`, `difficultyCeiling(skills)`, and `selectHardestFeasibleQuest(input)` as pure deterministic functions.
- [ ] Run the focused tests; expect all passing.
- [ ] Commit with `git commit -m "feat: add adaptive quest selector"`.

### Task 3: Add courage acceptance and calibration persistence

**Files:**
- Create: `supabase/migrations/202607170001_adaptive_courage_path.sql`
- Modify: `supabase/migrations/phase2-schema.test.ts`
- Modify: `src/supabase-training/row-mappers.ts`
- Test: `src/supabase-training/row-mappers.test.ts`

- [ ] Add failing structural assertions for `challenge_accepted_at`, quest `purpose`, removal of the two contract columns, and the `quest-courage-challenge` seed.
- [ ] Add a migration that marks existing onboarded profiles accepted, removes `profiles.contract` and `quests.training_contract`, adds quest purpose, and upserts the difficulty-4 calibration quest.
- [ ] Make the migration idempotent and preserve all existing quest IDs, difficulty values, submissions, and assignments.
- [ ] Update row mapping tests and mappers for the new profile and quest shapes.
- [ ] Run `npx.cmd vitest run supabase/migrations/phase2-schema.test.ts src/supabase-training/row-mappers.test.ts --maxWorkers=1`; expect all passing.
- [ ] Commit with `git commit -m "feat: migrate training data to adaptive difficulty"`.

### Task 4: Implement the courage oath and simplified onboarding

**Files:**
- Create: `src/components/features/onboarding/courage-oath-dialog.tsx`
- Create: `src/components/features/onboarding/courage-oath-dialog.test.tsx`
- Modify: `src/components/features/onboarding/onboarding.tsx`
- Modify: `src/components/features/onboarding/onboarding.test.tsx`
- Modify: `src/app/onboarding/page.tsx`
- Modify: `src/application/training/training-repository.ts`

- [ ] Write failing UI tests for the approved warning copy, accepting the challenge, retrying a failed acceptance, and cancelling to sign out.
- [ ] Write failing onboarding tests proving there is no training-contract control and that name, goal, weekly minutes, and timezone are submitted.
- [ ] Add repository command `acceptChallenge(): Promise<TrainingState>` and render the oath before onboarding when `challengeAcceptedAt` is null.
- [ ] Implement the dialog with primary action `接受挑戰` and secondary action `暫不開始`; keep keyboard focus trapped and restore focus on recoverable errors.
- [ ] Remove contract cards and validation from onboarding; successful onboarding creates only the calibration assignment and navigates to its detail page.
- [ ] Run the focused component and route integration tests with `--maxWorkers=1`; expect all passing.
- [ ] Commit with `git commit -m "feat: add courage oath onboarding"`.

### Task 5: Calibrate skills from complete or partial submissions

**Files:**
- Create: `src/domain/training/calibration.ts`
- Create: `src/domain/training/calibration.test.ts`
- Modify: `src/application/training/submit-quest.ts`
- Modify: `src/mocks/training/mock-training-repository.ts`
- Modify: `src/supabase-training/supabase-training-repository.ts`
- Test: `src/mocks/training/mock-training-repository.test.ts`
- Test: `src/supabase-training/supabase-training-repository.test.ts`

- [ ] Write failing tests for complete, partial, and near-empty calibration submissions; each must save feedback and return bounded skill scores without blocking Dashboard access.
- [ ] Define the calibration mapping: five observable skills receive scores derived from evidence completeness, validity, reflection, and artifact readiness; Research Sense and Product Thinking remain 20.
- [ ] Keep the existing XP eligibility rule: low-quality calibration may award zero XP while still updating the initial skill estimate.
- [ ] Implement calibration as a special branch only when `quest.purpose === "calibration"`; normal quest evaluation and anti-cheat behavior remain unchanged.
- [ ] Run focused domain and repository tests with one worker; expect all passing.
- [ ] Commit with `git commit -m "feat: calibrate skills from courage challenge"`.

### Task 6: Use adaptive assignment in both repositories

**Files:**
- Modify: `src/mocks/training/mock-training-repository.ts`
- Modify: `src/supabase-training/supabase-training-repository.ts`
- Modify: `src/mocks/training/seed.ts`
- Test: `src/mocks/training/mock-training-repository.test.ts`
- Test: `src/supabase-training/supabase-training-repository.test.ts`

- [ ] Replace `createAssignmentsForContract` and `assignmentsFor(contract, ...)` tests with selector-based assignment tests.
- [ ] Prove both repositories produce the same assignment for the same skills, weekly minutes, catalog, and date.
- [ ] Ensure the first assignment is always `quest-courage-challenge`; after its first submission, generate the hardest feasible training quest.
- [ ] Add an idempotency test proving repeated snapshot or onboarding calls cannot create duplicate daily assignments.
- [ ] Run all repository tests with one worker; expect all passing.
- [ ] Commit with `git commit -m "feat: assign hardest feasible daily quest"`.

### Task 7: Update Profile, Dashboard, archive, and E2E flows

**Files:**
- Modify: `src/components/features/profile/profile-settings.tsx`
- Modify: `src/components/features/profile/profile-settings.test.tsx`
- Modify: `src/components/features/dashboard/dashboard.tsx`
- Modify: `src/components/features/dashboard/dashboard.test.tsx`
- Modify: `src/app/_helpers/training-view-models.ts`
- Modify: `src/app/routes.integration.test.tsx`
- Modify: `e2e/onboarding.spec.ts`
- Modify: `e2e/persistence-reset.spec.ts`
- Create: `e2e/adaptive-courage-path.spec.ts`

- [ ] Remove contract controls and labels; add read-only `自適應難度：啟用`, current ceiling, and daily time budget.
- [ ] Update integration tests to use the oath and calibration quest instead of clicking `普通人模式`.
- [ ] Add E2E coverage for cancel/sign-out, accept/onboarding, partial calibration submission, Dashboard access, and the next adaptive quest.
- [ ] Run `npm run lint`, `npm run typecheck`, and `npx.cmd vitest run --maxWorkers=1`; expect zero failures.
- [ ] Run `npm run test:e2e`; expect the full desktop/mobile suite to pass.
- [ ] Run `git diff --check` and inspect that no publishable/secret key was added to tracked files.
- [ ] Commit with `git commit -m "feat: complete adaptive courage training flow"`.

## Manual Supabase acceptance

- Apply `202607170001_adaptive_courage_path.sql` in the project SQL Editor.
- Sign in with a new email, verify the oath appears once, cancel and sign in again, then accept.
- Submit only part of the calibration evidence and verify Dashboard access plus persisted feedback.
- Confirm the next assignment respects the stored weekly minutes and calibrated skill ceiling.

