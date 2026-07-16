# MLevelUp Phase 2 Design

## Goal

Replace Phase 1 browser-local mock persistence with Supabase Email magic-link authentication and user-scoped Postgres data, while retaining the existing Next.js interface and deterministic Demo evaluation.

## Scope

- Next.js remains the entire application UI.
- `@supabase/supabase-js` is used directly in client-side repositories.
- Magic-link authentication uses a dedicated `/auth/callback` page and returns users to onboarding or the dashboard.
- Browser reads and writes use the Supabase anon key plus RLS; no Next API routes, service-role key, database trigger, scheduler, or AI integration is added.
- Existing deterministic evaluation remains a Phase 2 Demo rule. A completed submission persists its feedback, XP, skill deltas, and optional artifact. Verification stays explicitly `manual`/`pending` in presentation where it is not proven externally.
- Demo reset becomes a user-scoped reset of Phase 2 training records. It never touches another user.

## Data model

Global catalog tables are `quests` and `resources`. User-scoped tables are `profiles`, `user_progress`, `skill_stats`, `quest_assignments`, `submissions`, `feedback`, `portfolio_artifacts`, and `agent_runs`.

Evidence is kept in `submissions.evidence` JSONB and quest criteria, evidence requirements, skill weights, and tags remain compact JSONB arrays/objects. This avoids extra join tables in Phase 2. The archive is derived from submissions and artifacts rather than adding an activity table; XP totals live on `user_progress` rather than an XP event ledger.

Every user-scoped table has a non-null `user_id uuid` referencing `auth.users`. RLS permits authenticated users to select, insert, update, and delete only rows whose `user_id = auth.uid()`. Global catalog reads are allowed to authenticated users; catalog writes are not available from the browser.

## Client flow

1. The unauthenticated root displays the magic-link entry view.
2. The user requests a magic link; Supabase redirects back to `/auth/callback`.
3. The callback exchanges the URL code for a session and forwards the user to `/`.
4. A `SupabaseTrainingRepository` obtains the session, reads the profile/progress/catalog tables, and returns the existing `TrainingState` shape.
5. Onboarding creates or updates the profile, progress, seven skills, and initial assignments.
6. Quest start, profile updates, submission persistence, feedback, progress, skills, and artifacts use narrow repository methods. Requests are retriable; the UI continues to expose command errors.

## Explicit exclusions

No scheduled resource collection, real agent runs, external evidence verification, public sharing, leaderboard, server-side API layer, or Phase 3 AI feedback/adjustment is included.

## Acceptance

1. A user can request and complete an Email magic-link sign-in flow when Supabase credentials are configured.
2. RLS migration covers every user-owned table and catalog reads.
3. Existing routes render from the Supabase repository after authentication.
4. Onboarding, quest start, submission, XP/skill updates, feedback, artifact creation, and reset persist under the signed-in user only.
5. Missing environment configuration produces a useful local development state rather than exposing secrets or crashing the app.
6. Existing mock repository tests remain green; Supabase mapping and auth tests cover the new adapter boundaries.
