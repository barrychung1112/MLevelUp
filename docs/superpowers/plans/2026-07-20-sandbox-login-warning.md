# Sandbox Login Warning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic warning and simulated login step before visitors enter the live sandbox account.

**Architecture:** Keep the behavior inside `SandboxEntry`, which already owns fake-account preparation and navigation. Gate its existing initialization effect behind explicit visitor acceptance and clear the active sandbox session when the visitor cancels.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Testing Library

---

### Task 1: Lock the sandbox entry behavior with tests

**Files:**
- Modify: `src/demo/sandbox-entry.test.tsx`

- [ ] Add a test that renders the warning and proves there is no redirect before acceptance.
- [ ] Click `Accept and enter sandbox`, assert the signing-in state, then verify the fixed learner and dashboard redirect.
- [ ] Add a cancellation test that verifies the session is cleared and navigation returns home.
- [ ] Run the focused test and verify it fails because the warning controls do not exist yet.

### Task 2: Implement the warning and simulated sign-in

**Files:**
- Modify: `src/demo/sandbox-entry.tsx`

- [ ] Add an explicit accepted state and prevent account preparation while it is false.
- [ ] Render the sandbox warning with `Go back` and `Accept and enter sandbox` actions.
- [ ] On cancellation, clear the sandbox session and return to `/`.
- [ ] On acceptance, show the fake learner sign-in state and run the existing deterministic setup.
- [ ] Run the focused test and verify it passes.

### Task 3: Verify and publish

**Files:**
- Verify all modified and related files.

- [ ] Run the sandbox and authentication test suites.
- [ ] Run lint, TypeScript checking, and the production build.
- [ ] Run `git diff --check` and inspect the final diff.
- [ ] Commit the scoped change and push `main`.

