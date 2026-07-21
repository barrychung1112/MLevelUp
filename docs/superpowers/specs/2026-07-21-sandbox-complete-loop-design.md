# Sandbox Complete Training Loop Design

## Goal

Allow a judge using the fake learner account to complete a real mission form, receive visible deterministic feedback and progression, and continue directly into the next mission.

## Scope

- Add a Sandbox-only action that fills every required evidence field with deterministic sample data.
- Preserve the normal validation and submission path; the sample is not an automatic pass.
- Replace the minimal completion message with a structured result showing quality, XP, strengths, improvements, next actions, and skill growth.
- Select the next active mission in penalty, daily, then mainline priority and provide a direct continuation link.
- If all active Sandbox missions are cleared, assign the hardest feasible unused catalog mission.

## Boundaries

- No OpenAI, Supabase, GitHub, Kaggle, or network request is added.
- Production users continue to receive daily missions from the protected scheduler.
- Sandbox progression remains deterministic and browser-local.
- Existing evidence validation, XP policy, and artifact rules remain authoritative.

## Acceptance Criteria

1. A judge can load sample evidence and submit it through the normal form.
2. A verified result exposes useful feedback and visible XP/skill changes.
3. `Continue to next mission` opens a real active assignment.
4. Clearing the last active Sandbox assignment produces another unused feasible catalog assignment when one exists.

