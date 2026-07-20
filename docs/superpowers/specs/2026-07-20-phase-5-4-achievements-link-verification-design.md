# MLevelUp Phase 5.4 AI Achievements and Link Verification Design

## Goal

Turn a verified MLevelUp artifact into concise, source-grounded resume bullets and independently verify that its public GitHub or Kaggle link exists. The result improves recruiter readability without claiming account ownership or allowing AI-generated facts to become system-verified evidence.

## Approved scope

This delivery combines two related subprojects in one release:

- Phase 5.4A: manually generated, editable, user-approved Key achievements;
- Phase 5.4B: manually triggered public-link existence verification for supported GitHub and Kaggle resources.

It does not include account ownership verification, GitHub OAuth, Kaggle credentials, private repositories, private submissions, PDF export, sharing cards, leaderboards, badges, custom themes, or automatic generation.

## Product decisions

- Achievement generation is always initiated manually from `/portfolio`.
- AI output is a private draft until the learner explicitly approves it.
- Approved achievements appear in a separate `Key achievements` section and do not replace the existing public summary.
- Link verification is always initiated manually with `Verify Link`.
- Link verification means only that a supported public resource existed when checked.
- The UI must never label an artifact as ownership-verified.
- GitHub, Kaggle, or OpenAI failure never changes XP, skills, task completion, artifact verification, or portfolio visibility.

## Selected architecture

Keep the existing Next.js and Supabase modular monolith. Use two authenticated server routes with focused application services rather than one combined agent or a new worker system.

```text
/portfolio
  |
  +-- Verify Link
  |     -> POST /api/portfolio/verify-link
  |     -> authenticated artifact lookup
  |     -> strict platform URL parser
  |     -> GitHub or Kaggle verifier
  |     -> artifact_link_verifications
  |
  +-- Generate achievements
        -> POST /api/portfolio/generate-achievements
        -> authenticated artifact facts
        -> allowlisted quest, metric, and link metadata facts
        -> OpenAI structured output
        -> deterministic grounding validator
        -> artifact_achievement_drafts

Approved draft
  -> existing publication RPC
  -> published_artifacts.key_achievements
  -> anonymous /p/[slug]
```

The verifiers and achievement generator share an artifact authorization service, but their failures, persistence, retries, and telemetry remain independent.

## Data model

### `artifact_link_verifications`

One current verification snapshot per artifact and normalized link:

| Column | Type | Rule |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `artifact_id` | `uuid` | References private `portfolio_artifacts(id)` with cascade delete |
| `user_id` | `uuid` | Derived from authenticated artifact ownership |
| `provider` | `text` | `github` or `kaggle` |
| `resource_type` | `text` | `repository`, `commit`, `notebook`, or `competition` |
| `normalized_url` | `text` | Canonical HTTPS platform URL |
| `external_id` | `text` | Repository full name, commit SHA, notebook ref, or competition slug |
| `status` | `text` | `verified`, `unavailable`, `unsupported`, `error`, or `stale` |
| `metadata` | `jsonb` | Allowlisted public metadata only |
| `error_code` | `text` | Stable internal code; no upstream body or secret |
| `verified_at` | `timestamptz` | Successful check time, nullable |
| `stale_after` | `timestamptz` | Successful check time plus 30 days, nullable |
| `created_at` | `timestamptz` | Creation time |
| `updated_at` | `timestamptz` | Last attempt time |

Use a unique constraint on `(artifact_id, normalized_url)`. A new attempt updates the snapshot rather than creating an unbounded history table. Operational telemetry belongs in server logs, not public rows.

The metadata allowlist is provider- and type-specific:

- GitHub repository: full name, description, default branch, primary language, topics, visibility, archived flag, pushed time;
- GitHub commit: repository full name, full SHA, commit time, public author login when available, commit message subject, Git signature verification state;
- Kaggle notebook: owner reference, notebook slug/title, last updated time, public status when available;
- Kaggle competition: competition slug/title, category, deadline, and public status when available.

Email addresses, raw commit message bodies, patches, tokens, cookies, API credentials, arbitrary HTML, and upstream response dumps are excluded.

### `artifact_achievement_drafts`

One current private draft per artifact:

| Column | Type | Rule |
| --- | --- | --- |
| `artifact_id` | `uuid` | Primary key and private artifact reference |
| `user_id` | `uuid` | Derived from authenticated ownership |
| `bullets` | `jsonb` | Three to five validated bullet objects |
| `status` | `text` | `draft`, `approved`, or `outdated` |
| `source_fingerprint` | `text` | Hash of the ordered allowlisted source facts |
| `model` | `text` | Model identifier |
| `prompt_version` | `text` | Versioned prompt contract |
| `generated_at` | `timestamptz` | Generation time |
| `approved_at` | `timestamptz` | Nullable approval time |
| `updated_at` | `timestamptz` | Edit or status change time |

