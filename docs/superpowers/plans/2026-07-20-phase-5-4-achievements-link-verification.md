# Phase 5.4 Achievements and Link Verification Implementation Plan

> **Execution note:** Implement this plan task-by-task with test-driven development. Keep commits small, preserve unrelated working-tree changes, and do not report completion until every automated gate and the agreed production smoke tests pass.

**Goal:** Add manually triggered GitHub/Kaggle public-link existence verification and manually generated, editable, user-approved resume achievements to the existing portfolio flow without changing XP, training, or artifact authority state.

**Architecture:** Extend the existing Next.js + Supabase modular monolith with two authenticated route handlers, isolated domain services, owner-scoped repositories, and minimal public projections. User URLs are parsed locally and converted into fixed provider API requests; the AI receives only allowlisted typed facts, and deterministic validation is authoritative before persistence or publication.

**Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/Postgres/RLS/RPC, OpenAI structured outputs, Zod 4, Vitest, Testing Library, Playwright.

**Approved design:** `docs/superpowers/specs/2026-07-20-phase-5-4-achievements-link-verification-design.md`

## Global constraints

- Verification proves only that a supported public URL existed when checked; every badge must say ownership is not verified.
- Never request the user-supplied URL. Construct requests only from fixed GitHub/Kaggle API origins after strict parsing.
- Never accept user IDs, source facts, model names, prompts, or external metadata from the browser.
- External provider and OpenAI failures must not affect XP, skill stats, quests, submissions, artifact quality, or portfolio visibility.
- Preserve the last valid achievement draft when generation fails.
- Run Vitest with one worker on this machine: `npm run test:unit -- --maxWorkers=1`.

## Task 1: Define strict platform URL contracts and parser

**Files:**

- Create: `src/portfolio-verification/contracts.ts`
- Create: `src/portfolio-verification/platform-url.ts`
- Create: `src/portfolio-verification/platform-url.test.ts`

**Step 1: Write failing parser tests**

Cover canonical GitHub repositories and commits, Kaggle notebooks and competitions, query/fragment removal, `.git` removal, and rejection of HTTP, credentials, ports, IP literals, localhost, Unicode/lookalike hosts, extra subdomains, unsupported paths, missing segments, and oversized segments. Assert that unsupported input produces a typed result rather than a fetchable URL.

```ts
expect(parsePlatformUrl("https://github.com/openai/openai-node.git?tab=readme#usage"))
  .toEqual({
    ok: true,
    value: {
      provider: "github",
      resourceType: "repository",
      normalizedUrl: "https://github.com/openai/openai-node",
      externalId: "openai/openai-node",
      request: { owner: "openai", repo: "openai-node" },
    },
  });

expect(parsePlatformUrl("https://127.0.0.1/repo")).toEqual({
  ok: false,
  reason: "unsupported_url",
});
```

**Step 2: Run the focused test and confirm failure**

Run: `npx vitest run src/portfolio-verification/platform-url.test.ts --maxWorkers=1`

Expected: FAIL because the parser does not exist.

**Step 3: Implement minimal typed contracts and parser**

Define:

```ts
type VerificationProvider = "github" | "kaggle";
type VerificationResourceType = "repository" | "commit" | "notebook" | "competition";
type LinkVerificationStatus = "verified" | "unavailable" | "unsupported" | "error" | "stale";
```

Use `URL`, exact hostname matching, HTTPS-only validation, empty username/password, default port only, bounded ASCII segments, and explicit route patterns. Return structured provider request parameters, never an arbitrary destination URL.

**Step 4: Run focused tests**

Run: `npx vitest run src/portfolio-verification/platform-url.test.ts --maxWorkers=1`

Expected: PASS.

**Step 5: Commit**

```powershell
git add src/portfolio-verification/contracts.ts src/portfolio-verification/platform-url.ts src/portfolio-verification/platform-url.test.ts
git commit -m "feat: add strict portfolio platform URL parser"
```

## Task 2: Add private verification and achievement storage

**Files:**

- Create: `supabase/migrations/202607200001_phase5_4_achievements_verification.sql`
- Modify: `src/lib/supabase/phase2-schema.test.ts`
- Modify: `src/lib/supabase/server.ts`

**Step 1: Add failing schema-contract tests**

Assert the migration contains both new tables, required check/unique constraints, RLS enablement, owner-only SELECT policies, no browser INSERT/UPDATE policies, `key_achievements` and minimal verification projection columns, security-definer RPC ownership checks using `auth.uid()`, and fixed `search_path`.

