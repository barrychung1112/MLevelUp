# MLevelUp Phase 1 Design

## Status

Approved for implementation on 2026-07-16.

## Product outcome

Build a usable ML-engineer training dashboard, not a marketing landing page. The complete demo loop is:

1. Choose a goal, weekly availability, and training contract.
2. See today's quests in a command-center dashboard.
3. Open a quest and submit evidence plus a reflection.
4. Receive deterministic mock feedback.
5. Update XP, level, seven skill stats, battle log, and portfolio artifacts.
6. Persist the result locally so refreshes keep the state.

## Phase boundary

Phase 1 uses typed mock data and browser local storage. It does not include Supabase, authentication, real AI calls, scheduled jobs, external evidence verification, a public portfolio, or a real leaderboard.

## Technology

- Next.js App Router and TypeScript
- Tailwind CSS
- Lucide icons
- Zod for strict runtime validation
- Vitest and Testing Library
- Playwright for critical user flows and responsive checks

Application code depends on repository contracts rather than local storage directly so Phase 2 can replace the mock adapter with Supabase without rewriting the UI.

## Routes

- `/` redirects to onboarding or the dashboard based on local demo state.
- `/onboarding` collects goal, contract, and weekly time.
- `/dashboard` is the command center and primary route.
- `/quests` lists daily, weekly, and completed quests.
- `/quests/[assignmentId]` shows requirements and the evidence submission flow.
- `/resources` provides mock resource filtering.
- `/progress` shows level, XP, skill stats, and weekly review.
- `/archive` shows the chronological battle log.
- `/portfolio` shows private demo artifacts.
- `/agents` shows safe mock agent statuses.
- `/profile` edits the current goal, contract, weekly time, and demo preferences.

## Domain rules

The seven skill keys are `dataHandling`, `modeling`, `evaluation`, `engineering`, `researchSense`, `productThinking`, and `communication`.

Training contract keys are `foundation`, `standard`, and `intensive`. Contract selection changes quest capacity and presentation but does not grant an XP multiplier.

Assignments follow `assigned -> in_progress -> submitted -> reviewing -> completed`, with `needs_revision` as the deterministic validation failure state.

Phase 1 evaluation is deterministic. Missing or invalid required evidence produces `needs_revision`; valid evidence and a substantive reflection produce a fixed score band, feedback, confirmed XP, skill deltas, and a portfolio artifact when the score is at least 80.

Level is `1 + floor(totalXp / 500)`. Each quest has skill weights that sum to 1. A submission can award XP only once.

## Visual system

Use an original dark industrial command interface with `#05070D` background, `#0C1220` surface, `#111A2B` raised surface, `#243249` borders, `#F4F7FB` primary text, `#A7B0C0` secondary text, cyan command accents, lime growth, amber warnings, coral errors, and violet research accents.

The interface may use clipped corners, fine grid lines, minimal glow, status pulses, and data traces. It must not use copyrighted characters, logos, quotes, screenshots, proprietary terms, or recognizable interface motifs from existing games or anime.

Every screen has one clear primary action. Icons come from one SVG family. Motion is limited to meaningful 150-250 ms transitions and must respect `prefers-reduced-motion`.

## Responsive and accessibility requirements

- Validate at 375, 768, 1024, and 1440 CSS pixels.
- No page may have unintended horizontal overflow.
- Desktop uses a sidebar; mobile uses no more than five labeled bottom-navigation destinations.
- Touch targets are at least 44 by 44 CSS pixels.
- Forms have visible labels, inline error recovery, loading, success, and failure feedback.
- All critical actions are keyboard reachable with a visible focus state.
- Charts expose exact text values and summaries; color is never the sole indicator.
- A skip link targets the main content region.

## Phase 1 acceptance criteria

1. A new visitor completes onboarding and reaches the dashboard.
2. The root route never behaves as a marketing landing page.
3. A user can open a quest, submit valid evidence, and see assignment status, feedback, XP, skills, artifact, and battle-log entries update consistently.
4. Invalid evidence is rejected with a specific recovery message and does not award XP.
5. Refresh preserves the full demo state; reset restores the seed state.
6. Mock evaluation returns the same result for the same normalized input.
7. All routes render useful content, empty states, or recovery states.
8. Unit, component, and end-to-end tests pass; type checking, linting, and production build succeed.
9. Browser verification covers onboarding, quest submission, persistence, mobile navigation, and the four target viewport widths.
