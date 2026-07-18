# MLevelUp GitHub Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the verified MLevelUp MVP as a public GitHub repository with a hackathon-ready README.

**Architecture:** Keep the existing modular Next.js and Supabase code unchanged. Add one project-facing README, preserve the feature branch history, merge the verified result into `main`, and publish both branches to `barrychung1112/MLevelUp`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase, Vitest, Playwright, GitHub CLI.

---

### Task 1: Project README

**Files:**
- Create: `README.md`

- [ ] **Step 1:** Document the product problem, daily training loop, current MVP capabilities, architecture, local setup, Supabase setup, verification commands, limitations, and roadmap.
- [ ] **Step 2:** Check every command and file path against the repository.
- [ ] **Step 3:** Scan the README for secrets and unsupported product claims.

### Task 2: Local release state

**Files:**
- Modify: Git history only

- [ ] **Step 1:** Commit the README and this publication plan on `codex/phase2-closeout`.
- [ ] **Step 2:** Run lint, typecheck, unit tests, and `git diff --check`.
- [ ] **Step 3:** Merge `codex/phase2-closeout` into local `main` without discarding the feature branch.
- [ ] **Step 4:** Verify the merged `main` points to the complete MVP history.

### Task 3: Public GitHub repository

**Files:**
- Modify: Git remote configuration only

- [ ] **Step 1:** Create the public repository `barrychung1112/MLevelUp` with a concise description.
- [ ] **Step 2:** Add the repository as `origin`.
- [ ] **Step 3:** Push `main` and `codex/phase2-closeout`, setting upstream tracking.
- [ ] **Step 4:** Confirm GitHub reports `main` as the default branch and the remote README is accessible.
