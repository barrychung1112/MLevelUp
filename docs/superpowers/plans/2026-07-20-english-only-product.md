# English-Only Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all MLevelUp-authored user-facing content, seed data, AI output instructions, and safely identifiable existing system data to English without changing product behavior.

**Architecture:** Keep the product English-only and avoid an i18n framework. Translate feature-local prose in place, centralize only reusable presentation labels, add explicit English requirements to every AI prompt, and use an idempotent Supabase migration for known system-authored rows. A source guard prevents new Han characters from entering production UI and seed sources while allowing user-generated and external content at runtime.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Supabase/PostgreSQL, OpenAI structured responses, Vitest, Testing Library, ESLint.

---

## File Structure

- Create `src/presentation/product-copy.ts`: shared English navigation, skill, status, evidence, and action labels.
- Create `src/presentation/product-copy.test.ts`: exact shared-label contract.
- Create `src/auth/login-terminal.tsx`: signed-out Email form, confirmation dialog, and Magic Link result states.
- Create `src/auth/login-terminal.test.tsx`: confirmation-before-send and English-state tests.
- Modify `src/auth/auth-gate.tsx`: delegate the signed-out UI to `LoginTerminal` and retain auth routing.
- Modify `src/components/features/**` and `src/app/**`: translate route- and feature-local user-visible prose.
- Modify `src/mocks/training/seed.ts`, `src/domain/training/constants.ts`, `src/providers/training-provider.tsx`, and `src/app/_helpers/training-view-models.ts`: translate system-authored state and fallbacks.
- Modify `src/ai/prompts/**`, `src/ai/config.ts`, and `.env.example`: require English and increment the default prompt contract.
- Create `supabase/migrations/202607200002_english_system_content.sql`: safely translate known system-authored database records.
- Modify `supabase/migrations/phase2-schema.test.ts`: verify migration targeting and idempotency.
- Create `src/english-only-source.test.ts`: enforce the production-source language boundary.
- Modify affected `*.test.tsx`, `*.test.ts`, and `e2e/*.spec.ts`: update visible-copy assertions without changing flow coverage.

### Task 1: Establish Shared English Presentation Labels

**Files:**
- Create: `src/presentation/product-copy.ts`
- Create: `src/presentation/product-copy.test.ts`
- Modify: `src/app/_components/training-page-shell.tsx`
- Modify: `src/components/shell/desktop-sidebar.tsx`
- Modify: `src/components/shell/compact-rail.tsx`
- Modify: `src/components/shell/mobile-bottom-nav.tsx`
- Modify: `src/components/shell/skip-link.tsx`
- Modify: `src/components/shell/app-shell.test.tsx`

- [ ] **Step 1: Write failing label and shell tests**

Assert the stable label contract:

```ts
expect(NAVIGATION_COPY.map((item) => item.label)).toEqual([
  "Command Center",
  "Missions",
  "Resources",
  "Progress",
  "Agent Status",
  "Portfolio",
  "Training Archive",
  "Profile",
]);
expect(SKILL_LABELS.dataHandling).toBe("Data Handling");
expect(SKILL_LABELS.productThinking).toBe("Product Thinking");
```

Update the shell accessibility assertions to expect `Desktop primary navigation`, `Tablet primary navigation`, `Mobile primary navigation`, and `Skip to main content`.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm test -- --run src/presentation/product-copy.test.ts src/components/shell/app-shell.test.tsx`

Expected: FAIL because `product-copy.ts` does not exist and current shell labels are Chinese.

- [ ] **Step 3: Add the shared label module and consume it from navigation**

Define readonly exports for `NAVIGATION_COPY`, `SKILL_LABELS`, `AGENT_LABELS`, `EVIDENCE_TYPE_LABELS`, and common status/action labels. Keep machine identifiers unchanged; only map them at presentation boundaries.

```ts
export const SKILL_LABELS = {
  dataHandling: "Data Handling",
  modeling: "Modeling",
  evaluation: "Evaluation",
  engineering: "Engineering",
  researchSense: "Research Sense",
  productThinking: "Product Thinking",
  communication: "Communication",
} as const;
```

Replace shell strings and ARIA labels with the English copy.

- [ ] **Step 4: Re-run the focused tests**

Run: `npm test -- --run src/presentation/product-copy.test.ts src/components/shell/app-shell.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the shared presentation boundary**

```powershell
git add src/presentation src/app/_components/training-page-shell.tsx src/components/shell
git commit -m "feat: establish English product labels"
```

### Task 2: Build the English Login Terminal and Confirmation Flow

