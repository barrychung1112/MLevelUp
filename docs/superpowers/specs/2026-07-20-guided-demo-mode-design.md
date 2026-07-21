# Guided Demo Mode Design

**Date:** 2026-07-20  
**Status:** Approved for implementation planning  
**Scope:** Deterministic 90-second guided demo plus concurrent penalty and daily missions

## Goal

Give hackathon judges a convincing end-to-end MLevelUp experience with no login, configuration, cookies, external APIs, or network-service dependency. The demo must guide rather than invite exploration and must produce the same result every time.

## Entry points

The signed-out home page exposes three distinct actions:

- `Watch the challenge` opens `/demo?guided=1&restart=1`.
- `Enter live demo` opens `/demo?restart=1`.
- `Sign in` reveals the existing email magic-link terminal.

When `NEXT_PUBLIC_MLEVELUP_DEMO_MODE=1`, the root page is demo-first, private Demo routes bypass authentication, and no Supabase client is required. A separate Vercel project may point at the same repository with this build variable and a dedicated demo domain.

## Product-rule correction: penalty and daily missions run concurrently

An open penalty assignment no longer blocks today's daily assignment.

- Missing yesterday's obligation creates a separate penalty assignment.
- Penalty work is outside the planned daily training allocation and awards no XP.
- Today's daily assignment is still generated or selected normally.
- The Adjuster and AI generation context retain the open penalty and prior outcome signals.
- The adjusted daily mission may target yesterday's observed weakness but must not duplicate the penalty deliverable.
- Penalty and daily assignments require separate evidence and verification. One submission cannot complete both.
- Dashboard presentation must distinguish penalty debt, today's daily mission, and mainline work.

The existing `penalty_priority` early return is removed from both catalog and AI daily generation. Duplicate-per-user/date idempotency remains unchanged.

## Guided narrative

`/demo` is a single-page six-step experience without the standard application navigation. Its header contains only the product label, progress (`Step X of 6`), `Restart guided demo`, and `Exit demo`. Each step has one primary action.

### Step 1: Challenger profile

The fixed learner Alex wants to become a machine learning engineer and is currently Level 3. Yesterday Alex completed two of four checkpoints before the deadline. The second validation run and reproducible metric comparison were missing, the assignment expired, and no XP was awarded.

The copy must not claim the system made the task too broad. The training system correctly interprets incomplete work and triggers the planned consequence.

Primary action: `View today's training orders`.

### Step 2: Today's training orders

Two separate assignments are visible:

1. `Recover missing validation evidence`, a 30-minute penalty mission that reruns the missing validation seed and stores a reproducible experiment log. It awards zero XP and is marked `Recovered before demo` with its own fixed evidence.
2. `Measure validation stability`, a 60-minute adjusted daily mission that uses two validation scores, calculates their absolute difference, and produces `validation-stability.md`.

The explanation states that the incomplete mission triggered the additional penalty assignment and that today's daily mission was adjusted using the missing evidence and observed skill state.

Primary action: `Accept daily mission`.

### Step 3: Prefilled evidence

The daily mission form contains a fixed GitHub commit URL, `validation-stability.md`, two seed scores, their absolute difference, and a self-reflection. These values are labeled `Demo evidence fixture`. The page never requests the external URLs.

Primary action: `Submit evidence`.

### Step 4: Feedback and policy decision

The screen separates a fixed GPT-5.6-style recommendation from the deterministic policy decision. It states `Simulated AI response - No external API call` and displays evidence completeness, measurable metrics, required artifact presence, quality score 88, and `Verified`.

Primary action: `Apply verified result`.

### Step 5: Skill and XP change

The screen displays fixed before, awarded, and after XP; level progress; Evaluation and Communication changes; and one new portfolio artifact. It explicitly contrasts yesterday's zero XP with today's verified reward. Animation is brief and must respect reduced-motion preferences.

Primary action: `View public proof`.

### Step 6: Public portfolio handoff

The final screen summarizes verified artifacts, skill coverage, evidence-grounded achievements, and the recruiter-safe public URL.

Primary action: `Open public portfolio`, linking to `/p/demo-ml-engineer`.

