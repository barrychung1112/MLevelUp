# Mainline and Daily Missions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace configurable onboarding and the single daily quest loop with a fixed five-hour ML-engineer program containing a multi-day mainline mission, a 24-hour daily mission, resource-gated assignment, penalties, and seven-day failure recovery.

**Architecture:** Extend the existing domain state and repository boundary instead of creating a scheduling service. Pure domain functions validate mission clarity/resources and reconcile deadlines idempotently; both mock and Supabase repositories invoke the same functions before returning a snapshot or after a command. The existing quest, assignment, submission, feedback, and artifact pipelines remain the persistence backbone.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod 4, Supabase/Postgres/RLS, Vitest, Testing Library, Playwright.

---

## File map

- `src/domain/training/mission-readiness.ts`: mission clarity and resource gate.
- `src/domain/training/reconcile-training.ts`: expiry, penalties, failure review, recovery, and automatic reset decisions.
- `src/domain/training/types.ts` and `schemas.ts`: target, scope, checkpoint, deadline, and recovery state.
- `src/mocks/training/seed.ts`: one resource-ready mainline, daily, penalty, and calibration catalog.
- `src/mocks/training/mock-training-repository.ts`: shared reconciliation and dual-track assignment in Demo mode.
- `src/supabase-training/row-mappers.ts` and `supabase-training-repository.ts`: equivalent persisted behavior.
- `src/components/features/onboarding/onboarding.tsx`: one fixed career target.
- `src/components/features/dashboard/dashboard.tsx`: mainline, daily, penalty, and recovery panels.
- `supabase/migrations/202607180001_mainline_daily_missions.sql`: additive schema migration and catalog seed.

### Task 1: Add the mission and recovery domain model

**Files:**
- Modify: `src/domain/training/types.ts`
- Modify: `src/domain/training/schemas.ts`
- Test: `src/domain/training/schemas.test.ts`

- [ ] **Step 1: Write failing schema tests**

Add fixtures proving the new shapes and fixed defaults:

```ts
expect(UserProfileSchema.parse({
  ...profile,
  targetRole: "machine-learning-engineer",
  dailyMinutes: 300,
  consecutiveFailureDays: 0,
  trainingStatus: "normal",
  recoveryStartedAt: null,
  recoveryDeadline: null,
})).toMatchObject({ dailyMinutes: 300, trainingStatus: "normal" });

expect(QuestSchema.parse({
  ...quest,
  scope: "main",
  durationDays: 5,
  executionSteps: ["Inspect schema", "Run EDA", "Document findings"],
  successMetrics: ["At least three data-quality findings"],
  outOfScope: ["Production deployment"],
})).toMatchObject({ scope: "main" });
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npx.cmd vitest run src/domain/training/schemas.test.ts --maxWorkers=1`  
Expected: FAIL because the new fields and enums do not exist.

- [ ] **Step 3: Add exact types and schemas**

Add:

```ts
export type TargetRole = "machine-learning-engineer";
export type TrainingStatus = "normal" | "failure_review" | "recovery";
export type QuestScope = "main" | "daily" | "penalty" | "calibration";

export interface UserProfile {
  // existing identity fields remain
  targetRole: TargetRole;
  dailyMinutes: 300;
  consecutiveFailureDays: number;
  trainingStatus: TrainingStatus;
  recoveryStartedAt: string | null;
  recoveryDeadline: string | null;
}
```

Extend `Quest` with `scope`, `durationDays`, `executionSteps`, `successMetrics`, and `outOfScope`. Extend `QuestAssignment` with optional `parentAssignmentId`, `checkpointIndex`, `dueAt`, `expiredAt`, and `penaltySourceAssignmentId`. Require non-empty steps/metrics for every non-calibration quest and exactly `300` for `dailyMinutes`.

Extend `Resource` with:

```ts
prerequisites: string[];
requiredTools: string[];
costTier: "free" | "paid";
availabilityStatus: "available" | "unavailable" | "unchecked";
lastCheckedAt: string | null;
fallbackResourceId?: string;
```