**Step 2: Run focused schema tests and confirm failure**

Run: `npx vitest run src/lib/supabase/phase2-schema.test.ts --maxWorkers=1`

Expected: FAIL because the migration and RPCs are absent.

**Step 3: Implement the migration**

Create `artifact_link_verifications` with a unique `(artifact_id, normalized_url)` constraint and `artifact_achievement_drafts` with one row per artifact. Add indexes for owner/artifact lookups. Add `key_achievements text[] not null default '{}'` plus provider, resource type, verified time, stale-after time, and `link_existence_verified` projection fields to `published_artifacts`.

Add owner-scoped RPCs for:

- verification upsert and public projection synchronization;
- draft upsert after server generation;
- draft text/order edit while retaining stored `source_refs`;
- approval after current-fingerprint validation;
- clearing public achievements when a draft becomes draft/outdated.

No RPC accepts `user_id`. Return no private row to anonymous callers. Extend the authenticated Supabase server wrapper with a bound `rpc` method for the new repositories.

**Step 4: Run focused tests**

Run: `npx vitest run src/lib/supabase/phase2-schema.test.ts --maxWorkers=1`

Expected: PASS.

**Step 5: Commit**

```powershell
git add supabase/migrations/202607200001_phase5_4_achievements_verification.sql src/lib/supabase/phase2-schema.test.ts src/lib/supabase/server.ts
git commit -m "feat: add portfolio verification and achievement storage"
```

## Task 3: Implement bounded provider transport and GitHub adapter

**Files:**

- Create: `src/portfolio-verification/http-transport.ts`
- Create: `src/portfolio-verification/github-verifier.ts`
- Create: `src/portfolio-verification/github-verifier.test.ts`

**Step 1: Write failing adapter tests**

Test repository and commit endpoint construction, allowlisted response mapping, optional server-only bearer token, 404 to `unavailable`, 403/429/timeout/5xx/malformed JSON/unexpected redirect to retryable `error`, bounded response size, and exclusion of email, patch, full commit body, headers, and upstream bodies.

**Step 2: Run focused tests and confirm failure**

Run: `npx vitest run src/portfolio-verification/github-verifier.test.ts --maxWorkers=1`

Expected: FAIL because the adapter is absent.

**Step 3: Implement fixed-origin transport and adapter**

The transport accepts only an already-constructed URL from the adapter, uses `redirect: "manual"`, an abort timeout, a byte limit, and JSON content validation. The GitHub adapter may construct only:

- `https://api.github.com/repos/{owner}/{repo}`
- `https://api.github.com/repos/{owner}/{repo}/commits/{sha}`

Validate provider responses with Zod and return only the design-approved metadata allowlist. Read `GITHUB_TOKEN` only on the server.

**Step 4: Run focused tests**

Run: `npx vitest run src/portfolio-verification/github-verifier.test.ts --maxWorkers=1`

Expected: PASS.

**Step 5: Commit**

```powershell
git add src/portfolio-verification/http-transport.ts src/portfolio-verification/github-verifier.ts src/portfolio-verification/github-verifier.test.ts
git commit -m "feat: verify public GitHub portfolio links"
```

## Task 4: Implement truthful Kaggle adapter

**Files:**

- Create: `src/portfolio-verification/kaggle-verifier.ts`
- Create: `src/portfolio-verification/kaggle-verifier.test.ts`

**Step 1: Write failing adapter tests**

Cover public notebook and competition metadata, sanitized fields, unavailable resources, stable-endpoint absence, authentication-required responses, rate limit, timeout, malformed response, redirect, and unsupported resource types. Assert that the adapter never scrapes arbitrary HTML and never requests credentials from the user.

**Step 2: Run focused tests and confirm failure**

Run: `npx vitest run src/portfolio-verification/kaggle-verifier.test.ts --maxWorkers=1`

Expected: FAIL because the adapter is absent.

**Step 3: Implement the adapter boundary**

Use a small interface whose default implementation calls only configured, fixed official Kaggle metadata endpoints. If the deployed environment lacks a stable public metadata path for a supported URL, return `unsupported` with stable code `provider_metadata_unsupported`; never fall back to scraping or mark the link verified from HTML presence alone.

**Step 4: Run focused tests**

Run: `npx vitest run src/portfolio-verification/kaggle-verifier.test.ts --maxWorkers=1`

Expected: PASS.

**Step 5: Commit**