Each bullet object contains:

```json
{
  "id": "stable-bullet-id",
  "text": "Compared three validation strategies and documented leakage controls.",
  "source_refs": ["metric:validation_accuracy", "quest:success_metric:1"]
}
```

Browser edits may change `text`, delete bullets, and change order, but may not add or edit `source_refs`. Edited text is revalidated before approval.

### `published_artifacts`

Add:

- `key_achievements text[] not null default '{}'`;
- verification display fields copied from the current non-stale existence check: provider, resource type, verified time, stale-after time, and the explicit label `link_existence_verified`.

The existing publication RPC copies only an approved, non-outdated achievement draft. It copies a verification badge only when `status = 'verified'` and `stale_after > now()`. Private drafts, source references, raw metadata, errors, prompts, and model telemetry never enter the public projection.

Projection synchronization is explicit:

- approving achievements updates `key_achievements` on an already-published snapshot in the same ownership-checking transaction;
- editing, regenerating, or marking a draft outdated clears `key_achievements` from an already-published snapshot until reapproval;
- a successful current link check updates the minimal verification fields on an already-published snapshot;
- an unavailable, unsupported, error, or stale result clears the public verification fields without removing the artifact;
- anonymous rendering also compares `verification_stale_after` with the current time, so a badge disappears after 30 days even when no new write occurs.

## Authorization and RLS

- Both new tables have RLS enabled.
- Owners may select only rows whose `user_id = auth.uid()`.
- Browser clients cannot directly insert or update verification snapshots.
- Verification writes occur through the authenticated server route after artifact ownership lookup.
- Browser clients cannot directly insert AI output or mark drafts approved with arbitrary source references.
- Generation writes occur through the authenticated server route; editing and approval use ownership-checking RPCs.
- No RPC accepts `user_id`.
- A foreign or nonexistent artifact ID returns the same 404 response.
- Anonymous visitors can read only the existing public projection.

## Link verification

### Supported URL shapes

GitHub:

- `https://github.com/{owner}/{repo}`
- `https://github.com/{owner}/{repo}/commit/{sha}`

Kaggle:

- `https://www.kaggle.com/code/{owner}/{notebook}`
- `https://www.kaggle.com/competitions/{competition}`

Query parameters and fragments are discarded during normalization. Repository `.git` suffixes are removed. Owner, repository, slug, and SHA segments have explicit character and length bounds.

Kaggle submissions, profile pages, datasets, models, private notebooks, and login-gated pages return `unsupported` in this phase.

### SSRF and request boundary

- Never send a request to the user-supplied URL.
- Parse the URL locally and require exact lowercase host matches after URL normalization.
- Reject user info, non-HTTPS schemes, custom ports, IP literals, localhost, Unicode lookalike hosts, extra subdomains, and malformed paths.
- Construct requests only from fixed GitHub and Kaggle adapter base URLs.
- Disable or reject unexpected redirects.
- Apply a short timeout, bounded response size, and provider-specific JSON/schema validation.
- Return stable application errors without forwarding upstream bodies.

### GitHub adapter

Use official public REST endpoints for repository and commit metadata. A server-side GitHub token is optional for rate-limit capacity but must never be exposed to the browser or persisted. A 200 response with valid schema becomes `verified`; 404 becomes `unavailable`; rate limiting, timeout, and upstream 5xx become retryable `error` states.

Git commit signature verification is metadata about the commit object. It must not be presented as proof that the MLevelUp learner owns the account.

### Kaggle adapter

Use a fixed Kaggle adapter behind an interface so its official API/CLI-backed transport can change without affecting application logic. Only public notebook and competition metadata are accepted. If public metadata cannot be retrieved without credentials or a stable supported endpoint, return `unsupported` rather than scrape arbitrary HTML or ask the user for credentials.

### Staleness

Successful checks expire after 30 days. Public pages render the verification badge only while current. Management shows `Needs recheck` after expiry. Expiry does not remove the artifact, achievements, or link.

## AI achievement generation

### Allowed source facts

The generator receives a list of short, typed facts with stable references:

- artifact type, title, MLevelUp quality score, and skill tags;
- quest title, objective, execution steps, and success criteria;
- submitted metric evidence names and values;
- current allowlisted GitHub or Kaggle verification metadata;
- the fact that a link existed and the verification date.

