# Guided Demo Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a deterministic anonymous six-step Demo and allow penalty and daily missions to run concurrently in production rules.

**Architecture:** Remove the penalty blocking guard from daily generation, then add a versioned pure Demo fixture and state machine isolated from live repositories. Render a dedicated `/demo` client experience, expose three signed-out home actions, and reuse the deterministic public portfolio fixture for the anonymous proof handoff.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Tailwind CSS, sessionStorage, Vitest, Testing Library

---

### Task 1: Allow penalty and daily missions to run concurrently

**Files:**
- Modify: `src/application/training/generate-daily-training.ts`
- Modify: `src/application/training/generate-daily-training.test.ts`
- Modify: `src/application/training/generate-ai-daily-training.ts`
- Modify: `src/application/training/generate-ai-daily-training.test.ts`

- [ ] Write failing tests proving an open penalty does not block catalog or AI daily assignment and remains unchanged in state.
- [ ] Run the four focused generation tests and confirm the new assertions fail with `penalty_priority`.
- [ ] Remove only the penalty early-return guards and obsolete reason value; preserve same-day idempotency and resource-gap behavior.
- [ ] Run focused tests and confirm both assignments coexist with separate IDs and scopes.
- [ ] Commit as `fix: run penalty and daily missions concurrently`.

### Task 2: Define the versioned Demo scenario and state machine

**Files:**
- Create: `src/demo/scenario.ts`
- Create: `src/demo/scenario.test.ts`
- Create: `src/demo/state-machine.ts`
- Create: `src/demo/state-machine.test.ts`
- Create: `src/demo/session-store.ts`
- Create: `src/demo/session-store.test.ts`

- [ ] Write failing fixture tests for Alex, yesterday's two-of-four expired outcome, zero-XP recovered penalty, adjusted daily mission, fixed evidence, quality 88, reward deltas, and portfolio proof.
- [ ] Write failing transition tests for the six ordered steps, idempotent repeated actions, impossible transitions, restart, version mismatch, corrupt JSON, and unavailable storage.
- [ ] Implement an immutable `GUIDED_DEMO_SCENARIO` and pure `advanceDemoState`/`resetDemoState` functions.
- [ ] Implement safe session read/write/clear helpers under a versioned key without cookies or network access.
- [ ] Run focused tests and commit as `feat: add deterministic guided demo scenario`.

### Task 3: Make Demo routes anonymous and add signed-out home entries

**Files:**
- Modify: `src/auth/auth-gate.tsx`
- Modify: `src/auth/auth-provider.test.tsx`
- Replace: `src/app/page.tsx`
- Modify: `src/app/page.test.tsx`
- Modify: `src/auth/login-terminal.tsx` only if a reusable sign-in trigger is required.

- [ ] Write failing tests proving `/demo` bypasses AuthGate in all builds while unrelated private routes remain protected.
- [ ] Write failing home tests for `Watch the challenge`, `Enter live demo`, and `Sign in`, including exact restart query strings.
- [ ] Implement explicit public-route recognition for `/demo` and `/p/*` without globally enabling Demo mode.
- [ ] Replace the automatic root redirect with a signed-out Demo-first entry page; signed-in users may continue to the existing dashboard/onboarding flow.
- [ ] Keep the email terminal hidden until `Sign in` is selected.
- [ ] Run focused tests and commit as `feat: add anonymous demo entry points`.

### Task 4: Build the six-step guided Demo interface

**Required skill:** Use `frontend-design` before implementing this task.

**Files:**
- Create: `src/app/demo/page.tsx`
- Create: `src/demo/guided-demo.tsx`
- Create: `src/demo/guided-demo.test.tsx`
- Create focused components under `src/demo/components/` when a component has an independent responsibility.
- Modify: `src/app/globals.css` for Demo-only animation and reduced-motion behavior.

- [ ] Write failing component tests for all six headings, exactly one primary action per step, yesterday's incomplete result, concurrent recovered penalty and daily order, fixture evidence, simulated-AI disclaimer, deterministic policy result, reward application, proof handoff, restart, and refresh restoration.
- [ ] Implement the page as a focused command-center presentation without the standard private navigation.
- [ ] Read `guided=1` and `restart=1` on first mount; reset only when requested and preserve valid refresh state.
- [ ] Move focus to each new heading, expose text status in addition to color, prevent double transitions, and respect reduced motion.
- [ ] Ensure all displayed evidence links are inert text inside the Demo so rendering cannot trigger external requests.
- [ ] Run focused component tests and commit as `feat: build guided demo experience`.

### Task 5: Complete the deterministic public proof handoff

**Files:**
- Modify: `src/portfolio/public-portfolio-reader.ts`
- Modify: `src/portfolio/public-portfolio-reader.test.ts`
- Modify: `src/components/features/portfolio/public-portfolio-view.tsx`
- Modify: `src/components/features/portfolio/public-portfolio-view.test.tsx`
- Modify: `src/app/p/[slug]/page.tsx` if Demo context must be passed explicitly.

- [ ] Write failing tests that `demo-ml-engineer` is available without Supabase configuration, contains fixed verified proof and grounded achievements, and displays `Return to guided demo` only for the Demo portfolio.
- [ ] Ensure the reader returns the deterministic Demo portfolio for the Demo slug without constructing a Supabase client, regardless of build mode.
- [ ] Add the back-link without exposing it on normal public portfolios.
- [ ] Run focused tests and commit as `feat: guarantee demo public portfolio proof`.

### Task 6: Documentation and complete verification

**Files:**
- Modify: `README.md`
- Create: `docs/guided-demo-deployment.md`
- Modify or create tests for route integration where required.

- [ ] Document the 60-second local startup, Windows and POSIX environment syntax, `/demo -> /p/demo-ml-engineer`, and the second Vercel project setup using `NEXT_PUBLIC_MLEVELUP_DEMO_MODE=1`.
- [ ] Document the anonymous desktop/mobile smoke path and explicit zero-dependency checks.
- [ ] Run focused positive and negative tests for all new behavior.
- [ ] Run `npm run lint`, `npm run typecheck`, `vitest run --maxWorkers=2`, `npm run build`, and `git diff --check`; all must exit zero.
- [ ] Run an anonymous browser walkthrough at desktop and mobile widths with Supabase/OpenAI variables absent or network service responses blocked. Confirm no authentication overlay, horizontal overflow, external API request, duplicate reward, or broken public proof.
- [ ] Commit as `docs: document deterministic demo deployment`.
