# Phase 5.1–5.3 Public Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a learner explicitly publish verified MLevelUp artifacts to a safe, recruiter-readable public portfolio at `/p/[slug]` without exposing or mutating private training data.

**Architecture:** Keep the Next.js + Supabase modular monolith. Add dedicated public projection tables and authenticated PostgreSQL RPCs, a focused browser publication repository, and a server-only anonymous reader; the public route never queries private training tables. Demo-mode adapters provide deterministic local management and anonymous-route fixtures so Playwright can exercise the complete experience without a Supabase session.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Supabase/PostgreSQL/RLS, Zod 4, Tailwind CSS, Vitest, Testing Library, Playwright.

---

## Scope and file map

This is one end-to-end feature with three sequential slices: Phase 5.1 establishes the privacy boundary, Phase 5.2 adds authenticated management, and Phase 5.3 consumes the projection anonymously. Each slice is independently testable, but Phase 5.2 and 5.3 intentionally depend on the Phase 5.1 contracts.

### Create

- `src/portfolio/contracts.ts` — domain types, Zod inputs, stable error codes, and skill-summary projection.
- `src/portfolio/contracts.test.ts` — validation, URL safety, ordering, and evidence-summary tests.
- `src/portfolio/portfolio-publication-repository.ts` — management repository interface and error normalization.
- `src/portfolio/supabase-portfolio-publication-repository.ts` — authenticated browser persistence through owner queries and RPCs.
- `src/portfolio/supabase-portfolio-publication-repository.test.ts` — query/RPC mapping and error behavior.
- `src/portfolio/demo-portfolio-publication-repository.ts` — localStorage-backed demo implementation.
- `src/portfolio/public-portfolio-reader.ts` — anonymous Supabase reader plus deterministic demo fixture.
- `src/portfolio/public-portfolio-reader.test.ts` — unpublished/unknown/error/safe projection coverage.
- `src/providers/portfolio-publication-provider.tsx` — client state, commands, refresh, and repository selection.
- `src/components/features/portfolio/portfolio-manager.tsx` — profile controls and three artifact-state sections.
- `src/components/features/portfolio/portfolio-manager.test.tsx` — management behavior and privacy assertions.
- `src/components/features/portfolio/artifact-publication-dialog.tsx` — allowlisted public-field editor.
- `src/components/features/portfolio/public-portfolio-view.tsx` — reusable responsive public projection with filters.
- `src/components/features/portfolio/public-portfolio-view.test.tsx` — public counts, filters, and safe links.
- `src/app/p/[slug]/page.tsx` — dynamic anonymous server-rendered public route and metadata.
- `src/app/p/[slug]/not-found.tsx` — non-disclosing missing/hidden portfolio state.
- `supabase/migrations/202607190004_phase5_public_portfolio.sql` — projection tables, RLS, indexes, triggers, and RPCs.
- `e2e/portfolio-publication.spec.ts` — demo-mode management flow.
- `e2e/public-portfolio.spec.ts` — anonymous desktop/mobile public route.
- `docs/phase-5-public-portfolio-setup.md` — deploy and production smoke-test runbook.

### Modify

- `src/components/features/view-models.ts` — include private artifact URL and canonical skill keys required by the publication editor.
- `src/app/_helpers/training-view-models.ts` — map those fields without changing the private artifact.
- `src/app/_helpers/training-view-models.test.ts` — lock the new mapping.
- `src/app/portfolio/page.tsx` — replace the read-only gallery route with the control center.
- `src/app/layout.tsx` — mount the focused publication provider inside the existing auth/training boundary.
- `src/lib/supabase/server.ts` — expose the bound `rpc` method required by server-side tests only if shared server usage needs it.
- `src/components/features/portfolio/portfolio-gallery.tsx` — remove after its filtering behavior has moved to the manager/public view.
- `src/components/features/portfolio/portfolio-gallery.test.tsx` — remove with the superseded component.
- `supabase/migrations/phase2-schema.test.ts` — assert Phase 5 privacy and SQL security contracts.
- `README.md` — document the opt-in portfolio feature and route.

## Task 1: Define public portfolio contracts and evidence projections

**Files:**
- Create: `src/portfolio/contracts.ts`
- Create: `src/portfolio/contracts.test.ts`

- [ ] **Step 1: Write failing contract tests**