Add `trainingReset` to `ActivityEvent["type"]` so automatic resets can leave an audit record.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npx.cmd vitest run src/domain/training/schemas.test.ts --maxWorkers=1 && npm run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/domain/training/types.ts src/domain/training/schemas.ts src/domain/training/schemas.test.ts
git commit -m "feat: add mainline mission domain model"
```

### Task 2: Enforce mission clarity and resource readiness

**Files:**
- Create: `src/domain/training/mission-readiness.ts`
- Create: `src/domain/training/mission-readiness.test.ts`
- Modify: `src/domain/training/adaptive-selector.ts`
- Test: `src/domain/training/adaptive-selector.test.ts`

- [ ] **Step 1: Write failing readiness tests**

Cover missing steps, missing metrics, missing evidence, no resources, unavailable primary resources, excessive resource time, and a valid mission:

```ts
expect(evaluateMissionReadiness({ quest, resources, availableMinutes: 240 })).toEqual({
  ready: true,
  failures: [],
});
expect(evaluateMissionReadiness({
  quest: { ...quest, resourceIds: [] }, resources, availableMinutes: 240,
})).toMatchObject({ ready: false, failures: ["resource_required"] });
```

- [ ] **Step 2: Verify RED**

Run: `npx.cmd vitest run src/domain/training/mission-readiness.test.ts --maxWorkers=1`  
Expected: FAIL with module not found.

- [ ] **Step 3: Implement the pure gate**

Export:

```ts
export type MissionReadinessFailure =
  | "steps_required" | "metrics_required" | "evidence_required"
  | "resource_required" | "resource_unavailable" | "resource_time_exceeded";

export function evaluateMissionReadiness(input: {
  quest: Quest;
  resources: readonly Resource[];
  availableMinutes: number;
}): { ready: boolean; failures: MissionReadinessFailure[] };
```

Treat resources with relevance or credibility below 60, non-free cost, or `availabilityStatus !== "available"` as unsuitable. Require one to three matching resources, include their estimated minutes in the available-time check, and require `fallbackResourceId` for a primary resource whose external availability is critical. The fallback must also pass the gate.

- [ ] **Step 4: Filter adaptive selection through readiness**

Extend `selectHardestFeasibleQuest` with `resources`. Exclude candidates whose readiness result fails; return `undefined` when none qualify. Never fall back to an unsupported quest.

- [ ] **Step 5: Run focused tests**

Run: `npx.cmd vitest run src/domain/training/mission-readiness.test.ts src/domain/training/adaptive-selector.test.ts --maxWorkers=1`  
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/domain/training/mission-readiness* src/domain/training/adaptive-selector*
git commit -m "feat: gate missions by clarity and resources"
```

### Task 3: Implement deadline, penalty, and recovery reconciliation

**Files:**
- Create: `src/domain/training/reconcile-training.ts`
- Create: `src/domain/training/reconcile-training.test.ts`
- Modify: `src/domain/training/constants.ts`

- [ ] **Step 1: Write failing state-transition tests**

Use fixed clocks to prove:

- a daily mission expires exactly at `dueAt`;
- a missed mainline checkpoint creates one penalty;
- a missed daily mission creates one penalty;
- repeated reconciliation creates no duplicates;
- one failed obligation increments the day only once;
- seven consecutive failure days produce `failure_review`;
- continuing produces a 72-hour `recovery` deadline;
- recovery suspends new assignment;
- clearing all debt restores `normal`;
- expired recovery returns a reset decision.

```ts
const result = reconcileTrainingState(state, "2026-07-26T08:00:00.000Z", ids);
expect(result.state.profile.trainingStatus).toBe("failure_review");
expect(result.effects).toContainEqual({ type: "failure_review_required" });
```

- [ ] **Step 2: Verify RED**

Run: `npx.cmd vitest run src/domain/training/reconcile-training.test.ts --maxWorkers=1`  
Expected: FAIL with module not found.

- [ ] **Step 3: Implement idempotent reconciliation**

Export:

```ts
export function reconcileTrainingState(
  state: TrainingState,
  now: string,
  ids: IdGenerator,
): { state: TrainingState; effects: TrainingEffect[] };

export function beginRecovery(state: TrainingState, now: string): TrainingState;
export function abandonTraining(state: TrainingState, now: string): TrainingState;
```

Use `penaltySourceAssignmentId` as the deduplication key. Use UTC timestamps for comparisons. Preserve Auth identity and archived artifacts when reset effects are applied.

- [ ] **Step 4: Run tests**

