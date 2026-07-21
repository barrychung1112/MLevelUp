# Interactive Sandbox Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reset-on-entry anonymous fake account and an original animated Challenger silhouette while preserving the deterministic guided demo and real authentication flow.

**Architecture:** A small browser session module owns the sandbox marker and clears only demo storage. AuthGate activates the marker before application providers mount; repository factories choose browser-only mock repositories whenever the marker is active. A sandbox entry page initializes the seeded learner, while the existing application shell exposes a persistent exit control. The homepage figure is an accessible, CSS-only decorative component.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, browser sessionStorage/localStorage, Vitest, Testing Library

---

### Task 1: Sandbox session boundary

**Files:**
- Create: `src/demo/sandbox-session.ts`
- Test: `src/demo/sandbox-session.test.ts`
- Modify: `src/mocks/training/local-storage.ts`
- Modify: `src/portfolio/demo-portfolio-publication-repository.ts`

- [ ] Write tests proving activation clears only exported training and portfolio demo keys, sets a tab-scoped marker, detects the session, and clears the marker on exit.
- [ ] Run the test and confirm the missing module fails.
- [ ] Export both demo storage keys and implement `activateSandboxSession`, `isSandboxSession`, and `exitSandboxSession` with guarded browser storage access.
- [ ] Run the session tests and confirm they pass.

### Task 2: Anonymous mock repository selection

**Files:**
- Modify: `src/auth/auth-gate.tsx`
- Test: `src/auth/auth-provider.test.tsx`
- Modify: `src/providers/training-provider.tsx`
- Test: `src/providers/training-repository-factory.test.ts`
- Modify: `src/providers/portfolio-publication-provider.tsx`
- Test: `src/providers/portfolio-publication-provider.test.tsx`

- [ ] Add tests proving `/demo/sandbox` activates anonymous access and active sandbox sessions can visit private routes.
- [ ] Add factory tests proving an active sandbox chooses mock training and portfolio repositories even when Supabase is configured.
- [ ] Run tests and confirm the new expectations fail.
- [ ] Add a sandbox boundary that activates the session before providers mount, allow active sessions through AuthGate, and check the marker in both repository factories before Supabase selection.
- [ ] Run the focused tests and confirm they pass.

### Task 3: Fake learner entry and exit

**Files:**
- Create: `src/app/demo/sandbox/page.tsx`
- Create: `src/demo/sandbox-entry.tsx`
- Test: `src/demo/sandbox-entry.test.tsx`
- Create: `src/demo/sandbox-banner.tsx`
- Test: `src/demo/sandbox-banner.test.tsx`
- Modify: `src/app/_components/training-page-shell.tsx`
- Modify: `src/auth/public-entry.tsx`
- Modify: `src/auth/public-entry.test.tsx`

- [ ] Add tests proving the live-demo link targets `/demo/sandbox?restart=1`, initialization completes onboarding for a fixed fake learner and enters `/dashboard`, and Exit clears the sandbox session.
- [ ] Run tests and confirm they fail.
- [ ] Implement the sandbox entry initialization, visible sandbox banner, full-page exit, and distinct homepage destinations.
- [ ] Run focused tests and confirm they pass.

### Task 4: Original Challenger atmosphere

**Files:**
- Create: `src/auth/challenger-silhouette.tsx`
- Test: `src/auth/challenger-silhouette.test.tsx`
- Modify: `src/auth/public-entry.tsx`
- Modify: `src/app/globals.css`

- [ ] Add a test proving the figure is decorative and excluded from the accessibility tree.
- [ ] Run the test and confirm the component is missing.
- [ ] Build the layered CSS silhouette, restrained rim light, breathing and scanner animation, responsive opacity, and reduced-motion behavior.
- [ ] Integrate it behind the homepage composition without changing accessible reading order.
- [ ] Run focused tests, lint, typecheck, build, and browser smoke tests for desktop and mobile.

### Task 5: Complete and publish

**Files:**
- Modify: `README.md`

- [ ] Document the guided and sandbox demo paths and their external-service boundaries.
- [ ] Run all affected tests, lint, typecheck, build, and `git diff --check`.
- [ ] Commit the implementation, push `main`, and confirm local and remote HEAD match.