```powershell
git add src/portfolio-verification/kaggle-verifier.ts src/portfolio-verification/kaggle-verifier.test.ts
git commit -m "feat: add truthful Kaggle link verification adapter"
```

## Task 5: Build verification repository and application service

**Files:**

- Create: `src/portfolio-verification/verification-repository.ts`
- Create: `src/portfolio-verification/supabase-verification-repository.ts`
- Create: `src/portfolio-verification/supabase-verification-repository.test.ts`
- Create: `src/portfolio-verification/verify-artifact-link.ts`
- Create: `src/portfolio-verification/verify-artifact-link.test.ts`

**Step 1: Write failing service/repository tests**

Assert authenticated ownership lookup, indistinguishable foreign/missing result, use of the canonical stored artifact URL, zero adapter calls for invalid URLs, correct adapter dispatch, 30-day stale time, one-row upsert, sanitized error persistence, and public projection update/clear behavior. Assert no training tables are written.

**Step 2: Run tests and confirm failure**

Run: `npx vitest run src/portfolio-verification/verify-artifact-link.test.ts src/portfolio-verification/supabase-verification-repository.test.ts --maxWorkers=1`

Expected: FAIL because the service and repository are absent.

**Step 3: Implement repository and orchestration**

The service flow is:

1. Load artifact by ID under the authenticated user client.
2. Parse only its stored `evidence_url`.
3. Return/persist `unsupported` without a network request when parsing fails.
4. Call the matching adapter.
5. Set `verified_at` and `stale_after = verified_at + 30 days` only on success.
6. Upsert the private snapshot and synchronize only minimal public fields through the RPC.

**Step 4: Run focused tests**

Run: `npx vitest run src/portfolio-verification/verify-artifact-link.test.ts src/portfolio-verification/supabase-verification-repository.test.ts --maxWorkers=1`

Expected: PASS.

**Step 5: Commit**

```powershell
git add src/portfolio-verification/verification-repository.ts src/portfolio-verification/supabase-verification-repository.ts src/portfolio-verification/supabase-verification-repository.test.ts src/portfolio-verification/verify-artifact-link.ts src/portfolio-verification/verify-artifact-link.test.ts
git commit -m "feat: orchestrate artifact link verification"
```

## Task 6: Expose authenticated Verify Link API

**Files:**

- Create: `src/app/api/portfolio/verify-link/route.ts`
- Create: `src/app/api/portfolio/verify-link/route.test.ts`
- Create: `src/portfolio/portfolio-command-client.ts`
- Create: `src/portfolio/portfolio-command-client.test.ts`

**Step 1: Write failing route/client tests**

Follow the existing injected-handler route style. Test 401 signed out, 400 invalid JSON/body/UUID, non-disclosing 404, 200 verified/unavailable/unsupported views, 503 missing configuration, sanitized 502 retryable provider error, bearer forwarding, and body size limits. Confirm the request accepts only `artifactId` and ignores/rejects browser-supplied URLs.

**Step 2: Run focused tests and confirm failure**

Run: `npx vitest run src/app/api/portfolio/verify-link/route.test.ts src/portfolio/portfolio-command-client.test.ts --maxWorkers=1`

Expected: FAIL because the route and client are absent.

**Step 3: Implement route and client**

Use `createAuthenticatedSupabaseClient`, Zod input parsing, stable error codes, and injected verifier dependencies. The browser client returns a discriminated result so UI states do not infer status from message text.

**Step 4: Run focused tests**

Run: `npx vitest run src/app/api/portfolio/verify-link/route.test.ts src/portfolio/portfolio-command-client.test.ts --maxWorkers=1`

Expected: PASS.

**Step 5: Commit**

```powershell
git add src/app/api/portfolio/verify-link/route.ts src/app/api/portfolio/verify-link/route.test.ts src/portfolio/portfolio-command-client.ts src/portfolio/portfolio-command-client.test.ts
git commit -m "feat: add portfolio link verification API"
```

## Task 7: Build allowlisted achievement facts and deterministic validator

**Files:**

- Create: `src/portfolio-achievements/contracts.ts`
- Create: `src/portfolio-achievements/source-facts.ts`
- Create: `src/portfolio-achievements/source-facts.test.ts`
- Create: `src/portfolio-achievements/grounding-validator.ts`
- Create: `src/portfolio-achievements/grounding-validator.test.ts`

**Step 1: Write failing fact-builder and validation tests**

Assert that facts include only artifact title/type/quality/skill tags, quest title/objective/steps/success criteria, named metric values, and current sanitized verification metadata. Assert exclusion of email, reflection, reviewer notes, feedback prose, penalties, recovery state, tokens, and raw rows.