It does not receive email, access tokens, raw self-reflection, reviewer notes, feedback prose, penalty/recovery state, entire submission rows, or private external content.

### Structured output

The model returns exactly three to five objects containing `text` and `source_refs`. Each bullet is concise resume language with a maximum of 160 characters. The prompt forbids ownership claims and instructs the model to describe actions and evidence, not invent impact.

### Deterministic grounding validator

The server rejects the whole generation before persistence when:

- bullet count is outside three to five;
- a bullet is empty or exceeds 160 characters;
- a source reference is absent from the supplied fact set;
- a bullet has no source reference;
- a number, percentage, duration, rank, or count does not occur in its referenced facts;
- prohibited ownership or unsupported ranking language appears;
- bullets are duplicates after normalization;
- the structured output schema is invalid.

Prohibited unsupported claims include `owned`, `authored by`, `top X%`, `won`, `production users`, business revenue, and performance improvement unless the exact claim is present in an allowed fact.

Unlike training feedback, achievement generation has no deterministic prose fallback. OpenAI failure leaves the previous draft unchanged and returns a retryable error.

### Editing, approval, and outdated drafts

- Generation creates or replaces a private `draft` only after explicit overwrite confirmation.
- Learners may edit text, delete bullets, and reorder them while retaining immutable source references.
- Approval reruns the deterministic validator against the current source facts.
- If the source fingerprint changes, an approved or draft record becomes `outdated` and is not copied during publication until reapproved.
- Hiding or unpublishing an artifact preserves its private draft but removes achievements from anonymous display with the artifact snapshot.

## User interface

### Authenticated `/portfolio`

Each artifact card gains two independent panels.

Evidence link panel:

- provider and detected resource type;
- `Verify Link` and `Retry` actions;
- `Verified`, `Unavailable`, `Unsupported`, `Error`, or `Needs recheck` state;
- checked time and a permanent statement: `Public link existence verified; ownership not verified`.

Key achievements panel:

- `Generate achievements` action;
- private draft editor with three to five ordered bullets;
- remove and move-up/move-down actions;
- `Regenerate` with overwrite confirmation;
- source-aware validation errors;
- `Approve for portfolio` action;
- `Draft`, `Approved`, or `Outdated draft` state.

The two panels do not block existing publish, unpublish, reorder, feature, or hide controls.

### Anonymous `/p/[slug]`

An artifact with approved achievements renders a separate `Key achievements` list below its public summary. An artifact without approved achievements renders no empty section.

A current successful existence check renders a provider-specific badge, verification date, and the wording `Link verified; ownership not verified`. Failed, unsupported, unavailable, or stale checks render no verification badge.

## API contracts

### `POST /api/portfolio/verify-link`

Authenticated input:

```json
{
  "artifactId": "uuid"
}
```

The server obtains the URL from the owned canonical artifact. The browser cannot replace it. Success returns the sanitized verification view. Stable failures distinguish unsupported format, unavailable resource, retryable provider error, and authentication failure.

### `POST /api/portfolio/generate-achievements`

Authenticated input:

```json
{
  "artifactId": "uuid",
  "replaceExistingDraft": false
}
```

The server builds all source facts. The browser cannot provide facts, metrics, external metadata, prompt text, model, or user ID. A successful response returns the private validated draft.

### Draft editing and approval RPCs

Editing accepts artifact ID, the ordered bullet IDs, and edited text. Approval accepts only artifact ID. Both derive ownership from `auth.uid()`, preserve immutable source references, and rerun validation/consistency checks.

## Error behavior

| Condition | Result |
| --- | --- |
| Signed-out request | 401 |
| Foreign or missing artifact | Non-disclosing 404 |
| Artifact has no URL | `unsupported` |
| Unsupported host or path | `unsupported`; no network request |
| Public resource returns 404 | `unavailable` |
| Provider rate limit, timeout, or 5xx | Retryable `error` |
| Unexpected redirect | `error`; redirect not followed |
| OpenAI unavailable or invalid | Previous draft unchanged; retryable error |
| Ungrounded number or source reference | Entire generation rejected |
| Draft source fingerprint changed | `outdated`; approval/public copy blocked |
| Verification older than 30 days | `stale`; public badge hidden |

## Testing strategy

### Pure domain tests

- Exact supported GitHub and Kaggle URL parsing and normalization.
- Rejection of HTTP, user info, ports, IPs, localhost, lookalike domains, extra subdomains, malformed paths, fragments, and oversized segments.
- Provider response mapping for verified, unavailable, unsupported, rate-limited, timeout, and malformed response states.
- Source-fingerprint stability and change detection.
- Achievement schema, bullet count, length, duplicate, immutable source-reference, prohibited-claim, and ungrounded-number validation.