Run: `npx.cmd vitest run src/domain/training/reconcile-training.test.ts --maxWorkers=1`  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/domain/training/reconcile-training* src/domain/training/constants.ts
git commit -m "feat: add failure and recovery state machine"
```

### Task 4: Update repository commands and Demo behavior

**Files:**
- Modify: `src/application/training/training-repository.ts`
- Modify: `src/providers/training-provider.tsx`
- Modify: `src/mocks/training/seed.ts`
- Modify: `src/mocks/training/mock-training-repository.ts`
- Test: `src/mocks/training/mock-training-repository.test.ts`
- Test: `src/providers/training-provider.test.tsx`

- [ ] **Step 1: Write failing repository tests**

Prove onboarding always stores the fixed target and 300 minutes, returns one mainline plus one daily assignment, reconciles on `getSnapshot`, and exposes decisions:

```ts
await repository.completeOnboarding({
  displayName: "Hunter", targetRole: "machine-learning-engineer", timezone: "America/Los_Angeles",
});
const state = await repository.getSnapshot();
expect(state.profile.dailyMinutes).toBe(300);
expect(activeScopes(state)).toEqual(["daily", "main"]);
```

- [ ] **Step 2: Verify RED**

Run: `npx.cmd vitest run src/mocks/training/mock-training-repository.test.ts src/providers/training-provider.test.tsx --maxWorkers=1`  
Expected: FAIL on command signatures and assignment scopes.

- [ ] **Step 3: Simplify repository inputs and add commands**

Replace `CompleteOnboardingInput` with:

```ts
export interface CompleteOnboardingInput {
  displayName: string;
  targetRole: "machine-learning-engineer";
  timezone: string;
}
```

Add `continueChallenge()` and `abandonChallenge()` to `TrainingRepository` and provider context.

- [ ] **Step 4: Seed a complete mission catalog**

Seed one five-day mainline with five checkpoint quest records, at least two daily missions, two penalty templates, and direct resources meeting the gate. Keep `挑戰的勇氣` as calibration.

- [ ] **Step 5: Invoke shared reconciliation and assignment**

Call reconciliation before returning snapshots and after submissions. Assign new work only while `trainingStatus === "normal"`. Mainline checkpoints use `parentAssignmentId`; daily assignments set `dueAt = assignedAt + 24h`.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `npx.cmd vitest run src/mocks/training/mock-training-repository.test.ts src/providers/training-provider.test.tsx --maxWorkers=1 && npm run typecheck`  
Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/application/training/training-repository.ts src/providers/training-provider* src/mocks/training
git commit -m "feat: assign mainline and daily missions"
```

### Task 5: Add the Supabase migration and persistence mapping

**Files:**
- Create: `supabase/migrations/202607180001_mainline_daily_missions.sql`
- Modify: `supabase/migrations/phase2-schema.test.ts`
- Modify: `src/supabase-training/row-mappers.ts`
- Modify: `src/supabase-training/row-mappers.test.ts`
- Modify: `src/supabase-training/supabase-training-repository.ts`
- Modify: `src/supabase-training/supabase-training-repository.test.ts`

- [ ] **Step 1: Write failing migration and mapper tests**

Require every column and constraint from the spec, fixed `daily_minutes = 300`, all scope values, self-referencing assignment foreign keys, resource prerequisite/tool/cost/availability/fallback columns, and idempotent mission seed statements. Add mapper fixtures for recovery timestamps, checkpoint relationships, and resource fallback metadata.

- [ ] **Step 2: Verify RED**

Run: `npx.cmd vitest run supabase/migrations/phase2-schema.test.ts src/supabase-training/row-mappers.test.ts src/supabase-training/supabase-training-repository.test.ts --maxWorkers=1`  
Expected: FAIL because migration and mappings are absent.

- [ ] **Step 3: Write the additive migration**

Use `add column if not exists`, named constraints guarded through `pg_constraint`, and indexes on `(user_id, due_at)` and `penalty_source_assignment_id`. Backfill existing profiles to the fixed target and daily minutes. Preserve submissions and artifacts.

- [ ] **Step 4: Map and persist the new fields**

Update row types, mappers, profile/quest/assignment selects, upserts, and reset behavior. Apply reconciliation in the Supabase repository exactly as in Demo mode. Persist the audit activity before an automatic reset.

- [ ] **Step 5: Run focused tests**

Run the command from Step 2.  
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add supabase/migrations src/supabase-training
git commit -m "feat: persist mainline mission lifecycle"
```

### Task 6: Simplify onboarding and profile

**Files:**
- Modify: `src/components/features/onboarding/onboarding.tsx`
- Modify: `src/components/features/onboarding/onboarding.test.tsx`
- Modify: `src/app/onboarding/page.tsx`
- Modify: `src/components/features/profile/profile-settings.tsx`
- Modify: `src/components/features/profile/profile-settings.test.tsx`
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Write failing UI tests**

Assert that onboarding shows `你想要成為什麼？`, one selected `機器學習工程師` card, and `開始挑戰`; assert there are no time, difficulty, contract, or multi-goal controls. Assert Profile displays fixed `每天 5 小時` as read-only.

- [ ] **Step 2: Verify RED**

Run: `npx.cmd vitest run src/components/features/onboarding/onboarding.test.tsx src/components/features/profile/profile-settings.test.tsx --maxWorkers=1`  
Expected: FAIL on current goal/time form.

- [ ] **Step 3: Implement the minimal UI**

Change onboarding output to:

```ts
export type OnboardingValues = { targetRole: "machine-learning-engineer" };
```

Render one non-toggleable target card and one submit button. Keep the courage oath preceding onboarding. Remove editable goal/time fields from Profile, but retain sign-out and reset actions.

- [ ] **Step 4: Run focused tests and route integration**

Run: `npx.cmd vitest run src/components/features/onboarding/onboarding.test.tsx src/components/features/profile/profile-settings.test.tsx src/app/routes.integration.test.tsx --maxWorkers=1`  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/features/onboarding src/components/features/profile src/app/onboarding src/app/profile src/app/routes.integration.test.tsx
git commit -m "feat: simplify ML engineer onboarding"
```