**Files:**
- Create: `src/auth/login-terminal.tsx`
- Create: `src/auth/login-terminal.test.tsx`
- Modify: `src/auth/auth-gate.tsx`
- Modify: `src/auth/auth-provider.test.tsx`
- Modify: `src/app/auth/callback/page.tsx`
- Modify: `src/app/auth/callback/page.test.tsx`

- [ ] **Step 1: Write failing login-flow tests**

Cover these exact behaviors:

```ts
expect(screen.getByRole("heading", { name: /become anyone you want to be/i })).toBeVisible();
await user.type(screen.getByLabelText("Email"), "challenger@example.com");
await user.click(screen.getByRole("button", { name: "Enter Training" }));
expect(requestMagicLink).not.toHaveBeenCalled();
expect(screen.getByRole("dialog", { name: "Challenger Warning" })).toBeVisible();
await user.click(screen.getByRole("button", { name: "Accept the Challenge" }));
expect(requestMagicLink).toHaveBeenCalledWith("challenger@example.com");
expect(await screen.findByText("Access link transmitted")).toBeVisible();
```

Also assert that cancel closes the dialog without sending, request failures show `Transmission failed`, and the callback page never displays a raw provider error.

- [ ] **Step 2: Run focused auth tests and confirm failure**

Run: `npm test -- --run src/auth/login-terminal.test.tsx src/auth/auth-provider.test.tsx src/app/auth/callback/page.test.tsx`

Expected: FAIL because the terminal component and confirmation flow are not implemented.

- [ ] **Step 3: Implement the terminal as an isolated component**

Move signed-out form state out of `AuthGate`. The terminal owns Email input, confirmation state, submitting state, and safe English messages. `AuthGate` still owns loading, signed-in, demo, public-route, and unavailable decisions.

Required copy includes:

```ts
const LOGIN_COPY = {
  statement: "Become anyone you want to be — the hard way.",
  action: "Enter Training",
  warningTitle: "Challenger Warning",
  cancel: "Go Back",
  confirm: "Accept the Challenge",
  successTitle: "Access link transmitted",
  errorTitle: "Transmission failed",
} as const;
```

The confirmation button is the only path that calls `requestMagicLink`. Use the existing `Dialog`, `Field`, and `Button` primitives. Keep the current dark command-center styling and reduced-motion behavior; do not add a new animation framework.

- [ ] **Step 4: Translate callback and auth-owned fallbacks**

Use safe English messages such as `Completing secure sign-in…`, `Missing authentication credentials`, and `We could not complete sign-in. Request a new access link.` Do not render raw query-string or provider errors.

- [ ] **Step 5: Run the focused auth tests**

Run: `npm test -- --run src/auth/login-terminal.test.tsx src/auth/auth-provider.test.tsx src/app/auth/callback/page.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the login terminal**

```powershell
git add src/auth src/app/auth/callback
git commit -m "feat: add English login terminal"
```

### Task 3: Translate Onboarding, Dashboard, Missions, and Portfolio-Producing Flows

**Files:**
- Modify: `src/components/features/onboarding/onboarding.tsx`
- Modify: `src/components/features/onboarding/courage-oath-dialog.tsx`
- Modify: `src/components/features/dashboard/dashboard.tsx`
- Modify: `src/components/features/quests/quest-detail.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/quests/page.tsx`
- Modify: `src/app/quests/[assignmentId]/page.tsx`
- Modify: corresponding component and route tests

- [ ] **Step 1: Update tests to specify English product language**

Replace Chinese assertions with exact English headings and actions. Preserve behavioral coverage for accepting the oath, starting missions, submitting evidence, validation errors, success states, recovery days, and penalties.

Representative assertions:

```ts
expect(screen.getByRole("heading", { name: "What do you want to become?" })).toBeVisible();
expect(screen.getByText("Machine Learning Engineer")).toBeVisible();
expect(screen.getByText("5 hours every day")).toBeVisible();
expect(screen.getByRole("heading", { name: "Execution Steps" })).toBeVisible();
expect(screen.getByRole("heading", { name: "Success Criteria" })).toBeVisible();
expect(screen.getByRole("button", { name: "Submit Evidence" })).toBeEnabled();
```

- [ ] **Step 2: Run the focused feature tests and confirm failure**

Run: `npm test -- --run src/components/features/onboarding src/components/features/dashboard src/components/features/quests src/app/routes.integration.test.tsx`

Expected: FAIL on current Chinese copy.

- [ ] **Step 3: Translate onboarding and challenger warning**

Use `Machine Learning Engineer`, `5 hours every day`, and `Start Training`. Translate the complete oath while preserving its meaning: no comfortable difficulty selection, hardest realistically achievable missions, failure informs the next adjustment, and no easy way back.

- [ ] **Step 4: Translate dashboard and mission presentation**

Translate headings, cards, timers, measurement labels, checkpoint states, daily/mainline/penalty language, recovery warnings, empty states, validation messages, evidence fields, submission outcomes, and XP/quality summaries. Preserve all calculations, machine states, and event handlers.

- [ ] **Step 5: Run the focused feature tests**

Run: `npm test -- --run src/components/features/onboarding src/components/features/dashboard src/components/features/quests src/app/routes.integration.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the core training-flow translation**

