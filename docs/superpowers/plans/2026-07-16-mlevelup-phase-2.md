# MLevelUp Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase magic-link authentication and user-scoped persistence without changing the Phase 1 training experience.

**Architecture:** The existing repository interface remains the UI boundary. A Supabase client repository maps normalized Postgres rows to the existing `TrainingState`; the mock repository remains test-only. Supabase Auth owns sessions and RLS protects every user-scoped table.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase JS, Postgres SQL migrations, Zod, Vitest, Playwright.

---

### Task 1: Add Supabase configuration and browser client

**Files:**
- Modify: `package.json`, `.env.example`
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/config.ts`
- Test: `src/lib/supabase/config.test.ts`

- [ ] Write a failing test for a missing public Supabase URL/key returning an explicit unavailable result.
- [ ] Add `@supabase/supabase-js`; implement a browser-only singleton client that reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Run the focused test, then lint and typecheck.

### Task 2: Add schema, RLS, and catalog seed migration

**Files:**
- Create: `supabase/migrations/202607160001_phase2_training.sql`
- Test: `supabase/migrations/phase2-schema.test.ts`

- [ ] Write a structural test that requires all ten tables, RLS enablement, per-user policies, and no service-role credential in app code.
- [ ] Create the compact JSONB schema from the approved design; add authenticated catalog-read policies and user-owned CRUD policies.
- [ ] Seed the small Phase 1 quest/resource catalog idempotently and rerun the structural test.

### Task 3: Implement auth state and magic-link screens

**Files:**
- Create: `src/auth/auth-provider.tsx`, `src/auth/auth-gate.tsx`, `src/app/auth/callback/page.tsx`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`
- Test: `src/auth/auth-provider.test.tsx`, `src/app/auth/callback/page.test.tsx`

- [ ] Write failing tests for signed-out magic-link entry, callback exchange, configured-session routing, and unavailable Supabase configuration.
- [ ] Implement session subscription, magic-link request, sign-out, and callback code exchange with clear recovery messages.
- [ ] Keep authenticated routing compatible with the current onboarding/dashboard guard and run focused tests.

### Task 4: Implement Supabase repository mapping

**Files:**
- Create: `src/supabase-training/supabase-training-repository.ts`, `src/supabase-training/row-mappers.ts`
- Test: `src/supabase-training/supabase-training-repository.test.ts`, `src/supabase-training/row-mappers.test.ts`
- Modify: `src/application/training/training-repository.ts`, `src/providers/training-provider.tsx`

- [ ] Write failing mapping tests for catalog rows, seven skill rows, submission evidence JSON, feedback, artifacts, and an empty profile.
- [ ] Implement read mapping and command methods for onboarding, profile update, quest start, submit, and reset with the existing repository interface.
- [ ] Change the browser provider factory to use the Supabase repository when configuration/session are available and preserve mock injection for unit tests.

### Task 5: Wire the existing screens and persistence acceptance tests

**Files:**
- Modify: `src/app/_components/training-page-shell.tsx`, `src/app/profile/page.tsx`
- Test: `src/app/routes.integration.test.tsx`, `e2e/auth.spec.ts`

- [ ] Write failing tests for signed-out guard behavior, sign-out, and a user-scoped reset.
- [ ] Add minimal account controls and make reset language user-scoped; keep all Phase 1 UI routes intact.
- [ ] Run full lint, typecheck, unit tests, production build, and E2E tests. Document the manual Supabase dashboard migration and magic-link verification step.
