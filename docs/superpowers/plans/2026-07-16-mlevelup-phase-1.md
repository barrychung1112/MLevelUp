# MLevelUp Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or the explicitly approved parallel-agent variant in this plan. Every behavior change follows RED -> GREEN -> REFACTOR. Agents receive their task text directly and do not edit outside their assigned paths.

**Goal:** Build a responsive, accessible Next.js training dashboard whose complete deterministic demo loop runs from onboarding through evidence submission, feedback, XP and skill growth, portfolio creation, battle-log history, persistence, and reset.

**Architecture:** A Next.js App Router modular monolith renders prop-driven feature components over a strict training domain. UI code calls a `TrainingRepository`; Phase 1 supplies a local-storage-backed mock adapter and a React provider. Mock evaluation and rewards are pure functions with injected clock and ID generation, while application commands commit one validated state snapshot atomically.

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind CSS 4, Zod, Lucide React, Recharts, Vitest, Testing Library, Playwright, npm.

---

## File map and ownership

- Project and tests: `package.json`, configuration files, `src/test/`, `e2e/`.
- Domain: `src/domain/training/` contains strict types, schemas, state transitions, evaluation, rewards, and selectors.
- Application: `src/application/training/` contains repository contracts and atomic commands.
- Mock adapter: `src/mocks/training/` contains deterministic seed data, storage envelope, and repository implementation.
- Shared UI: `src/components/ui/` and `src/components/shell/` contain reusable controls and responsive navigation.
- Feature UI: `src/components/features/` contains prop-driven quest, progress, resource, feedback, artifact, agent, and archive views.
- App integration: `src/app/` contains routes and `src/providers/training-provider.tsx` supplies repository state.

Parallel workers may edit only their assigned path groups. The integration worker owns all `src/app/**` route files and the provider after the parallel foundation tasks finish.

## Task 1: Bootstrap the isolated Next.js and test baseline

**Files:**

