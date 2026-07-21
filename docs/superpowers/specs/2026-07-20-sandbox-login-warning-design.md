# Sandbox Login Warning Design

## Goal

Let demo visitors experience the challenger warning and a simulated sign-in before entering the preloaded sandbox account, without requiring credentials or external services.

## Flow

1. `Enter live demo` opens `/demo/sandbox?restart=1`.
2. The page presents a sandbox-specific challenger warning before creating learner data.
3. `Go back` clears the sandbox session and returns to `/`.
4. `Accept and enter sandbox` shows `Signing in as Alex Pathfinder...`, prepares the deterministic learner, accepts the challenge, and redirects to `/dashboard`.

## Boundaries

- Do not collect an email or send a Magic Link.
- Do not call Supabase, OpenAI, GitHub, Kaggle, or any other external service.
- Do not change the real authentication flow.
- Continue resetting sandbox data on every homepage entry.

## Verification

- Component tests prove that no profile is prepared before acceptance.
- Component tests cover both accept and cancel paths.
- Existing authentication and sandbox tests remain green.