### Task 7: Build mainline, daily, penalty, and recovery Dashboard states

**Files:**
- Modify: `src/components/features/view-models.ts`
- Modify: `src/app/_helpers/training-view-models.ts`
- Modify: `src/components/features/dashboard/dashboard.tsx`
- Modify: `src/components/features/dashboard/dashboard.test.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/components/features/quests/quest-detail.tsx`
- Modify: `src/components/features/quests/quest-detail.test.tsx`

- [ ] **Step 1: Write failing presentation tests**

Cover:

- mainline stage progress and today's checkpoint;
- daily 24-hour deadline;
- penalty count and source violation;
- separate `5 小時訓練` and `額外懲罰` workloads;
- resource links attached to execution steps;
- recovery-only view with 72-hour deadline and debt;
- failure-review actions for continue and abandon.

- [ ] **Step 2: Verify RED**

Run: `npx.cmd vitest run src/components/features/dashboard/dashboard.test.tsx src/components/features/quests/quest-detail.test.tsx --maxWorkers=1`  
Expected: FAIL because current Dashboard has one primary quest.

- [ ] **Step 3: Add focused view models**

Create `MainlineMissionView`, `DailyMissionView`, `PenaltyMissionView`, and `RecoveryView`. Keep domain rules out of components; pages only map state and call provider commands.

- [ ] **Step 4: Implement Dashboard modes**

Normal mode renders three panels. `failure_review` renders the decision dialog. `recovery` replaces new-work panels with deadline, debt list, and progress. Quest detail renders objective, deliverable, three-to-seven steps, measurable criteria, evidence, resources, due time, and out-of-scope notes.

- [ ] **Step 5: Run focused and accessibility tests**

Run the command from Step 2 plus `src/app/routes.integration.test.tsx`.  
Expected: PASS with no duplicate heading or button names.

- [ ] **Step 6: Commit**

```powershell
git add src/components/features/view-models.ts src/app/_helpers src/components/features/dashboard src/components/features/quests src/app/dashboard
git commit -m "feat: present dual-track mission command center"
```

### Task 8: Complete end-to-end and Supabase acceptance

**Files:**
- Modify: `e2e/onboarding.spec.ts`
- Modify: `e2e/quest-submission.spec.ts`
- Modify: `e2e/persistence-reset.spec.ts`
- Create: `e2e/failure-recovery.spec.ts`
- Modify: `e2e/helpers.ts`

- [ ] **Step 1: Update E2E scenarios**

Cover fixed onboarding, mainline/daily assignment, resource visibility, measurable evidence requirements, penalty idempotency, seven-day failure review using controlled clock fixtures, recovery success, recovery expiry, and preservation of archived artifacts after reset.

- [ ] **Step 2: Run the full automated verification**

Run:

```powershell
npm run lint
npm run typecheck
npx.cmd vitest run --maxWorkers=1
npm run test:e2e
git diff --check
```

Expected: all commands exit 0; Playwright remains at one worker for this device.

- [ ] **Step 3: Apply and verify the migration manually**

Run `supabase/migrations/202607180001_mainline_daily_missions.sql` in the configured Supabase SQL Editor. Sign in through local magic-link and verify:

1. fixed onboarding;
2. one resource-ready mainline and one daily assignment;
3. persistence after reload and sign-out/sign-in;
4. no duplicate assignments after repeated reload;
5. archived artifacts survive a training reset.

- [ ] **Step 4: Scan for secrets and commit acceptance updates**

Run: `rg -n "sb_publishable|service_role" --glob "!.env.local" --glob "!node_modules/**" .`  
Expected: no real credential in tracked application files.

```powershell
git add e2e
git commit -m "test: verify mainline mission lifecycle"
```