Test exactly 3–5 bullets, 160-character maximum, at least one valid immutable source ref per bullet, stable source fingerprint, duplicate normalization, prohibited ownership/ranking/unsupported impact claims, and rejection of every number/percentage/duration/rank/count absent from referenced facts.

**Step 2: Run focused tests and confirm failure**

Run: `npx vitest run src/portfolio-achievements/source-facts.test.ts src/portfolio-achievements/grounding-validator.test.ts --maxWorkers=1`

Expected: FAIL because the fact builder and validator are absent.

**Step 3: Implement typed facts, fingerprinting, and validation**

Use stable references such as `artifact:quality_score`, `quest:step:1`, and `metric:validation_accuracy`. Canonically sort and serialize the facts before SHA-256 fingerprinting. Validation returns field-level codes and never silently removes unsupported bullets.

**Step 4: Run focused tests**

Run: `npx vitest run src/portfolio-achievements/source-facts.test.ts src/portfolio-achievements/grounding-validator.test.ts --maxWorkers=1`

Expected: PASS.

**Step 5: Commit**

```powershell
git add src/portfolio-achievements/contracts.ts src/portfolio-achievements/source-facts.ts src/portfolio-achievements/source-facts.test.ts src/portfolio-achievements/grounding-validator.ts src/portfolio-achievements/grounding-validator.test.ts
git commit -m "feat: validate grounded portfolio achievements"
```

## Task 8: Implement structured AI generation without fallback

**Files:**

- Create: `src/ai/prompts/portfolio-achievements.ts`
- Create: `src/ai/prompts/portfolio-achievements.test.ts`
- Create: `src/portfolio-achievements/achievement-repository.ts`
- Create: `src/portfolio-achievements/supabase-achievement-repository.ts`
- Create: `src/portfolio-achievements/supabase-achievement-repository.test.ts`
- Create: `src/portfolio-achievements/generate-achievements.ts`
- Create: `src/portfolio-achievements/generate-achievements.test.ts`

**Step 1: Write failing generation tests**

Assert manual overwrite protection, allowlisted prompt input, exactly structured output, model/prompt version capture, deterministic validation before persistence, stable bullet IDs, current source fingerprint, and preservation of the prior draft for timeout, 429, 5xx, invalid schema, unknown source refs, prohibited claims, ungrounded numbers, and repository failure.

**Step 2: Run focused tests and confirm failure**

Run: `npx vitest run src/ai/prompts/portfolio-achievements.test.ts src/portfolio-achievements/generate-achievements.test.ts src/portfolio-achievements/supabase-achievement-repository.test.ts --maxWorkers=1`

Expected: FAIL because generation is absent.

**Step 3: Implement prompt and workflow**

Use the existing `StructuredResponseGateway.generate` with a Zod schema containing three to five `{ text, source_refs }` objects. Version the prompt with `PORTFOLIO_ACHIEVEMENTS_PROMPT_VERSION`, defaulting to `phase5-4-v1`. Generate stable IDs server-side after validation. Persist only after the entire output passes; do not provide deterministic prose fallback.

**Step 4: Run focused tests**

Run: `npx vitest run src/ai/prompts/portfolio-achievements.test.ts src/portfolio-achievements/generate-achievements.test.ts src/portfolio-achievements/supabase-achievement-repository.test.ts --maxWorkers=1`

Expected: PASS.

**Step 5: Commit**

```powershell
git add src/ai/prompts/portfolio-achievements.ts src/ai/prompts/portfolio-achievements.test.ts src/portfolio-achievements/achievement-repository.ts src/portfolio-achievements/supabase-achievement-repository.ts src/portfolio-achievements/supabase-achievement-repository.test.ts src/portfolio-achievements/generate-achievements.ts src/portfolio-achievements/generate-achievements.test.ts
git commit -m "feat: generate grounded portfolio achievements"
```

## Task 9: Add generation API and secure edit/approval commands

**Files:**

- Create: `src/app/api/portfolio/generate-achievements/route.ts`
- Create: `src/app/api/portfolio/generate-achievements/route.test.ts`
- Modify: `src/portfolio/portfolio-command-client.ts`
- Modify: `src/portfolio/portfolio-command-client.test.ts`
- Modify: `src/portfolio/portfolio-provider.tsx`
- Modify: `src/portfolio/portfolio-provider.test.tsx`

**Step 1: Write failing API/provider tests**