```ts
import { describe, expect, it } from "vitest";

import {
  PublicPortfolioProfileInputSchema,
  PublishArtifactInputSchema,
  summarizePublicPortfolio,
} from "./contracts";

describe("public portfolio contracts", () => {
  it("accepts a normalized public profile and rejects an unsafe slug", () => {
    expect(PublicPortfolioProfileInputSchema.parse({
      slug: "barry-ml",
      displayName: "Barry",
      headline: "Machine Learning Engineer in Training",
      bio: "Building evaluated ML systems.",
    }).slug).toBe("barry-ml");
    expect(() => PublicPortfolioProfileInputSchema.parse({
      slug: "Barry ML",
      displayName: "Barry",
      headline: "Machine Learning Engineer",
      bio: "",
    })).toThrow();
  });

  it("accepts only the editable artifact fields", () => {
    expect(PublishArtifactInputSchema.parse({
      artifactId: "8a165314-e249-4187-957a-143f80997319",
      publicTitle: "Validated churn model",
      publicSummary: "Compared three baselines and documented validation leakage controls.",
      showArtifactUrl: true,
      featured: false,
      displayOrder: 0,
    })).not.toHaveProperty("qualityScore");
  });

  it("derives public evidence totals from visible snapshots", () => {
    const summary = summarizePublicPortfolio([
      { artifactId: "a", artifactType: "model_report", publicTitle: "A", publicSummary: "A summary", artifactUrl: null, skillTags: ["modeling", "evaluation"], qualityScore: 80, featured: true, displayOrder: 0, publishedAt: "2026-07-19T00:00:00.000Z", updatedAt: "2026-07-19T00:00:00.000Z" },
      { artifactId: "b", artifactType: "deployed_demo", publicTitle: "B", publicSummary: "B summary", artifactUrl: "https://example.com/demo", skillTags: ["engineering", "modeling"], qualityScore: 90, featured: false, displayOrder: 1, publishedAt: "2026-07-19T00:00:00.000Z", updatedAt: "2026-07-19T00:00:00.000Z" },
    ]);
    expect(summary).toMatchObject({ artifactCount: 2, featuredCount: 1, averageQualityScore: 85, demonstratedSkillCount: 3 });
    expect(summary.skillCoverage.modeling).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test and confirm the missing module failure**

Run: `npm run test:unit -- src/portfolio/contracts.test.ts`

Expected: FAIL because `src/portfolio/contracts.ts` does not exist.

- [ ] **Step 3: Implement focused contracts and pure summarization**

```ts
import { z } from "zod";

import { SkillKeySchema } from "@/domain/training/schemas";
import type { SkillKey } from "@/domain/training/types";

export const PublicPortfolioProfileInputSchema = z.strictObject({
  slug: z.string().min(3).max(50).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  displayName: z.string().trim().min(2).max(80),
  headline: z.string().trim().min(3).max(200),
  bio: z.string().trim().max(800),
});

export const PublishArtifactInputSchema = z.strictObject({
  artifactId: z.string().uuid(),
  publicTitle: z.string().trim().min(3).max(200),
  publicSummary: z.string().trim().min(20).max(1200),
  showArtifactUrl: z.boolean(),
  featured: z.boolean(),
  displayOrder: z.number().int().nonnegative().max(10_000),
});

export type PublicPortfolioProfileInput = z.infer<typeof PublicPortfolioProfileInputSchema>;
export type PublishArtifactInput = z.infer<typeof PublishArtifactInputSchema>;