The public page is anonymous and deterministic in Demo mode and offers `Return to guided demo` without requiring authentication.

## Demo state and fixtures

A versioned, immutable scenario fixture owns the learner, yesterday's incomplete result, completed zero-XP penalty, adjusted daily quest, prefilled evidence, simulated feedback, deterministic policy decision, reward delta, and public proof summary.

The guided state machine stores only:

- current step;
- daily mission accepted;
- evidence submitted;
- verified result applied;
- scenario version.

State is stored in `sessionStorage`, not cookies or Supabase. Invalid JSON, unknown versions, impossible transitions, or missing state reset to the initial state. Repeated actions are idempotent and cannot duplicate XP or artifacts.

- `/demo?guided=1&restart=1`: reset, enable paced guidance, and begin at Step 1.
- `/demo?restart=1`: reset and begin without guidance overlays.
- `/demo`: restore valid state in the current tab.
- `Restart guided demo`: clear repository and guided session state, then return to Step 1.

The 90-second guidance uses concise timed hints and focus cues. It never auto-clicks, navigates without consent, or depends on timers for correctness.

## Dependency boundary

The Demo path must not:

- initialize or query Supabase;
- call OpenAI or application API routes;
- verify GitHub or Kaggle links;
- read server secrets;
- require authentication, cookies, or preexisting local storage;
- fetch displayed evidence URLs.

All outcomes come from the checked-in scenario fixture and existing deterministic domain/repository logic. The public portfolio reader returns the existing fixture for `demo-ml-engineer` without a database query.

## Error handling

- Corrupt session state resets silently to Step 1.
- An unavailable storage API falls back to in-memory state for the current render.
- Double-clicks and repeated transitions are idempotent.
- Direct navigation to `/demo` produces a valid initial or restored state.
- Demo mode without Supabase or OpenAI configuration remains fully functional.
- The standard signed-out experience remains protected outside explicitly public and Demo routes.

## Responsive and accessible behavior

- The primary narrative remains linear at mobile and desktop widths.
- Cards stack on narrow screens and never introduce horizontal page overflow.
- The primary action remains visible after each step's essential content.
- Focus moves to each new step heading.
- Progress and decision states use text in addition to color.
- Controls are keyboard reachable with visible focus.
- Motion is disabled when `prefers-reduced-motion` is active.

## Acceptance tests

### Positive

- A fresh anonymous session opens `/demo?guided=1&restart=1` at Step 1.
- The fixture shows yesterday at two of four checkpoints, expired, with zero XP.
- A recovered zero-XP penalty and today's adjusted daily mission appear together.
- Prefilled evidence submits without a network call.
- The simulated feedback and deterministic quality-88 verified result are distinct.
- Applying the result produces one fixed XP/skill update and one artifact.
- `/p/demo-ml-engineer` opens anonymously and links back to the demo.
- Restart always restores the same initial scenario.
- Refresh restores the current step; entering from home resets it.

### Negative

- Missing Supabase and OpenAI configuration does not affect the Demo.
- Offline browser mode does not break the flow after static assets are loaded.
- Invalid session JSON resets safely.
- Repeated submit/apply actions do not duplicate rewards or artifacts.
- A direct URL paste does not show an authentication prompt over the Demo.
- An open penalty no longer blocks daily catalog or AI assignment generation.
- Normal signed-out private routes remain protected.

## Verification

Implementation uses test-driven development for concurrent mission rules, the fixture and state machine, storage recovery, AuthGate behavior, home entries, guided components, reset behavior, and the public portfolio fixture. Completion also requires ESLint, TypeScript, the full Vitest suite, a production build, and manual anonymous desktop/mobile browser walkthroughs. The browser walkthrough must use no account, cookies, API keys, or successful external service responses.

## Out of scope

- A recorded or externally hosted video.
- Multiple Demo story branches.
- Live OpenAI, Supabase, GitHub, or Kaggle calls inside `/demo`.
- Editing fixture evidence during the guided flow.
- Completing the penalty interactively during the 90-second path.
- A separate fork of the application code for Demo deployment.