### Repository and API tests

- Authentication and non-disclosing ownership lookup.
- The canonical artifact URL is used instead of browser input.
- Verifiers request only constructed allowlisted endpoints.
- Verification upserts one current snapshot.
- Generation context contains only allowlisted facts.
- Invalid model output never overwrites a previous draft.
- Editing preserves source references.
- Approval and publication reject outdated drafts.
- RLS prevents cross-user reads and direct browser writes.

### Component tests

- Verify, retry, loading, result, and stale states.
- Manual generation, overwrite confirmation, edit, delete, reorder, approve, and outdated states.
- Verification copy never implies ownership.
- Existing artifact publication remains usable when verification or AI fails.
- Public achievements render only when approved.
- Public badges render only when verified and current.

### Joint production smoke test

After deployment, the learner and implementer run:

1. Valid GitHub repository -> `Verified` with correct repository metadata.
2. Valid GitHub commit -> `Verified` with exact SHA and signature metadata.
3. Missing repository and commit -> `Unavailable`.
4. Unsupported host, redirect, localhost, IP, port, and malformed path -> `Unsupported` with no arbitrary request.
5. Valid public Kaggle notebook -> `Verified` when the stable adapter can retrieve official metadata.
6. Valid Kaggle competition -> `Verified`.
7. Login-gated or unsupported Kaggle resource -> `Unsupported` or `Unavailable`, never a false verified state.
8. Generate -> three to five source-grounded bullets.
9. Inject a model response containing an absent number -> rejected with no saved overwrite.
10. Edit and approve -> public artifact shows Key achievements.
11. Leave a draft unapproved -> public artifact shows no bullets.
12. Change a source fact -> draft becomes outdated and public copy is blocked until reapproval.
13. Hide or unpublish artifact -> achievements disappear publicly while private draft remains.
14. Expire verification -> badge disappears and management shows `Needs recheck`.
15. Anonymous response scan -> no private draft, source refs, prompts, reflection, reviewer notes, email, or secrets.

Automated gates are ESLint, TypeScript, Vitest, production build, and focused desktop/mobile Playwright flows. On resource-constrained hardware, Vitest runs with one worker and the user may execute the final Playwright production flows jointly after deployment.

## Acceptance criteria

1. A learner can manually verify a supported public GitHub or Kaggle artifact link.
2. Verification never claims or implies account ownership.
3. Unsupported or dangerous URLs cause no arbitrary network request.
4. Verification state is private except for the minimal current public badge projection.
5. A learner can manually generate three to five grounded resume bullets.
6. Every generated bullet retains valid immutable source references.
7. Unsupported numbers and claims are rejected before persistence.
8. A learner can edit, reorder, delete, and approve a private draft.
9. Only approved and current achievements enter the public projection.
10. Source changes mark the draft outdated and block stale public copying.
11. External or AI failure never changes training or artifact authority state.
12. Public HTML and network responses contain no private generation or training fields.
13. All automated gates and the agreed joint smoke tests pass before release completion is declared.

## Delivery sequence

1. Phase 5.4B1: tables, RLS, URL parser, SSRF boundary, and verification contracts.
2. Phase 5.4B2: GitHub repository and commit adapter.
3. Phase 5.4B3: Kaggle notebook and competition adapter.
4. Phase 5.4A1: allowlisted fact builder, prompt, structured output, and grounding validator.
5. Phase 5.4A2: draft editing, approval, source fingerprints, and outdated state.
6. Phase 5.4A3: authenticated controls and anonymous public presentation.
7. Full automated verification, deployment, and joint production smoke testing.

## Residual risks

- Kaggle public metadata access is less uniform than GitHub. The adapter must prefer a truthful unsupported result over brittle scraping or credential collection.
- Existence checks can become stale between checks; the 30-day expiry limits but does not eliminate this gap.
- User-edited bullet wording can still be promotional. Immutable source references and approval-time validation reduce unsupported factual claims but do not create third-party certification.
- Public GitHub API rate limits may require a server-side token. It remains optional, server-only, and independently rotatable.
- A verified public link can later change content at the same URL. The stored metadata is a timestamped snapshot, not a permanent attestation.

## Official integration references

- GitHub REST repository endpoints: https://docs.github.com/en/rest/repos/repos
- GitHub REST commit endpoints: https://docs.github.com/en/rest/commits/commits
- Official Kaggle CLI/API project: https://github.com/Kaggle/kaggle-cli
