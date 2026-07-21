# Interactive Sandbox Demo Design

## Goal

Give judges two distinct anonymous experiences: a deterministic guided story and a freely explorable fake learner account.

## Entry points

- `Watch the challenge` opens `/demo?guided=1&restart=1` and retains the existing six-step guided flow.
- `Enter live demo` opens `/demo/sandbox?restart=1`, resets the fake account, and enters the full application experience.
- `Sign in` retains the real Supabase magic-link flow.

## Sandbox session

The sandbox uses a browser `sessionStorage` marker. Opening `/demo/sandbox?restart=1` clears the sandbox's local training and portfolio state, sets the marker, and redirects to the fake learner dashboard. The marker allows anonymous navigation across product routes for the current browser tab.

Repository selection checks the marker before creating repositories:

- Sandbox session: `MockTrainingRepository` and `DemoPortfolioPublicationRepository` only.
- Normal signed-in session: existing Supabase repositories.
- Build-time Demo Mode: existing environment-controlled demo behavior.

The sandbox must never send training, portfolio, evidence, or agent writes to Supabase. It must not call OpenAI, GitHub, or Kaggle APIs.

## Reset and exit behavior

- Every click on `Enter live demo` creates a fresh fake-account state.
- Refreshing or navigating within the sandbox preserves progress for that tab.
- A visible `Exit live demo` control clears the marker and returns to `/`.
- Guided demo state remains separate from sandbox state.

## UI

The fake account uses the existing full application shell and seeded learner data. A persistent Sandbox badge and Exit control make it clear that activity is simulated and will not affect a real account.

## Testing

- Prove the two home buttons have distinct destinations.
- Prove sandbox session parsing, activation, reset, and exit behavior.
- Prove AuthGate bypasses authentication only for an active sandbox.
- Prove repository factories select mock repositories during sandbox and Supabase repositories otherwise.
- Prove entering the sandbox resets seeded state and reaches the dashboard.
