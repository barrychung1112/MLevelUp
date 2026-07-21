# Agent Ready Label and Home Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clarify idle agent readiness and rewrite the public entry page around MLevelUp's product promise.

**Architecture:** Keep all changes in the presentation layer. The agent view-model maps placeholder provenance to `Ready`; the public entry component replaces only copy and the right-side content while preserving navigation and authentication behavior.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Vitest, Testing Library

---

### Task 1: Agent readiness provenance

**Files:**
- Modify: `src/app/_helpers/training-view-models.ts`
- Modify: `src/components/features/view-models.ts`
- Test: `src/app/_helpers/training-view-models.test.ts`
- Test: `src/components/features/agents/agent-status-board.test.tsx`

- [ ] Change the tests to expect `Ready` for `isMock` agent records while retaining `AI` and `Fallback` expectations.
- [ ] Run the two tests and confirm they fail because the current output is `Demo`.
- [ ] Change `AgentRunView.provenance` to `"Ready" | "AI" | "Fallback"` and map `isMock` to `Ready`.
- [ ] Run the two tests and confirm they pass.

### Task 2: Public entry product message

**Files:**
- Modify: `src/auth/public-entry.tsx`
- Test: `src/auth/public-entry.test.tsx`

- [ ] Add assertions for the exact requested headline and `Career path open: Machine Learning Engineer` subtitle.
- [ ] Add assertions for four product strengths: adaptive missions, evidence verification, governed AI feedback, and portfolio proof.
- [ ] Run the test and confirm the new expectations fail.
- [ ] Replace the current hero copy and right-side judge route with the approved message and product-strength list while preserving all three entry actions.
- [ ] Run focused tests, lint, typecheck, and build; commit and push `main`.