Test 401, 400, non-disclosing 404, 409 draft-exists without overwrite confirmation, 200 generated draft, retryable 502 AI failure, 422 grounding failure, and 503 configuration failure. Test edit/delete/reorder commands retain immutable source refs, approval revalidates current fingerprint, and outdated drafts cannot be approved or projected.

**Step 2: Run focused tests and confirm failure**

Run: `npx vitest run src/app/api/portfolio/generate-achievements/route.test.ts src/portfolio/portfolio-command-client.test.ts src/portfolio/portfolio-provider.test.tsx --maxWorkers=1`

Expected: FAIL because the commands are absent.

**Step 3: Implement route and provider commands**

The route body accepts only `artifactId` and `replaceExistingDraft`. Provider commands call the authenticated route or ownership-checking RPCs, refresh the private portfolio view after success, and preserve the previous UI state on error.

**Step 4: Run focused tests**

Run: `npx vitest run src/app/api/portfolio/generate-achievements/route.test.ts src/portfolio/portfolio-command-client.test.ts src/portfolio/portfolio-provider.test.tsx --maxWorkers=1`

Expected: PASS.

**Step 5: Commit**

```powershell
git add src/app/api/portfolio/generate-achievements/route.ts src/app/api/portfolio/generate-achievements/route.test.ts src/portfolio/portfolio-command-client.ts src/portfolio/portfolio-command-client.test.ts src/portfolio/portfolio-provider.tsx src/portfolio/portfolio-provider.test.tsx
git commit -m "feat: add achievement generation and approval commands"
```

## Task 10: Add authenticated portfolio controls

**Files:**

- Create: `src/portfolio/artifact-link-verification.tsx`
- Create: `src/portfolio/artifact-link-verification.test.tsx`
- Create: `src/portfolio/achievement-draft-editor.tsx`
- Create: `src/portfolio/achievement-draft-editor.test.tsx`
- Modify: `src/portfolio/portfolio-manager.tsx`
- Modify: `src/portfolio/portfolio-manager.test.tsx`
- Modify: `src/portfolio/contracts.ts`

**Step 1: Write failing component tests**

Cover Verify/Retry, loading lock, Verified/Unavailable/Unsupported/Error/Needs recheck states, checked date, and exact ownership disclaimer. Cover Generate, overwrite confirmation, 3–5 bullet editor, text edit, delete, move up/down, validation errors, Approve, Draft/Approved/Outdated labels, and independent failure isolation from existing publish controls.

**Step 2: Run focused tests and confirm failure**

Run: `npx vitest run src/portfolio/artifact-link-verification.test.tsx src/portfolio/achievement-draft-editor.test.tsx src/portfolio/portfolio-manager.test.tsx --maxWorkers=1`

Expected: FAIL because the controls are absent.

**Step 3: Implement accessible responsive controls**

Use buttons with disabled/loading states and status text announced with `aria-live`. On narrow screens, stack the evidence and achievement panels; on desktop, keep them readable without reducing existing publication controls. Never use `Verified owner` or equivalent language.

**Step 4: Run focused tests**

Run: `npx vitest run src/portfolio/artifact-link-verification.test.tsx src/portfolio/achievement-draft-editor.test.tsx src/portfolio/portfolio-manager.test.tsx --maxWorkers=1`

Expected: PASS.

**Step 5: Commit**

```powershell
git add src/portfolio/artifact-link-verification.tsx src/portfolio/artifact-link-verification.test.tsx src/portfolio/achievement-draft-editor.tsx src/portfolio/achievement-draft-editor.test.tsx src/portfolio/portfolio-manager.tsx src/portfolio/portfolio-manager.test.tsx src/portfolio/contracts.ts
git commit -m "feat: add portfolio verification and achievement controls"
```

## Task 11: Extend the safe public portfolio projection

**Files:**

- Modify: `src/portfolio/public-portfolio-reader.ts`
- Modify: `src/portfolio/public-portfolio-reader.test.ts`
- Modify: `src/portfolio/public-portfolio-view.tsx`
- Modify: `src/portfolio/public-portfolio-view.test.tsx`

**Step 1: Write failing public-projection tests**

Assert that only approved projected strings render under `Key achievements`, no empty heading appears, current verification renders provider/date plus `Link verified; ownership not verified`, and expired/failed/unsupported verification renders no badge. Scan serialized public data/HTML for draft status, source refs, prompt/model fields, metadata blobs, errors, email, reflection, reviewer notes, and other private training fields.

**Step 2: Run focused tests and confirm failure**