export type PublicPortfolioProfile = PublicPortfolioProfileInput & {
  userId: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublishedArtifact = {
  artifactId: string;
  artifactType: string;
  publicTitle: string;
  publicSummary: string;
  artifactUrl: string | null;
  skillTags: readonly SkillKey[];
  qualityScore: number;
  featured: boolean;
  displayOrder: number;
  publishedAt: string;
  updatedAt: string;
};

export type PublicPortfolio = {
  profile: PublicPortfolioProfile;
  artifacts: readonly PublishedArtifact[];
};

export type PortfolioPublicationState = {
  profile: PublicPortfolioProfile | null;
  artifacts: readonly PublishedArtifact[];
};

export type PublicPortfolioSummary = {
  artifactCount: number;
  featuredCount: number;
  averageQualityScore: number;
  demonstratedSkillCount: number;
  skillCoverage: Record<SkillKey, number>;
};

const SKILLS = SkillKeySchema.options;

export function summarizePublicPortfolio(artifacts: readonly PublishedArtifact[]): PublicPortfolioSummary {
  const skillCoverage = Object.fromEntries(SKILLS.map((skill) => [skill, 0])) as Record<SkillKey, number>;
  for (const artifact of artifacts) {
    for (const skill of new Set(artifact.skillTags)) skillCoverage[skill] += 1;
  }
  const totalQuality = artifacts.reduce((sum, artifact) => sum + artifact.qualityScore, 0);
  return {
    artifactCount: artifacts.length,
    featuredCount: artifacts.filter((artifact) => artifact.featured).length,
    averageQualityScore: artifacts.length === 0 ? 0 : Math.round(totalQuality / artifacts.length),
    demonstratedSkillCount: Object.values(skillCoverage).filter((count) => count > 0).length,
    skillCoverage,
  };
}
```

- [ ] **Step 4: Run contract tests and typecheck**

Run: `npm run test:unit -- src/portfolio/contracts.test.ts && npm run typecheck`

Expected: both commands exit 0; three contract tests pass.

- [ ] **Step 5: Commit the domain slice**

```powershell
git add src/portfolio/contracts.ts src/portfolio/contracts.test.ts
git commit -m "feat: define public portfolio contracts"
```

## Task 2: Add the Supabase public projection and security boundary

**Files:**
- Create: `supabase/migrations/202607190004_phase5_public_portfolio.sql`
- Modify: `supabase/migrations/phase2-schema.test.ts`

- [ ] **Step 1: Add failing migration-contract assertions**

Add a test that loads `202607190004_phase5_public_portfolio.sql` and asserts the exact security invariants:

```ts
it("keeps public portfolio writes behind owner checks and authenticated RPCs", () => {
  const sql = readMigration("202607190004_phase5_public_portfolio.sql");
  expect(sql).toContain("alter table public.public_portfolios enable row level security");
  expect(sql).toContain("alter table public.published_artifacts enable row level security");
  expect(sql).toContain("auth.uid() = user_id");
  expect(sql).toContain("verification_status <> 'verified'");
  expect(sql).toContain("set search_path = pg_catalog, public");
  expect(sql).toContain("revoke all on function public.publish_portfolio_artifact");
  expect(sql).toContain("grant execute on function public.publish_portfolio_artifact");
  expect(sql).not.toMatch(/publish_portfolio_artifact\s*\([^)]*user_id/iu);
});
```

- [ ] **Step 2: Run the migration contract test and confirm failure**

Run: `npm run test:unit -- supabase/migrations/phase2-schema.test.ts`

Expected: FAIL because the Phase 5 migration is absent.

- [ ] **Step 3: Create the migration with explicit projection columns and RLS**

Implement the following database objects in one transaction:

```sql
begin;

create table public.public_portfolios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 3 and 50),
  display_name text not null check (char_length(display_name) between 2 and 80),
  headline text not null check (char_length(headline) between 3 and 200),
  bio text not null default '' check (char_length(bio) <= 800),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.published_artifacts (
  artifact_id uuid primary key references public.portfolio_artifacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  public_title text not null check (char_length(public_title) between 3 and 200),
  public_summary text not null check (char_length(public_summary) between 20 and 1200),
  artifact_type text not null,
  artifact_url text check (artifact_url is null or artifact_url ~ '^https://'),
  skill_tags text[] not null check (cardinality(skill_tags) > 0),
  quality_score integer not null check (quality_score between 0 and 100),
  featured boolean not null default false,
  display_order integer not null default 0 check (display_order between 0 and 10000),
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index published_artifacts_user_order_idx
  on public.published_artifacts(user_id, featured desc, display_order, published_at, artifact_id);

alter table public.public_portfolios enable row level security;
alter table public.published_artifacts enable row level security;

create policy "published portfolios are public"
on public.public_portfolios for select
using (is_published or auth.uid() = user_id);

create policy "owners insert public portfolio"
on public.public_portfolios for insert to authenticated
with check (auth.uid() = user_id and is_published = false);

create policy "owners update public portfolio"
on public.public_portfolios for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "published artifacts are public"
on public.published_artifacts for select
using (
  auth.uid() = user_id or exists (
    select 1 from public.public_portfolios p
    where p.user_id = published_artifacts.user_id and p.is_published
  )
);

grant select on public.public_portfolios, public.published_artifacts to anon, authenticated;
revoke insert, update, delete on public.published_artifacts from anon, authenticated;
```

The migration must also define `publish_portfolio_artifact(uuid,text,text,boolean,boolean,integer)` and `unpublish_portfolio_artifact(uuid)` as `security definer set search_path = pg_catalog, public`. The publish RPC must select the source with `where id = p_artifact_id and user_id = auth.uid()`, raise stable codes `portfolio_auth_required`, `portfolio_artifact_not_found`, `portfolio_artifact_not_verified`, `portfolio_artifact_url_not_https`, and `portfolio_featured_limit`, count featured rows excluding the current artifact, and upsert canonical `artifact_type`, `skill_tags`, `quality_score`, and the optionally copied HTTPS `artifact_url`. Revoke function execution from `public` and `anon`, then grant only to `authenticated`. The unpublish RPC must delete only `artifact_id = p_artifact_id and user_id = auth.uid()`.

- [ ] **Step 4: Run schema tests and inspect SQL whitespace**

Run: `npm run test:unit -- supabase/migrations/phase2-schema.test.ts && git diff --check`

Expected: tests exit 0 and `git diff --check` prints no errors.

- [ ] **Step 5: Apply the migration to a disposable Supabase environment**

Run with the Supabase CLI linked to a non-production project: `supabase db push --dry-run`

Expected: the output lists `202607190004_phase5_public_portfolio.sql` and reports no parse or dependency error. Do not apply it to production in this task.

- [ ] **Step 6: Commit the database boundary**

```powershell
git add supabase/migrations/202607190004_phase5_public_portfolio.sql supabase/migrations/phase2-schema.test.ts
git commit -m "feat: add secure public portfolio projection"
```

## Task 3: Implement the authenticated publication repository

**Files:**
- Create: `src/portfolio/portfolio-publication-repository.ts`
- Create: `src/portfolio/supabase-portfolio-publication-repository.ts`
- Create: `src/portfolio/supabase-portfolio-publication-repository.test.ts`

- [ ] **Step 1: Write repository tests with a fake Supabase client**

Create a chainable fake client whose `from`, `select`, `eq`, `maybeSingle`, `upsert`, and `rpc` calls are recorded. The five tests must assert: both reads call `eq("user_id", "user-1")`; initial profile upsert contains `is_published: false`; publish RPC arguments equal the six `p_*` inputs shown in Step 4 and contain none of `quality_score`, `skill_tags`, `artifact_type`, or `user_id`; `portfolio_featured_limit` becomes `PortfolioPublicationError("featured_limit")`; and unpublish calls only `unpublish_portfolio_artifact` without any `portfolio_artifacts.delete` operation. Avoid a live database in unit tests.

- [ ] **Step 2: Run the repository test and confirm missing implementation failures**

Run: `npm run test:unit -- src/portfolio/supabase-portfolio-publication-repository.test.ts`

Expected: FAIL because the repository modules do not exist.

- [ ] **Step 3: Define the repository interface and stable error**

```ts
import type {
  PortfolioPublicationState,
  PublicPortfolioProfileInput,
  PublishArtifactInput,
} from "./contracts";

export type PortfolioPublicationErrorCode =
  | "not_authenticated"
  | "slug_conflict"
  | "artifact_not_found"
  | "artifact_not_verified"
  | "artifact_url_not_https"
  | "featured_limit"
  | "unavailable";

export class PortfolioPublicationError extends Error {
  constructor(public readonly code: PortfolioPublicationErrorCode, message: string) {
    super(message);
    this.name = "PortfolioPublicationError";
  }
}

export interface PortfolioPublicationRepository {
  load(): Promise<PortfolioPublicationState>;
  saveProfile(input: PublicPortfolioProfileInput): Promise<void>;
  setVisibility(isPublished: boolean): Promise<void>;
  publishArtifact(input: PublishArtifactInput): Promise<void>;
  unpublishArtifact(artifactId: string): Promise<void>;
}
```

- [ ] **Step 4: Implement the Supabase adapter**

The adapter must obtain the authenticated user from `client.auth.getUser()`, scope both management reads to that user ID, map snake_case rows to the Task 1 contracts, and use these exact RPC payloads:

```ts
await client.rpc("publish_portfolio_artifact", {
  p_artifact_id: input.artifactId,
  p_public_title: input.publicTitle,
  p_public_summary: input.publicSummary,
  p_show_artifact_url: input.showArtifactUrl,
  p_featured: input.featured,
  p_display_order: input.displayOrder,
});

await client.rpc("unpublish_portfolio_artifact", {
  p_artifact_id: artifactId,
});
```

`saveProfile` must upsert `user_id`, validated profile fields, `is_published: false` only on initial creation, and `updated_at`. `setVisibility` must update only the authenticated owner's row and must reject publishing when no profile exists. Map PostgreSQL unique violation `23505` on `slug` to `slug_conflict`; map each stable RPC code from Task 2 to its matching repository error; expose no raw database message to UI callers.

- [ ] **Step 5: Run repository tests, typecheck, and lint the slice**

Run: `npm run test:unit -- src/portfolio/supabase-portfolio-publication-repository.test.ts && npm run typecheck && npm run lint`

Expected: all commands exit 0.

- [ ] **Step 6: Commit the production repository**

```powershell
git add src/portfolio/portfolio-publication-repository.ts src/portfolio/supabase-portfolio-publication-repository.ts src/portfolio/supabase-portfolio-publication-repository.test.ts
git commit -m "feat: add portfolio publication repository"
```

## Task 4: Add demo persistence and client publication state

**Files:**
- Create: `src/portfolio/demo-portfolio-publication-repository.ts`
- Create: `src/providers/portfolio-publication-provider.tsx`
- Create: `src/providers/portfolio-publication-provider.test.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write provider tests**

Render a probe component under the provider with a fake repository. Assert its first resolved state is `{ profile: null, artifacts: [] }`; `saveProfile` causes exactly one command call followed by one additional `load`; publish and unpublish each do the same; and a rejected command exposes the normalized message through `commandError` while restoring `commandStatus` to `idle`. Also test the demo repository by installing an in-memory `Storage`, publishing one artifact, recreating the repository, and asserting the snapshot persists under `mlevelup-portfolio-publication-v1`.

- [ ] **Step 2: Run provider tests and confirm failure**

Run: `npm run test:unit -- src/providers/portfolio-publication-provider.test.tsx`

Expected: FAIL because the provider does not exist.

- [ ] **Step 3: Implement the demo repository**

The demo repository must implement the Task 3 interface, seed a private profile with slug `demo-ml-engineer`, persist state in localStorage, enforce at most three featured snapshots, and reject publishing any artifact ID not found in the existing verified demo artifact allowlist. It must preserve the same error codes as production so UI behavior does not branch by environment.

- [ ] **Step 4: Implement the provider and repository factory**

Expose this exact consumer contract:

```ts
type PortfolioPublicationContextValue = {
  state: PortfolioPublicationState | null;
  status: "loading" | "ready" | "error";
  commandStatus: "idle" | "submitting";
  loadError: string | null;
  commandError: string | null;
  commandSuccess: string | null;
  saveProfile(input: PublicPortfolioProfileInput): Promise<void>;
  setVisibility(isPublished: boolean): Promise<void>;
  publishArtifact(input: PublishArtifactInput): Promise<void>;
  unpublishArtifact(artifactId: string): Promise<void>;
  refresh(): Promise<void>;
};
```

Select `DemoPortfolioPublicationRepository` only when `isDemoMode()` is true. Otherwise require `getBrowserSupabaseClient()` and create the production adapter. Mount `PortfolioPublicationProvider` inside the existing auth boundary so anonymous public pages do not depend on it.

- [ ] **Step 5: Run provider tests and the existing provider regression suite**

Run: `npm run test:unit -- src/providers/portfolio-publication-provider.test.tsx src/providers/training-repository-factory.test.ts src/auth/auth-provider.test.tsx`

Expected: all tests pass and demo/auth selection remains unchanged.

- [ ] **Step 6: Commit client state support**

```powershell
git add src/portfolio/demo-portfolio-publication-repository.ts src/providers/portfolio-publication-provider.tsx src/providers/portfolio-publication-provider.test.tsx src/app/layout.tsx
git commit -m "feat: manage portfolio publication state"
```

## Task 5: Build the authenticated portfolio control center

**Files:**
- Modify: `src/components/features/view-models.ts`
- Modify: `src/app/_helpers/training-view-models.ts`
- Modify: `src/app/_helpers/training-view-models.test.ts`
- Create: `src/components/features/portfolio/artifact-publication-dialog.tsx`
- Create: `src/components/features/portfolio/portfolio-manager.tsx`
- Create: `src/components/features/portfolio/portfolio-manager.test.tsx`
- Modify: `src/app/portfolio/page.tsx`
- Delete: `src/components/features/portfolio/portfolio-gallery.tsx`
- Delete: `src/components/features/portfolio/portfolio-gallery.test.tsx`

- [ ] **Step 1: Extend the private view model with canonical publication context**

Change `PortfolioArtifactView` to include the original safe URL and canonical skill keys while retaining localized labels:

```ts
export type PortfolioArtifactView = {
  id: string;
  title: string;
  artifactType: string;
  skillKeys: readonly SkillKey[];
  skillTags: readonly string[];
  artifactUrl?: string;
  qualityScore: number;
  verificationStatus: string;
  isPrivate: true;
  summary?: string;
};
```

Update `mapArtifact` to copy `skillKeys: artifact.skillTags` and `artifactUrl: artifact.artifactUrl`. Add a mapper test that proves an HTTPS URL and canonical keys survive presentation mapping.

- [ ] **Step 2: Write failing management UI tests**

Cover seven visible behaviors with Testing Library: saving setup calls `saveProfile` but never `setVisibility`; one verified unpublished, one published, and one rejected artifact appear under their matching headings; the rejected card has no Publish action; dialog submission equals the six-field `PublishArtifactInput`; changing a published slug opens a confirmation before saving; Hide calls `setVisibility(false)` and never `unpublishArtifact`; and a private-only description string is absent from preview output.

- [ ] **Step 3: Run mapping and manager tests to observe failure**

Run: `npm run test:unit -- src/app/_helpers/training-view-models.test.ts src/components/features/portfolio/portfolio-manager.test.tsx`

Expected: FAIL until the extended mapping and manager exist.

- [ ] **Step 4: Implement the allowlisted publication dialog**

The form must contain only public title, public summary, show-link, featured, and order controls. Initialize from a snapshot when editing or from the private artifact title/summary when first publishing. Parse on submit with `PublishArtifactInputSchema`; show inline validation; disable URL display when the private artifact has no HTTPS URL. Do not render editable inputs for quality, skills, type, or verification.

- [ ] **Step 5: Implement the manager sections and controls**

Derive lists exactly as follows:

```ts
const publishedIds = new Set(publication.artifacts.map((artifact) => artifact.artifactId));
const published = publication.artifacts;
const publishable = privateArtifacts.filter(
  (artifact) => artifact.verificationStatus === "verified" && !publishedIds.has(artifact.id),
);
const blocked = privateArtifacts.filter(
  (artifact) => artifact.verificationStatus !== "verified",
);
```

Render profile setup, explicit whole-portfolio publish/hide, copy link, preview, and Published/Publishable/Not publishable sections. Up/down ordering calls `publishArtifact` for the affected snapshot with a swapped integer order. Feature actions must display the repository's fourth-feature error. Every mutation needs disabled/loading state, `role="status"` success, and `role="alert"` failure. The preview receives only `PublicPortfolio`, never private artifacts.

- [ ] **Step 6: Wire `/portfolio` to training and publication providers**

Map private artifacts from `useTraining()`, read public state and commands from `usePortfolioPublication()`, and render `PortfolioManager` inside `TrainingPageShell`. Remove query-string filtering owned by the old gallery. Delete the superseded gallery and migrate any reusable card markup into the focused manager/public components.

- [ ] **Step 7: Run UI tests, accessibility-oriented assertions, and typecheck**

Run: `npm run test:unit -- src/app/_helpers/training-view-models.test.ts src/components/features/portfolio/portfolio-manager.test.tsx && npm run typecheck && npm run lint`

Expected: all commands exit 0; tests prove no blocked publish action and no private preview text.

- [ ] **Step 8: Commit the control center**

```powershell
git add src/components/features/view-models.ts src/app/_helpers/training-view-models.ts src/app/_helpers/training-view-models.test.ts src/components/features/portfolio src/app/portfolio/page.tsx
git commit -m "feat: build portfolio publication control center"
```

## Task 6: Add the anonymous public reader and server route

**Files:**
- Create: `src/portfolio/public-portfolio-reader.ts`
- Create: `src/portfolio/public-portfolio-reader.test.ts`
- Create: `src/components/features/portfolio/public-portfolio-view.tsx`
- Create: `src/components/features/portfolio/public-portfolio-view.test.tsx`
- Create: `src/app/p/[slug]/page.tsx`
- Create: `src/app/p/[slug]/not-found.tsx`

- [ ] **Step 1: Write failing reader and public-view tests**

Reader tests must assert that `from()` receives only `public_portfolios` and `published_artifacts`; a no-row profile returns `null`; artifacts are ordered featured-first then by explicit order; and demo slug `demo-ml-engineer` returns the deterministic fixture without invoking Supabase. Public-view tests must assert the exact evidence totals and skill counts from a two-artifact fixture; selecting Modeling and `model_report` removes the nonmatching card; only the HTTPS fixture produces an anchor with `target="_blank"` and `rel="noopener noreferrer"`; and injected private strings for email, reflection, feedback, reviewer notes, failure state, and recovery state are absent from rendered output.

- [ ] **Step 2: Run reader and public-view tests and confirm failure**

Run: `npm run test:unit -- src/portfolio/public-portfolio-reader.test.ts src/components/features/portfolio/public-portfolio-view.test.tsx`

Expected: FAIL because the reader and view do not exist.

- [ ] **Step 3: Implement the anonymous reader**

Create a Supabase client with the publishable key, disabled session persistence, and no authorization override. Query `public_portfolios` by `slug` and `is_published = true`, then query `published_artifacts` by the returned `user_id`, ordered by `featured desc`, `display_order`, `published_at`, and `artifact_id`. Map only the allowlisted Task 1 fields. Return `null` for PostgREST no-row behavior; throw a generic `PublicPortfolioReadError` for operational failures. When `isDemoMode()` and slug is `demo-ml-engineer`, return a deterministic fixture containing three safe artifacts and all seven skill dimensions.

- [ ] **Step 4: Implement the recruiter-readable public view**

Render public identity, last update, artifact/featured/average-quality/demonstrated-skill totals, non-zero evidence-backed skill coverage, up to three featured cards, filters, and the full artifact grid. Use `SafeHttpsUrlSchema.safeParse` before rendering any link and set `target="_blank" rel="noopener noreferrer"`. Use a one-column mobile layout, two-column tablet grid, and desktop identity/evidence sidebar plus work area. Keep the existing dark command-center tokens while reducing RPG terminology.

- [ ] **Step 5: Implement `/p/[slug]` as a dynamic server route**

```tsx
import { notFound } from "next/navigation";

import { PublicPortfolioView } from "@/components/features/portfolio/public-portfolio-view";
import { readPublicPortfolio } from "@/portfolio/public-portfolio-reader";

export const dynamic = "force-dynamic";

export default async function PublicPortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const portfolio = await readPublicPortfolio(slug);
  if (!portfolio) notFound();
  return <PublicPortfolioView portfolio={portfolio} />;
}
```

Add `generateMetadata` using the same public identity and no private fallback. `not-found.tsx` must say only that the portfolio is unavailable; it must not distinguish missing, hidden, or deleted profiles.

- [ ] **Step 6: Run reader/view tests and a production build**

Run: `npm run test:unit -- src/portfolio/public-portfolio-reader.test.ts src/components/features/portfolio/public-portfolio-view.test.tsx && npm run typecheck && npm run build`

Expected: all tests pass, TypeScript exits 0, and Next.js lists `/p/[slug]` as a dynamic route.

- [ ] **Step 7: Commit the anonymous portfolio**

```powershell
git add src/portfolio/public-portfolio-reader.ts src/portfolio/public-portfolio-reader.test.ts src/components/features/portfolio/public-portfolio-view.tsx src/components/features/portfolio/public-portfolio-view.test.tsx src/app/p
git commit -m "feat: add anonymous public portfolio route"
```

## Task 7: Add browser flows and privacy regression coverage

**Files:**
- Create: `e2e/portfolio-publication.spec.ts`
- Create: `e2e/public-portfolio.spec.ts`

- [ ] **Step 1: Write the authenticated demo publication flow**

```ts
import { expect, test } from "@playwright/test";

test("learner configures, publishes, previews, and hides a portfolio", async ({ page }) => {
  await page.goto("/portfolio");
  await page.getByLabel("Display name").fill("Barry");
  await page.getByLabel("Public slug").fill("barry-ml");
  await page.getByLabel("Headline").fill("Machine Learning Engineer in Training");
  await page.getByRole("button", { name: "Save public profile" }).click();
  await expect(page.getByText("Portfolio remains private")).toBeVisible();
  await page.getByRole("button", { name: /Publish artifact/ }).first().click();
  await page.getByLabel("Public summary").fill("A reproducible machine-learning artifact with explicit evaluation evidence.");
  await page.getByRole("button", { name: "Confirm publication" }).click();
  await expect(page.getByRole("heading", { name: "Published" })).toBeVisible();
  await page.getByRole("button", { name: "Publish portfolio" }).click();
  await expect(page.getByText("/p/barry-ml")).toBeVisible();
  await page.getByRole("button", { name: "Hide portfolio" }).click();
  await expect(page.getByRole("heading", { name: "Published" })).toBeVisible();
});
```

- [ ] **Step 2: Write the anonymous public and privacy flow**

```ts
test("anonymous visitor sees only the public projection", async ({ page }) => {
  await page.goto("/p/demo-ml-engineer");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Machine Learning");
  await expect(page.getByText("Evidence-backed skills")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("self_reflection");
  await expect(page.locator("body")).not.toContainText("reviewer_notes");
  await expect(page.locator('a[href^="http:"]')).toHaveCount(0);
});

test("unknown portfolio does not disclose publication state", async ({ page }) => {
  const response = await page.goto("/p/not-a-real-portfolio");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Portfolio unavailable")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("hidden");
});
```

- [ ] **Step 3: Run only the new Playwright specs on desktop and mobile**

Run: `npx.cmd playwright test e2e/portfolio-publication.spec.ts e2e/public-portfolio.spec.ts`

Expected: both specs pass in `desktop-chromium` and `mobile-chromium`; unknown slug returns 404; no HTTP link or sensitive field name is rendered.

- [ ] **Step 4: Commit end-to-end coverage**

```powershell
git add e2e/portfolio-publication.spec.ts e2e/public-portfolio.spec.ts
git commit -m "test: cover public portfolio flows"
```

## Task 8: Document deployment and complete all acceptance gates

**Files:**
- Create: `docs/phase-5-public-portfolio-setup.md`
- Modify: `README.md`

- [ ] **Step 1: Write the deployment and smoke-test runbook**

Document these exact operations:

1. Apply `202607190004_phase5_public_portfolio.sql` through the Supabase SQL editor or linked CLI.
2. Confirm both projection tables show RLS enabled.
3. Create or reuse one verified owned artifact and one pending/rejected artifact.
4. Configure a private public profile, verify its anonymous URL returns 404, publish it, and verify the URL returns 200.
5. Publish the verified artifact; confirm the blocked artifact has no publication action.
6. In an anonymous browser, inspect rendered content and network responses for `email`, `self_reflection`, `reviewer_notes`, `feedback`, `failure_streak`, and `recovery`.
7. Try a direct anonymous insert/update/delete against `published_artifacts`; expect RLS denial.
8. Try calling publish for a foreign or unverified artifact; expect the stable rejection code.
9. Hide the portfolio; expect 404 anonymously while the owner's published snapshots remain in management view.
10. Record the production URL, artifact ID used, HTTP status evidence, and timestamp without recording access tokens or secrets.

- [ ] **Step 2: Update README scope and usage**

Add the public portfolio to the feature list, describe opt-in publication and verified-only artifacts, link to `docs/phase-5-public-portfolio-setup.md`, and identify `/portfolio` as authenticated management and `/p/[slug]` as anonymous display. Do not describe Phase 5.4+ features as implemented.

- [ ] **Step 3: Run focused and full automated verification**

Run:

```powershell
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
git diff --check
git status --short
```

Expected:

- ESLint exits 0 with zero warnings.
- TypeScript exits 0 with zero errors.
- All Vitest tests pass, including contracts, migration, repositories, providers, manager, reader, and public view.
- All Playwright tests pass in desktop and mobile projects.
- `git diff --check` prints nothing.
- `git status --short` lists only the intended README/runbook changes before the final commit.

- [ ] **Step 4: Manually inspect both responsive experiences**

Run `npm run dev`, then inspect `/portfolio` and `/p/demo-ml-engineer` at approximately 390px, 768px, and 1440px widths. Confirm no horizontal page overflow, controls remain keyboard reachable, dialogs retain visible focus, cards do not overlap, filters remain usable, and the public page reads as a professional evidence portfolio rather than a private training dashboard.

- [ ] **Step 5: Commit documentation and verified closeout**

```powershell
git add README.md docs/phase-5-public-portfolio-setup.md
git commit -m "docs: document public portfolio deployment"
```

## Production acceptance record

After deployment, the implementer must report evidence for every item below before declaring Phase 5.1–5.3 complete:

- Migration identifier applied and Supabase success output.
- Private profile anonymous request: HTTP 404.
- Published profile anonymous request: HTTP 200.
- Verified artifact visible; blocked artifact absent from publication controls.
- Forged canonical fields impossible because the RPC input has no quality, skill, type, verification, URL, or user-ID authority.
- Fourth featured artifact rejected with `portfolio_featured_limit`.
- Direct snapshot mutation denied by RLS.
- Whole-portfolio hide returns anonymous 404 but keeps owner snapshots.
- Anonymous HTML/network scan contains none of the prohibited private fields.
- Exact lint, typecheck, Vitest, build, and desktop/mobile Playwright counts.

Do not merge or push based only on an implementation agent's completion statement. Inspect the diff, migration grants/policies, query targets, and test output directly first.