```powershell
git add src/components/features/onboarding src/components/features/dashboard src/components/features/quests src/app/dashboard src/app/quests src/app/routes.integration.test.tsx
git commit -m "feat: translate core training flows"
```

### Task 4: Translate Resources, Progress, Profile, Agents, and Archive

**Files:**
- Modify: `src/components/features/resources/resource-library.tsx`
- Modify: `src/components/features/progress/progress-review.tsx`
- Modify: `src/components/features/profile/profile-settings.tsx`
- Modify: `src/components/features/agents/agent-status-board.tsx`
- Modify: `src/components/features/archive/training-archive.tsx`
- Modify: `src/app/resources/page.tsx`
- Modify: `src/app/progress/page.tsx`
- Modify: `src/app/profile/page.tsx`
- Modify: `src/app/agents/page.tsx`
- Modify: `src/app/archive/page.tsx`
- Modify: corresponding component tests

- [ ] **Step 1: Change focused tests to the English contract**

Cover English filters, empty states, chart ARIA labels, account/reset controls, agent statuses, archive event filters, and route headers. Examples:

```ts
expect(screen.getByLabelText("Resource type")).toBeVisible();
expect(screen.getByRole("heading", { name: "Seven Skill Scores" })).toBeVisible();
expect(screen.getByRole("button", { name: "Sign Out" })).toBeVisible();
expect(screen.getByRole("heading", { name: "Agent Status" })).toBeVisible();
expect(screen.getByLabelText("Activity type")).toBeVisible();
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm test -- --run src/components/features/resources src/components/features/progress src/components/features/profile src/components/features/agents src/components/features/archive`

Expected: FAIL on current Chinese copy.

- [ ] **Step 3: Translate the five feature areas and their route shells**

Use shared skill/agent/status labels from `product-copy.ts`. Translate all form options, units (`minutes`, `hours`), filter reset actions, chart accessibility labels, loading/error/empty states, dialogs, and destructive-action warnings. Do not translate external resource titles or user activity payloads at render time.

- [ ] **Step 4: Re-run the focused tests**

Run: `npm test -- --run src/components/features/resources src/components/features/progress src/components/features/profile src/components/features/agents src/components/features/archive`

Expected: PASS.

- [ ] **Step 5: Commit secondary feature translation**

```powershell
git add src/components/features/resources src/components/features/progress src/components/features/profile src/components/features/agents src/components/features/archive src/app/resources src/app/progress src/app/profile src/app/agents src/app/archive
git commit -m "feat: translate training support views"
```

### Task 5: Translate Private and Public Portfolio Experiences

**Files:**
- Modify: `src/components/features/portfolio/artifact-enhancement-panel.tsx`
- Modify: `src/components/features/portfolio/artifact-publication-dialog.tsx`
- Modify: `src/components/features/portfolio/portfolio-manager.tsx`
- Modify: `src/components/features/portfolio/public-portfolio-view.tsx`
- Modify: `src/app/portfolio/page.tsx`
- Modify: `src/app/p/[slug]/page.tsx`
- Modify: `src/app/p/[slug]/not-found.tsx`
- Modify: corresponding portfolio tests

- [ ] **Step 1: Write English portfolio assertions**

Retain verification, generate, edit, reorder, delete, approve, and publish behavior tests. Change visible assertions to English, including `Verify Link`, `Generate Resume Highlights`, `Save Changes`, `Approve`, `Verified`, `Unavailable`, `Unsupported`, `Outdated`, and the ownership disclaimer.

- [ ] **Step 2: Run portfolio tests and confirm failure**

Run: `npm test -- --run src/components/features/portfolio src/app/p`

Expected: FAIL wherever current product copy is Chinese.

- [ ] **Step 3: Translate portfolio-owned UI and safe errors**

Translate private management controls, public portfolio labels, publishing dialog, link-verification result explanations, achievement draft states, empty states, and retry actions. Preserve external titles and user-edited achievement text as authored.

- [ ] **Step 4: Re-run portfolio tests**