- Create: `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`
- Create: `vitest.config.mts`, `playwright.config.ts`
- Create: `src/test/setup.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `src/app/page.test.tsx`, `e2e/smoke.spec.ts`

- [ ] Generate the Next.js App Router scaffold with TypeScript, Tailwind, ESLint, `src/`, and the `@/*` alias; set package name to `mlevelup`.
- [ ] Add Vitest, Testing Library, Playwright, Zod, Lucide, Recharts, `clsx`, and `tailwind-merge`.
- [ ] Add scripts: `lint`, `typecheck`, `test`, `test:unit`, `build`, `start:test`, `test:e2e`, and `verify`.
- [ ] Write a failing root-route test that expects a loading-safe application entry rather than marketing content.
- [ ] Configure Vitest with jsdom, path aliases, cleanup, jest-dom, and an explicit exclusion for `e2e/**`; rerun until the failure is only the missing application entry behavior.
- [ ] Implement the minimal root entry and run the unit test to green.
- [ ] Configure Playwright to build first, run `next start` on port 3100, use Chromium, capture failure traces, and never reuse an existing server for formal verification.
- [ ] Run `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test:unit`, and `npm.cmd run build`; all exit 0.

## Task 2: Implement strict training domain and deterministic mock repository

**Files:**

- Create: `src/domain/training/types.ts`
- Create: `src/domain/training/constants.ts`
- Create: `src/domain/training/schemas.ts`
- Create: `src/domain/training/state-machine.ts`
- Create: `src/domain/training/evaluate-submission.ts`
- Create: `src/domain/training/rewards.ts`
- Create: `src/domain/training/selectors.ts`
- Create matching `*.test.ts` files beside each behavior file
- Create: `src/application/training/training-repository.ts`
- Create: `src/application/training/submit-quest.ts`
- Create: `src/mocks/training/seed.ts`
- Create: `src/mocks/training/local-storage.ts`
- Create: `src/mocks/training/mock-training-repository.ts`
- Create matching repository and storage tests

- [ ] Write failing tests for the seven skill keys, three contracts, skill-weight sum, and strict rejection of unknown fields.
- [ ] Define camel-case TypeScript keys `dataHandling`, `modeling`, `evaluation`, `engineering`, `researchSense`, `productThinking`, and `communication`; keep database naming out of Phase 1.
- [ ] Write failing state-machine tests for every allowed transition and for rejection of direct completion.
- [ ] Implement the transition table and keep terminal states immutable.
- [ ] Write failing evaluation tests for missing evidence, non-HTTPS URLs, wrong GitHub/Kaggle host, missing file metadata, short reflection, score boundaries, and identical outputs for identical normalized inputs.
- [ ] Implement the four-part evaluator: evidence completeness 45, evidence validity 25, reflection 20, artifact readiness 10. Hard failures cap the score at 59 and return `needs_revision` with zero rewards.
- [ ] Write failing reward tests for quality bands, 500-XP level boundaries, 1.10 streak cap, 1.25 artifact multiplier, largest-remainder skill allocation, single-skill delta cap 2, and duplicate submission idempotency.
- [ ] Implement reward calculation as pure functions. Competition bonus remains zero.
- [ ] Write failing storage tests for missing data, corrupt JSON, wrong schema/seed version, precise-key reset, and absence of base64/object URLs/File instances.
- [ ] Implement the `mlevelup:phase1:v1` envelope with strict parse and deterministic fallback seed.
- [ ] Write failing repository tests for onboarding, profile update, start quest, invalid submit, valid submit, revision 2, atomic XP/skill/feedback/artifact/activity update, persistence, and duplicate-award prevention.
- [ ] Implement `TrainingRepository` and `DemoTrainingRepository`; inject clock and ID generation and never use `Math.random()`.
- [ ] Run all domain and repository tests to green, then run lint and typecheck.

## Task 3: Implement the original command-interface design system and responsive shell

**Files:**

- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Create: `src/lib/cn.ts`
- Create: `src/components/ui/button.tsx`, `panel.tsx`, `badge.tsx`, `progress.tsx`, `field.tsx`, `dialog.tsx`, `empty-state.tsx`, `status-indicator.tsx`
- Create matching component tests
- Create: `src/components/shell/app-shell.tsx`, `desktop-sidebar.tsx`, `compact-rail.tsx`, `mobile-bottom-nav.tsx`, `skip-link.tsx`
- Create: `src/components/shell/navigation.ts`
- Create matching shell tests

- [ ] Write failing tests for the skip link, labeled navigation, current-route semantics, visible field labels, dialog escape/focus return, and button disabled/loading behavior.
- [ ] Define semantic dark tokens for canvas, surfaces, borders, text, command cyan, growth lime, warning amber, danger coral, and research violet.
- [ ] Configure Chakra Petch for display, Noto Sans TC for body, and IBM Plex Mono for numbers through `next/font`.
- [ ] Implement a single Lucide outline-icon language, clipped industrial panels, fine grid decoration, minimal glow, 44-pixel targets, visible focus, and 150-250 ms transform/opacity motion.
- [ ] Implement mobile bottom navigation below 768px, compact rail from 768-1279px, and full sidebar from 1280px.
- [ ] Ensure decorative layers are `aria-hidden`, bottom navigation reserves safe padding, and reduced motion removes pulses and transitions.
- [ ] Run component tests, lint, and typecheck to green.

## Task 4: Implement prop-driven feature presentation components

**Files:**

- Create: `src/components/features/onboarding/`
- Create: `src/components/features/dashboard/`
- Create: `src/components/features/quests/`
- Create: `src/components/features/resources/`
- Create: `src/components/features/progress/`
- Create: `src/components/features/agents/`
- Create: `src/components/features/portfolio/`
- Create: `src/components/features/archive/`
- Create: `src/components/features/profile/`
- Create colocated component tests

- [ ] Write failing tests that require onboarding validation, one primary dashboard CTA, exact seven-skill text values, Demo labels, evidence field errors, accessible chart summaries, filter-empty recovery, and reset confirmation.
- [ ] Build feature components with typed props only; no component imports the repository or local storage.
- [ ] Ensure every page family has a meaningful loading, empty, or error presentation.
- [ ] Implement evidence inputs for URL, file metadata, metric, and text forms without persisting browser `File` objects.
- [ ] Present radar/trend visuals with exact value bars and text summaries. Color is never the only distinction.
- [ ] Keep Portfolio private and mark Agent, feedback, and verification outputs as Demo.
- [ ] Run feature component tests, lint, and typecheck to green.

## Task 5: Integrate repository provider, routes, and the full vertical slice

**Files:**

- Create: `src/providers/training-provider.tsx`
- Create: `src/app/onboarding/page.tsx`
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/quests/page.tsx`
- Create: `src/app/quests/[assignmentId]/page.tsx`
- Create: `src/app/resources/page.tsx`
- Create: `src/app/progress/page.tsx`
- Create: `src/app/agents/page.tsx`
- Create: `src/app/portfolio/page.tsx`
- Create: `src/app/archive/page.tsx`
- Create: `src/app/profile/page.tsx`
- Create route integration tests

- [ ] Write failing provider tests for hydration-safe loading, corrupt-state fallback, command serialization, and atomic snapshot replacement.
- [ ] Implement the client provider with one repository instance and a stable snapshot subscription.
- [ ] Write failing route tests for root routing, onboarding completion, dashboard content, quest start, invalid submission, valid submission, profile update, and reset.
- [ ] Integrate the prop-driven components with repository commands.
- [ ] Ensure root routing sends incomplete profiles to onboarding and completed profiles to dashboard without rendering a landing page.
- [ ] Ensure list filters survive back navigation through URL search parameters.
- [ ] Run all unit/component tests, lint, typecheck, and build to green.

## Task 6: Add end-to-end and responsive acceptance tests

**Files:**

- Create: `e2e/onboarding.spec.ts`
- Create: `e2e/quest-submission.spec.ts`
- Create: `e2e/persistence-reset.spec.ts`
- Create: `e2e/responsive.spec.ts`
- Create: `e2e/navigation.spec.ts`

- [ ] Write an onboarding E2E test that fails until `/` routes a fresh browser to onboarding, validates required fields, persists the selection, and reaches the command center.
- [ ] Write a submission test that first proves invalid evidence leaves XP and skills unchanged, then submits the fixed fixture and verifies completed status, fixed quality score, XP, skill deltas, feedback, artifact, and battle-log event.
- [ ] Write a persistence test that reloads after completion, verifies the snapshot remains, then confirms and executes Reset Demo and verifies the deterministic seed.
- [ ] Write navigation and responsive tests for 375, 768, 1024, and 1440 pixels; assert `scrollWidth === clientWidth`, labeled navigation, reachable primary CTA, and no covered final focus target.
- [ ] Run the tests against a fresh production build and fix every failure with a failing regression test before changing production code.

## Task 7: Independent review, browser QA, and completion gate

**Files:**

- Modify only files implicated by verified defects
- Save Playwright evidence under ignored `test-results/` and `playwright-report/`

- [ ] Dispatch a spec-compliance reviewer with the approved design and acceptance criteria.
- [ ] Return every missing or extra behavior to the owning implementation agent and repeat review until no compliance gaps remain.
- [ ] Dispatch a code-quality reviewer over the complete branch diff.
- [ ] Fix every Critical and Important issue and request re-review.
- [ ] Run fresh commands: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test:unit`, `npm.cmd run build`, and `npm.cmd run test:e2e`.
- [ ] Start the production server only for formal browser QA, verify the complete loop at 375 and 1440 pixels, inspect screenshots, and stop the server after validation.
- [ ] Run `git diff --check` and confirm the worktree contains no secrets, Supabase dependency, real AI integration, base64 evidence, or untracked build artifacts.
- [ ] Compare every acceptance criterion in the design spec with direct test or browser evidence before declaring Phase 1 complete.

## Plan self-review

- Every Phase 1 route, state transition, mock boundary, accessibility requirement, responsive viewport, and verification command maps to an implementation task.
- Domain keys and repository method names are consistent across tasks.
- Supabase, real AI, scheduling, public sharing, and real leaderboards are excluded.
- No implementation task requires two parallel workers to edit the same path group.