Run: `npx vitest run src/portfolio/public-portfolio-reader.test.ts src/portfolio/public-portfolio-view.test.tsx --maxWorkers=1`

Expected: FAIL because the public projection is not rendered.

**Step 3: Implement minimal public mapping and rendering**

Map only `key_achievements` and minimal verification projection fields already present in `published_artifacts`. Compare `verification_stale_after` to the server render time before returning a badge. Do not query either private Phase 5.4 table on the anonymous path.

**Step 4: Run focused tests**

Run: `npx vitest run src/portfolio/public-portfolio-reader.test.ts src/portfolio/public-portfolio-view.test.tsx --maxWorkers=1`

Expected: PASS.

**Step 5: Commit**

```powershell
git add src/portfolio/public-portfolio-reader.ts src/portfolio/public-portfolio-reader.test.ts src/portfolio/public-portfolio-view.tsx src/portfolio/public-portfolio-view.test.tsx
git commit -m "feat: publish approved portfolio achievements safely"
```

## Task 12: Add integration coverage and deployment runbook

**Files:**

- Create: `e2e/portfolio-achievements-verification.spec.ts`
- Modify: `docs/phase-5-public-portfolio-setup.md`
- Modify: `README.md`

**Step 1: Add focused E2E scenarios**

Cover signed-out rejection, Verify Link status rendering, generation/edit/reorder/approval, approved public achievements, hidden unapproved drafts, current badge, expired badge removal, and existing publish/unpublish controls. Mock provider/OpenAI boundaries for deterministic local E2E; do not use real tokens in fixtures.

**Step 2: Document deployment configuration and migration order**

Document:

- applying `202607200001_phase5_4_achievements_verification.sql` before deploying UI;
- existing OpenAI variables plus `PORTFOLIO_ACHIEVEMENTS_PROMPT_VERSION=phase5-4-v1`;
- optional server-only `GITHUB_TOKEN`;
- any server-only Kaggle adapter configuration actually implemented;
- no secrets in `NEXT_PUBLIC_*` variables;
- rollback behavior and how to clear only public projections without deleting private drafts.

**Step 3: Run all non-Playwright automated gates**

```powershell
npm run lint
npm run typecheck
npm run test:unit -- --maxWorkers=1
npm run build
git diff --check
```

Expected: all commands exit 0; ESLint has zero warnings; TypeScript has zero errors; every Vitest suite passes; Next.js production build completes; whitespace check prints nothing.

**Step 4: Commit the integration/docs task**

```powershell
git add e2e/portfolio-achievements-verification.spec.ts docs/phase-5-public-portfolio-setup.md README.md
git commit -m "test: cover phase 5.4 portfolio workflows"
```

Before staging the setup document, inspect its existing working-tree diff and merge rather than overwrite the user's current edits.

## Task 13: Deploy and perform the joint production acceptance test

**Files:** None unless a verified defect requires a follow-up commit.

**Step 1: Pre-deployment audit**

Run `git status --short`, inspect every Phase 5.4 commit and diff, confirm no `.env*`, token, cookie, generated test artifact, or unrelated file is staged, and confirm the migration was applied successfully in Supabase.

**Step 2: Deploy through the existing production workflow**

Push the reviewed main branch only after the non-Playwright gates pass. Confirm Vercel uses the required server-only environment variables.

**Step 3: Run the agreed production smoke test together**

Use separate valid/missing GitHub repository and commit URLs, supported/unsupported Kaggle URLs, and dangerous URL cases. Confirm manually generated bullets, rejection of an absent numeric claim using a controlled mocked/staging response, edit/approve/public rendering, outdated-source blocking, unpublish behavior, stale badge behavior, and anonymous response privacy.

Run Playwright only when the user is ready:

```powershell
npx playwright test e2e/portfolio-achievements-verification.spec.ts --workers=1
```

Expected: all scenarios pass on desktop and the configured mobile project. Record the deployed URL, test timestamp, artifact types exercised, and pass/fail evidence.

**Step 4: Final acceptance rule**

Declare Phase 5.4 complete only when:

- lint, typecheck, unit/component/API tests, build, and `git diff --check` pass;
- migration and RLS/RPC checks pass;
- the joint production smoke matrix passes;
- anonymous payload inspection contains no private draft or source data;
- verification wording never implies ownership;
- `git status --short` contains no unexpected Phase 5.4 changes.

If any check fails, return the exact failing command/scenario and observed output to the responsible implementation task, fix it, and rerun both the focused test and the full affected gate.
