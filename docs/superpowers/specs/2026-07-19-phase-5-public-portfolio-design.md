# MLevelUp Phase 5.1–5.3 Public Portfolio Design

## Goal

Turn verified MLevelUp training outcomes into an opt-in, publicly shareable machine-learning-engineer portfolio without exposing private training data or allowing learners to forge verification, skill, or quality claims.

## Approved scope

This delivery covers:

- Phase 5.1: public portfolio data model, publication rules, and privacy boundary;
- Phase 5.2: authenticated portfolio management and publication interface;
- Phase 5.3: anonymous public portfolio page at `/p/{slug}`.

It does not include AI-written case studies, Kaggle or hackathon integrations, leaderboards, badges, PDF export, custom domains, themes, or analytics.

## Product principles

### Opt-in publication

- Every existing and future portfolio artifact is private by default.
- A learner explicitly selects each artifact to publish.
- Publishing, unpublishing, or hiding the whole portfolio never changes XP, skill values, submissions, mission state, or the private artifact.
- A learner may edit the public title and summary before publication.
- The system never automatically publishes content.

### Evidence before claims

- Only artifacts with `verification_status = 'verified'` can be published.
- Public quality score, artifact type, and skill tags are copied from the verified private artifact by a database function.
- Browser input cannot select or override those canonical fields.
- Public skill coverage is derived from published evidence rather than exposing internal `skill_stats` scores.

### Separate public projection

The private `profiles`, `portfolio_artifacts`, `submissions`, and `feedback` tables remain private. Anonymous access is granted only to dedicated public projection tables containing an allowlisted set of display fields.

## Selected architecture

Keep the Next.js and Supabase modular monolith. Add two public projection tables and narrowly scoped PostgreSQL functions for publishing and unpublishing artifacts.

```text
private portfolio_artifacts
        |
        | authenticated learner explicitly publishes
        v
database publication function
        |
        | verifies ownership and verification status
        | copies canonical safe fields
        v
published_artifacts + public_portfolios
        |
        | anonymous read of published rows only
        v
Next.js /p/{slug}
```

The authenticated `/portfolio` page uses a focused publication repository. The anonymous public route is server-rendered and reads only the public projection with the Supabase publishable key.

## Alternatives considered

### Add public columns to private tables

This is smaller initially but unsafe over time. PostgreSQL row-level security controls rows, not a future-proof allowlist of columns. Adding new private columns later could unintentionally expose them through public queries.

### Generate the entire portfolio with AI

This creates a polished result quickly but introduces hallucinated claims, versioning complexity, and unclear authority. AI-assisted case-study writing belongs in Phase 5.4 after the deterministic publication boundary exists.

### Build a full GitHub-style project system

Project timelines, experiment graphs, commits, and retrospectives would be valuable but require a much broader content model. Phase 5.1–5.3 publishes the artifacts already created by the training loop.

## Data model

### `public_portfolios`

One optional public profile per learner:

| Column | Type | Rules |
| --- | --- | --- |
| `user_id` | `uuid` | Primary key; references `auth.users(id)` with cascade delete |
| `slug` | `text` | Unique, lowercase, 3–40 characters, `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| `display_name` | `text` | 2–60 characters |
| `headline` | `text` | 3–100 characters |
| `bio` | `text` | 0–500 characters |
| `is_published` | `boolean` | Defaults to false |
| `created_at` | `timestamptz` | Defaults to current time |
| `updated_at` | `timestamptz` | Updated on profile mutation |

The table never stores email, timezone, training status, failure count, recovery state, self-reflection, or reviewer notes.

### `published_artifacts`

One public snapshot per private artifact:

| Column | Type | Rules |
| --- | --- | --- |
| `artifact_id` | `uuid` | Primary key; references `portfolio_artifacts(id)` with cascade delete |
| `user_id` | `uuid` | References `auth.users(id)` with cascade delete |
| `public_title` | `text` | 3–100 characters |
| `public_summary` | `text` | 20–600 characters |
| `artifact_type` | `text` | Copied from private artifact |
| `artifact_url` | `text` | Optional HTTPS URL copied or explicitly omitted |
| `skill_tags` | `text[]` | Copied from private artifact |
| `quality_score` | `integer` | Copied from private artifact, 0–100 |
| `featured` | `boolean` | Defaults to false; maximum three per learner |
| `display_order` | `integer` | Non-negative; deterministic secondary ordering by publication time and artifact ID |
| `published_at` | `timestamptz` | Set by database publication function |
| `updated_at` | `timestamptz` | Set by database publication function |

No submission payload, evidence metadata, private artifact description, feedback, or reviewer notes are copied.

## Database functions

### Save public profile

An authenticated learner may create or update only their own `public_portfolios` row. The database validates slug format and uniqueness. Slug conflicts return a stable application error.

Changing a published slug is allowed but requires a user-facing warning because the old public URL stops working.

### Publish artifact

`publish_portfolio_artifact` receives only:

- artifact ID;
- public title;
- public summary;
- whether to display the existing artifact URL;
- featured flag;
- display order.

The function:

1. requires an authenticated user;
2. selects a private artifact owned by `auth.uid()`;
3. requires `verification_status = 'verified'`;
4. rejects a non-HTTPS artifact URL when URL display is requested;
5. rejects a fourth featured artifact;
6. copies artifact type, skill tags, quality score, and approved URL from the private artifact;
7. inserts or updates one public snapshot atomically.

The function never accepts canonical quality, verification, skill, or artifact-type fields from the browser.

### Unpublish artifact

`unpublish_portfolio_artifact` requires ownership and deletes only the matching public snapshot. The private artifact and all training records remain unchanged.

### Reorder artifacts

MVP ordering uses explicit up and down actions. The database accepts bounded integer positions only for the authenticated learner's published artifacts. Drag-and-drop and arbitrary layout coordinates are excluded.

## Row-level security

### `public_portfolios`

- Anonymous and authenticated visitors may select rows only where `is_published = true`.
- An authenticated learner may select their own row even while unpublished.
- Only the owner may insert or update their row.
- Browser clients cannot change `user_id` ownership.

### `published_artifacts`

- Anonymous and authenticated visitors may select a snapshot only when its owning `public_portfolios.is_published = true`.
- The owner may select their own snapshots while the portfolio is unpublished for editing and preview.
- Direct browser insert and update are denied; publication functions own canonical snapshot writes.
- Direct anonymous or authenticated delete is denied; unpublication uses the ownership-checking function.

The functions use a fixed `search_path`, do not accept user IDs, and grant execution only to `authenticated`.

## Authenticated management interface

The existing `/portfolio` route becomes the portfolio control center.

### Initial setup

Before a public profile exists, show:

- display name;
- slug with `/p/` prefix preview;
- headline, defaulting to `Machine Learning Engineer in Training`;
- optional bio;
- save action that does not automatically publish.

### Artifact sections

#### Publishable

Verified private artifacts without a public snapshot. Each card shows type, quality score, skills, and a publish action.

#### Published

Public snapshots with edit, feature, move up, move down, preview, and unpublish actions.

#### Not publishable

Pending, needs-revision, or rejected artifacts. The card states the exact verification reason and offers no publication bypass.

### Publication editor

The learner can edit:

- public title;
- public summary;
- whether the existing HTTPS artifact URL is displayed;
- featured status;
- display order through up and down actions.

The learner cannot edit public quality score, skill tags, artifact type, or verification state.

### Portfolio controls

- Publish or hide the entire portfolio.
- Copy the public URL.
- Preview the current public projection inside the authenticated management page.
- Warn before changing a published slug.
- Preserve public artifact snapshots while the whole portfolio is hidden.

The MVP uses cards and dialogs that match the existing command-center design. It does not add drag-and-drop, themes, custom colors, templates, or background images.

## Anonymous public page

### Route

`/p/[slug]` is a Next.js server-rendered route. It uses the Supabase publishable key without requiring a session and dynamically reads the public projection so publication changes appear after refresh.

Unknown or unpublished slugs return the framework 404 page rather than revealing that a private profile exists.

### Content hierarchy

1. Public identity: display name, headline, bio, and last update.
2. Evidence summary: artifact count, featured count, average quality score, and demonstrated skill count.
3. Evidence-backed skill coverage: artifact count for each of the seven skill dimensions represented by published artifacts.
4. Up to three featured artifacts in configured order.
5. All published artifacts with skill and artifact-type filters.

### Evidence-backed skills

The public page does not expose internal `skill_stats`. It derives coverage from `published_artifacts.skill_tags`, for example:

```text
Engineering     4 artifacts
Modeling        3 artifacts
Evaluation      2 artifacts
Communication   1 artifact
```

This ensures every visible skill has published evidence behind it.

### Responsive behavior

- Mobile: single-column cards and horizontally scrollable filters.
- Tablet: two-column artifact grid.
- Desktop: public identity and skill evidence beside featured work and the artifact grid.
- The visual system retains the original dark technical command-center language while reducing game-interface density for recruiter readability.

### External links

- Only HTTPS URLs are rendered.
- Links open in a new tab with safe `rel` attributes.
- Missing or invalid URLs result in no external action, not a broken or unsafe link.

## Data flow

### Publish

```text
authenticated learner
  -> portfolio manager
  -> publication repository
  -> publish_portfolio_artifact RPC
  -> ownership and verification checks
  -> safe snapshot upsert
  -> refreshed management view
```

### Public read

```text
anonymous visitor
  -> /p/{slug}
  -> public portfolio query
  -> published profile and snapshots only
  -> server-rendered portfolio page