Run: `npm test -- --run src/components/features/portfolio src/app/p`

Expected: PASS.

- [ ] **Step 5: Commit portfolio translation**

```powershell
git add src/components/features/portfolio src/app/portfolio src/app/p
git commit -m "feat: translate portfolio experiences"
```

### Task 6: Translate System Seed, View Models, and Deterministic Feedback

**Files:**
- Modify: `src/domain/training/constants.ts`
- Modify: `src/mocks/training/seed.ts`
- Modify: `src/providers/training-provider.tsx`
- Modify: `src/app/_helpers/training-view-models.ts`
- Modify: `src/domain/training/evaluate-submission.ts`
- Modify: `src/ai/run-feedback-workflow.ts`
- Modify: relevant seed, repository, provider, view-model, and evaluation tests

- [ ] **Step 1: Write failing English seed/fallback tests**

Assert that the Courage calibration mission is named `The Courage to Begin`, its steps and acceptance criteria contain no Han characters, contract labels are English, default agent summaries are English, and deterministic submission failures/fallback feedback are English.

```ts
const containsHan = (value: unknown) => /\p{Script=Han}/u.test(JSON.stringify(value));
expect(seed.quests["quest-courage-challenge"].title).toBe("The Courage to Begin");
expect(containsHan(seed)).toBe(false);
```

- [ ] **Step 2: Run focused domain and provider tests and confirm failure**

Run: `npm test -- --run src/mocks/training src/domain/training/evaluate-submission.test.ts src/providers/training-provider.test.tsx src/app/_helpers/training-view-models.test.ts`

Expected: FAIL because current calibration, contract, fallback, and view-model copy contains Chinese or mojibake.

- [ ] **Step 3: Translate system-authored state**

Translate all known mock quest prose, resources, default agents, activity text, evaluation reasons, fallback feedback, and view-model presentation. Increment `SEED_VERSION` so existing demo/local-storage state is rebuilt from the English seed. Do not change quest IDs, resource IDs, enum values, skill weights, XP, deadlines, or assignment rules.

- [ ] **Step 4: Re-run the focused domain and provider tests**

Run: `npm test -- --run src/mocks/training src/domain/training/evaluate-submission.test.ts src/providers/training-provider.test.tsx src/app/_helpers/training-view-models.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit English system content**

```powershell
git add src/domain/training src/mocks/training src/providers/training-provider.tsx src/app/_helpers src/ai/run-feedback-workflow.ts
git commit -m "feat: translate system training content"
```

### Task 7: Require English from Every AI Workflow

**Files:**
- Modify: `src/ai/prompts/shared.ts`
- Modify: `src/ai/prompts/learning-strategist.ts`
- Modify: `src/ai/prompts/adjuster.ts`
- Modify: `src/ai/prompts/coordinator.ts`
- Modify: `src/ai/prompts/resource-curator.ts`
- Modify: `src/ai/prompts/portfolio-achievements.ts`
- Modify: `src/ai/prompts/prompts.test.ts`
- Modify: `src/ai/config.ts`
- Modify: `src/ai/config.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add failing prompt-language tests**

For every prompt builder, assert this invariant:

```ts
expect(instructions).toContain(
  "Write every user-visible prose field in natural English only.",
);
```

Assert the default prompt version is `phase3-en-v1` when the environment variable is absent.

- [ ] **Step 2: Run AI prompt/config tests and confirm failure**

Run: `npm test -- --run src/ai/prompts/prompts.test.ts src/ai/config.test.ts`

Expected: FAIL because the shared English-only directive and new default version are absent.

- [ ] **Step 3: Add one shared English-output rule to all prompt builders**

Put the exact language requirement in the shared authority boundary and in the standalone portfolio prompt. Ensure the resource-curator output also requires English summaries while preserving original external titles and URLs. Change the config fallback and `.env.example` to `OPENAI_PROMPT_VERSION=phase3-en-v1`.

- [ ] **Step 4: Re-run all AI tests**

Run: `npm test -- --run src/ai`

Expected: PASS.

- [ ] **Step 5: Commit the AI language contract**

```powershell
git add src/ai .env.example
git commit -m "feat: require English AI output"
```

### Task 8: Migrate Safely Identifiable Existing System Data

**Files:**
- Create: `supabase/migrations/202607200002_english_system_content.sql`
- Modify: `supabase/migrations/phase2-schema.test.ts`

- [ ] **Step 1: Write failing migration contract tests**

Load the migration as text and assert that it:

```ts
expect(sql).toContain("quest-courage-challenge");
expect(sql).toContain("The Courage to Begin");
expect(sql).toMatch(/where\s+id\s*=\s*'quest-courage-challenge'/iu);
expect(sql).not.toMatch(/update\s+public\.submissions/iu);
expect(sql).not.toMatch(/self_reflection\s*=/iu);
expect(sql).not.toMatch(/evidence_/iu);
```

Also assert stable-ID or exact-known-value predicates exist for every updated table.

- [ ] **Step 2: Run the migration tests and confirm failure**

Run: `npm test -- --run supabase/migrations/phase2-schema.test.ts`

Expected: FAIL because the new migration does not exist.

- [ ] **Step 3: Add an idempotent targeted SQL migration**

Update the Courage quest by stable ID and translate only other exact, known system-authored rows discovered in the repository. Preserve user fields and relationships. Use deterministic assignments so a repeated migration produces the same values and no duplicate rows.

Core statement:

```sql
update public.quests
set title = 'The Courage to Begin',
    summary = 'Prove your willingness to grow through one real result.',
    instructions = 'Inspect a small tabular dataset, build a reproducible baseline, explain the validation method and metric, and record what was and was not completed.',
    acceptance_criteria = '["Identify at least one data-quality issue","Build a baseline and report a validation metric","Explain what was completed, what remains, and the next step"]'::jsonb
where id = 'quest-courage-challenge';
```

Do not update arbitrary `feedback`, `portfolio_artifacts`, or `submissions` rows unless a record has a stable system identifier or an exact known seed value.

- [ ] **Step 4: Re-run migration tests**

Run: `npm test -- --run supabase/migrations/phase2-schema.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the safe content migration**

```powershell
git add supabase/migrations
git commit -m "db: migrate system content to English"
```

### Task 9: Add the English-Only Guard and Complete Verification

**Files:**
- Create: `src/english-only-source.test.ts`
- Modify: remaining affected `src/**/*.test.ts` and `src/**/*.test.tsx`
- Modify: affected `e2e/*.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Add a production-source language guard**

Recursively scan `src` production `.ts` and `.tsx` files plus `src/mocks/training/seed.ts`. Exclude tests and explicitly documented fixtures. Fail with file and line details for Han characters.

```ts
const HAN = /\p{Script=Han}/u;
const excluded = [/\.test\.[tj]sx?$/, /user-content-fixtures/];
expect(violations, violations.join("\n")).toEqual([]);
```

Do not scan historical docs or old migrations because those are not runtime product sources.

- [ ] **Step 2: Run the guard and translate every remaining application-owned violation**

Run: `npm test -- --run src/english-only-source.test.ts`

Expected before cleanup: FAIL with a precise violation list.

Translate every application-owned violation. If a non-English literal is required to test user-generated input, move it to an explicitly named test fixture rather than weakening the production allowlist.

- [ ] **Step 3: Update remaining test and E2E selectors**

Replace obsolete Chinese selectors with stable English roles, labels, and headings. Do not loosen assertions to generic selectors merely to make tests pass.

- [ ] **Step 4: Document the English-only contract and deployment variable**

Add a concise README section stating that the product UI and system-generated content are English-only, user-authored/external content is preserved, and production should set:

```env
OPENAI_PROMPT_VERSION=phase3-en-v1
```

- [ ] **Step 5: Run formatting-independent checks**

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 6: Run lint and type checking**

Run: `npm run lint`

Expected: exit code 0 with no warnings.

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 7: Run the complete unit and integration suite**

Run: `npm run test:unit`

Expected: all Vitest files and tests pass, including the English-only guard.

- [ ] **Step 8: Run the production build**

Run: `npm run build`

Expected: Next.js production build exits 0 and all application routes compile.

- [ ] **Step 9: Inspect the final Chinese scan**

Run:

```powershell
rg -n '[\p{Han}]' src --glob '!**/*.test.ts' --glob '!**/*.test.tsx'
```

Expected: no application-owned production strings. Any output must be an explicitly justified user-content fixture; production UI files must produce no matches.

- [ ] **Step 10: Commit verification and documentation**

```powershell
git add src e2e README.md
git commit -m "test: enforce English-only product copy"
```

## Deployment Notes

After implementation is merged and pushed:

1. Apply `202607200002_english_system_content.sql` to the production Supabase project.
2. Set `OPENAI_PROMPT_VERSION=phase3-en-v1` in Vercel.
3. Redeploy the production application.
4. Create a fresh account and verify English onboarding, mission assignment, resource display, feedback, Agent Status, and portfolio output.
5. Existing user-authored or external non-English content is acceptable; application-owned UI and new system-generated prose are not.
