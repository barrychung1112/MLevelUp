# Sandbox Complete Training Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the browser-local Sandbox loop from executable evidence submission through feedback and the next mission.

**Architecture:** Add pure Sandbox flow helpers for sample evidence, next-assignment selection, and catalog continuation. Keep evidence validation and rewards in the existing repository, and render the result through a focused completion component.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Testing Library

---

### Task 1: Define the Sandbox flow with failing tests

**Files:**
- Create: `src/demo/sandbox-mission-flow.test.ts`
- Modify: `src/components/features/quests/quest-detail.test.tsx`
- Create: `src/components/features/quests/mission-completion.test.tsx`

- [ ] Prove sample evidence covers URL, file, metric, text, and reflection fields.
- [ ] Prove next-mission selection prioritizes penalty, daily, then mainline work.
- [ ] Prove the form can load and submit deterministic sample evidence.
- [ ] Prove the completion result shows feedback, growth, and a continuation link.
- [ ] Run the focused tests and confirm they fail because the behavior is absent.

### Task 2: Implement the deterministic Sandbox helpers

**Files:**
- Create: `src/demo/sandbox-mission-flow.ts`
- Modify: `src/mocks/training/mock-training-repository.ts`

- [ ] Create deterministic sample evidence from the rendered mission requirements.
- [ ] Select the next active mission using explicit priority rules.
- [ ] Assign one unused feasible catalog mission only when no active mission remains.
- [ ] Keep all mutations inside the browser-local mock repository.

### Task 3: Implement the submission and completion UX

**Files:**
- Modify: `src/components/features/quests/quest-detail.tsx`
- Create: `src/components/features/quests/mission-completion.tsx`
- Modify: `src/components/features/view-models.ts`
- Modify: `src/app/_helpers/training-view-models.ts`
- Modify: `src/app/quests/[assignmentId]/page.tsx`

- [ ] Show `Load sample evidence` only for an active Sandbox session.
- [ ] Continue using the normal form validation and submission handler.
- [ ] Display quality, XP, strengths, improvements, next actions, and non-zero skill changes.
- [ ] Link directly to the selected next assignment.

### Task 4: Verify and publish

**Files:**
- Verify all related Sandbox, quest, repository, and route files.

- [ ] Run focused tests, lint, type checking, and production build.
- [ ] Run `git diff --check` and inspect the final diff.
- [ ] Commit and push the scoped change to `main`.