```

### Unpublish

```text
authenticated learner
  -> unpublish RPC
  -> public snapshot deleted
  -> private artifact, XP, skills, submission, and feedback unchanged
```

## Error behavior

| Condition | Result |
| --- | --- |
| Slug does not exist | 404 |
| Portfolio exists but is hidden | 404 for visitors; editable by owner |
| Artifact is not owned by caller | Publication function rejects |
| Artifact is not verified | Publication function rejects with stable reason |
| Browser alters quality, skill, or type | Input is ignored because function copies canonical fields |
| Requested URL is not HTTPS | Publication function rejects URL display |
| Fourth artifact is marked featured | Publication function rejects |
| Slug is already used | Profile save returns a clear conflict error |
| Public artifact is removed | It disappears after refresh; private artifact remains |
| Public query fails | Render a safe error state without leaking database details |

## Testing strategy

### Migration and security contracts

- Table columns, constraints, indexes, and foreign keys.
- Unique slug and slug-format checks.
- Public projection tables have RLS enabled.
- Anonymous read requires a published portfolio.
- Owner-only profile mutation.
- Direct public snapshot writes are denied.
- Publication functions have fixed search paths, accept no user ID, and are executable only by authenticated users.

### Publication domain and repository

- Verified owned artifact publishes successfully.
- Pending, needs-revision, rejected, and foreign artifacts are rejected.
- Canonical quality, skills, type, and URL come from the private artifact.
- HTTP and non-web protocols are rejected.
- Fourth featured artifact is rejected.
- Re-publication updates one snapshot rather than duplicating it.
- Unpublish removes only the snapshot.
- Slug collision returns a stable user-facing error.

### Management UI

- Setup validates fields and remains private after save.
- Cards are separated into publishable, published, and blocked states.
- Canonical fields are read-only.
- Publish, edit, reorder, feature, unpublish, hide, and copy-link actions report loading, success, and failure accessibly.
- Preview shows only the public projection.

### Public UI

- Published slug renders without authentication.
- Unknown and hidden slugs return 404.
- Only published snapshots appear.
- Skill coverage is derived from visible artifacts.
- Invalid external links are not rendered.
- Mobile, tablet, and desktop layouts remain usable.
- Rendered HTML and network responses contain no submission, reflection, feedback, email, or private artifact fields.

### Complete verification

- ESLint with zero warnings.
- TypeScript with zero errors.
- Vitest migration, mapping, repository, and component suites.
- Next.js production build.
- Playwright authenticated management and anonymous desktop/mobile flows.
- Production smoke test with one verified artifact, one blocked artifact, one hidden portfolio, and one anonymous visitor.

## Acceptance criteria

1. Existing artifacts remain private after deployment.
2. A learner can configure a profile without publishing it.
3. Only a verified, learner-owned artifact can produce a public snapshot.
4. Public quality score, skills, type, and URL cannot be forged by browser input.
5. A learner can publish, edit, feature, order, unpublish, and preview artifacts.
6. A learner can hide the whole portfolio without deleting snapshots or private artifacts.
7. `/p/{slug}` renders for anonymous visitors only when the portfolio is published.
8. Unknown and hidden slugs return 404 without revealing private existence.
9. The public page displays evidence-backed skill coverage and at most three featured artifacts.
10. No public response contains email, submission evidence, reflection, feedback, reviewer notes, failure state, or recovery state.
11. Publication and unpublication never change XP, internal skills, missions, or the private artifact.
12. All automated and production smoke-test gates pass.

## Delivery sequence

### Phase 5.1: Privacy boundary

- Add public projection tables, constraints, indexes, RLS, and publication functions.
- Add TypeScript public portfolio contracts and mapping tests.
- Verify existing private artifacts remain inaccessible anonymously.

### Phase 5.2: Portfolio control center

- Add focused publication repository methods.
- Add public-profile setup and visibility controls.
- Add artifact publication editor, state sections, ordering, feature limit, preview, and unpublish.
- Preserve the existing private artifact gallery and training behavior.

### Phase 5.3: Anonymous public portfolio

- Add `/p/[slug]` server-rendered route.
- Add identity, evidence summary, skill coverage, featured artifacts, filters, and responsive layout.
- Add 404, safe-link, privacy, anonymous, and production smoke tests.

## Residual risks

- Public artifact snapshots can become stale if private artifact display fields later become mutable. Private canonical fields are currently treated as immutable; future mutation work must define snapshot refresh behavior.
- Slug changes break previously shared links. The MVP warns but does not maintain redirects.
- Dynamic public queries prioritize immediate correctness over caching. Traffic growth may require revalidation and rate controls.
- Quality score is system-generated but not third-party certification; the UI must describe it as MLevelUp evaluation rather than an external credential.

