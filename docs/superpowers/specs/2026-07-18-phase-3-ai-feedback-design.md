# MLevelUp Phase 3 AI Feedback and Task Adjustment Design

## Goal

Replace Phase 2 mock feedback with server-side OpenAI analysis while keeping mission completion, XP, skill growth, deadlines, penalties, recovery, and reset decisions deterministic and auditable.

## Product outcome

After a learner submits evidence, the product will:

1. Validate required evidence with the existing deterministic evaluator.
2. Ask the Learning Strategist and Adjuster for bounded, structured proposals.
3. Ask the Coordinator to synthesize personalized feedback from those proposals.
4. Validate and clamp every AI recommendation before it can affect persisted state.
5. Persist feedback, agent run diagnostics, and an explainable next-mission recommendation.
6. Fall back to deterministic feedback when OpenAI is unavailable or returns invalid output.

The Resource Collector remains mock/manual in Phase 3. Live discovery and scheduled ingestion remain Phase 4.

## Architecture choice

Phase 3 will use the OpenAI Responses API from server-only Next.js modules with Zod-validated structured outputs. It will not introduce the OpenAI Agents SDK yet. The three Phase 3 agents are explicit application modules with separate prompts and schemas, but share one small OpenAI gateway.

This preserves real responsibility boundaries without introducing handoff/session infrastructure before the workflow needs it.

### Runtime flow

```text
Authenticated browser submission
          |
          v
Existing TrainingRepository submission command
          |
          v
Deterministic evidence evaluation
          |
          +--------------------------+
          |                          |
          v                          v
Learning Strategist             Adjuster
structured proposal             structured proposal
          |                          |
          +-------------+------------+
                        v
                   Coordinator
                 structured feedback
                        |
                        v
              Deterministic policy gate
                        |
                        v
          Feedback + agent_runs + state update
```

## Server boundary and authentication

- `OPENAI_API_KEY` is server-only and never uses the `NEXT_PUBLIC_` prefix.
- The browser never calls OpenAI directly.
- A Next.js server endpoint accepts the existing bounded `SubmitQuestInput` payload: assignment ID, idempotency key, evidence records, and reflection. It never accepts progress, rewards, evaluation results, or a full training-state payload.
- The browser sends the current Supabase access token as a bearer token. The endpoint validates it with Supabase `getUser(token)` and never trusts a browser-provided user ID.
- The server creates a Supabase client bound to that bearer token so existing RLS remains active, then loads only records owned by that user.
- The endpoint reconstructs a compact AI context from the quest, assignment, submission, deterministic evaluation, recent outcomes, current skills, training status, and eligible catalog missions.
- Request bodies, reflection text, evidence text, and history counts have explicit size limits.
- Each run uses a timeout, a bounded number of turns/calls, and an idempotency key based on submission revision.
- The endpoint never accepts XP, skill deltas, completion status, penalty status, or database row ownership from the browser.

## Agent contracts

### Learning Strategist

Purpose: recommend the next useful learning action using direct practice, deliberate practice, rapid feedback, weakness targeting, and portfolio output.

Input:

- target role and fixed daily capacity
- seven skill scores
- current mainline checkpoint
- current daily and penalty obligations
- latest deterministic evaluation
- recent completion and revision history
- eligible quest catalog entries
- resources already marked available

Structured output:

- `recommendedQuestId`: an existing eligible catalog ID or `null`
- `checkpointFocus`: one concrete focus statement
- `expectedEvidence`: one to three evidence expectations
- `successMeasures`: one to three measurable outcomes
- `reasoning`: short learner-facing explanation
- `portfolioOutcome`: expected artifact type or `null`
- `confidence`: number from 0 to 1

The agent cannot create a new quest, change a deadline, or choose an unavailable resource.

### Adjuster

Purpose: recommend how hard and how granular the next work should be.

Input:

- deterministic quality score and hard failures
- recent completion, revision, expiration, and penalty history
- consecutive failure days and recovery state
- seven skill scores and long-term low-skill signals
- current mission difficulty and checkpoint size

Structured output:

- `difficultyAction`: `decrease`, `maintain`, or `increase`
- `recommendedDifficulty`: integer 1 through 5
- `granularityAction`: `split`, `maintain`, or `combine`
- `targetSkills`: up to two skill keys
- `reasoning`: short explanation
- `riskFlags`: bounded enum list
- `confidence`: number from 0 to 1

The policy gate rejects increases during recovery, difficulty jumps greater than one level, unrelated skill targets, and any suggestion that conflicts with open penalty debt.

### Coordinator

Purpose: synthesize final feedback without becoming the source of truth for rewards or state transitions.

Input:

- deterministic evaluation and score breakdown
- Learning Strategist proposal
- Adjuster proposal
- learner reflection and compact evidence summary
- applicable deterministic limits

Structured output:

- `summary`
- `strengths`: one to three items
- `improvements`: one to three items
- `nextActions`: one to three concrete actions
- `suggestedQualityScore`: integer 0 through 100
- `suggestedSkillWeights`: seven normalized non-negative weights
- `explanation`: why the recommendation was made
- `confidence`: number from 0 to 1

The Coordinator cannot output XP, assignment status, deadline changes, penalty removal, recovery extension, or reset decisions.

## Deterministic policy gate

The policy gate is a pure domain function and remains the only component allowed to turn AI proposals into persisted reward inputs.

### Completion status

- Missing, duplicate, mismatched, or invalid required evidence always results in `needs_revision`.
- Reflection below the quest minimum always results in `needs_revision`.
- AI cannot override a hard failure.
- A structurally valid submission uses the existing deterministic completion transition.

### Quality score

- The existing deterministic score is the anchor.
- With hard failures, the final quality score remains capped at 59.
- Without hard failures, the Coordinator suggestion is clamped to a bounded interval around the deterministic score.
- Initial Phase 3 bound: `deterministic score - 15` through `deterministic score + 5`, clamped to 0 through 100.
- AI confidence below 0.6 causes the deterministic score to be used unchanged.

The asymmetric range allows substantive critique to lower an otherwise mechanically complete submission while preventing unsupported score inflation.

### XP

AI never produces XP. Existing reward logic calculates:

```text
base XP x quality multiplier x streak multiplier x artifact multiplier
```

Penalty missions continue to award zero base XP. Existing caps and qualification rules remain unchanged.

### Skill growth

- The quest's declared `skillWeights` are the baseline.
- Coordinator weights may redistribute at most 20 percent of the allocation.
- A skill with zero quest weight cannot receive AI-added weight.
- The final weights are normalized before the existing reward calculation.
- Existing per-submission score-delta limits remain authoritative.

### Deadlines, penalties, and recovery

- Deadline comparison remains clock-based.
- Penalties remain derived only from expired mainline or daily obligations.
- AI cannot cancel penalties or modify `recoveryDeadline`.
- During recovery, only open penalty debt can be recommended.
- The existing 72-hour reset behavior remains unchanged.

## Persistence changes

Add a Phase 3 migration that extends `agent_runs` with:

- `submission_id`
- `model`
- `prompt_version`
- `latency_ms`
- `input_tokens`
- `output_tokens`
- `error_code`
- `fallback_used`
- `trace_id`

Extend `feedback` with:

- `source`: `deterministic`, `ai`, or `ai_fallback`
- `model`
- `prompt_version`
- `ai_confidence`
- `adjustment_explanation`
- `recommended_quest_id`

All rows remain user-owned under RLS. Raw prompt text is not stored. `agent_runs.input` stores a redacted structured summary and `agent_runs.output` stores schema-validated output or a sanitized failure description.

The migration also makes `agent_runs.user_id` non-null for new Phase 3 runs and replaces the Phase 2 policy that allowed `user_id is null` with a strict `auth.uid() = user_id` policy. Catalog-level mock status is not stored as a user agent run.

## Application boundaries

New modules are grouped by responsibility:

- `src/ai/openai-gateway.ts`: one server-only Responses API adapter
- `src/ai/contracts.ts`: Zod schemas and inferred types
- `src/ai/prompts/`: versioned instructions for the three agents
- `src/ai/learning-strategist.ts`: one structured specialist call
- `src/ai/adjuster.ts`: one structured specialist call
- `src/ai/coordinator.ts`: synthesis call
- `src/ai/run-feedback-workflow.ts`: orchestration, timeout, fallback, and diagnostics
- `src/domain/training/ai-policy.ts`: pure deterministic clamp and authorization rules
- `src/app/api/training/submit/route.ts`: authenticated submission, evaluation, and persistence boundary

The existing repository contract remains the UI boundary. In Supabase mode, `submitQuest` delegates to the authenticated server endpoint instead of calculating rewards in the browser. The endpoint constructs a server-side Supabase repository bound to the user's bearer token, runs deterministic evaluation, optionally enriches it with the AI workflow, applies the policy gate, and persists the final `SubmissionOutcome`. Demo mode remains local and deterministic. UI components consume the same feedback and agent status view models with additional provenance fields.

## Failure behavior

- Missing API configuration: deterministic feedback, `fallback_used = true`, no user-visible crash.
- Authentication failure: HTTP 401, no model call.
- Unknown or foreign submission: HTTP 404, no model call.
- Timeout or rate limit: one bounded retry only when safe, then fallback.
- Invalid structured output: reject the output, log sanitized diagnostics, then fallback.
- Specialist failure: Coordinator is not called with fabricated specialist output; deterministic fallback is used.
- Persistence failure after a successful model call: return a retryable error and reuse the submission workflow idempotency key.
- Duplicate request: return the previously persisted result for the same idempotency key and prompt version.

## User interface

Phase 3 reuses the existing dashboard and agent status board.

Add:

- feedback provenance: `AI`, `Deterministic fallback`, or `Demo`
- generation state and retry action
- adjustment explanation: why the next mission became harder, easier, or more granular
- confidence display only when it is useful and not misleading
- agent run state for Learning Strategist, Adjuster, and Coordinator

Do not add a chat interface. Phase 3 is an evaluation and planning workflow, not a general assistant.

## Model and cost policy

- Model ID is configured with `OPENAI_MODEL`.
- Initial recommended default is the balanced current model tier, not the most expensive model for every call.
- All prompts request compact outputs and include only bounded recent history.
- Specialist calls may execute in parallel.
- Coordinator runs only after both specialist results validate.
- Token usage is persisted for cost visibility.
- Tests never call the live OpenAI API.

## Testing strategy

### Pure domain tests

- AI cannot override missing evidence.
- Hard failures cap scores at 59.
- Low-confidence AI falls back to deterministic score.
- Score suggestions are clamped to the approved interval.
- Skill redistribution cannot introduce unrelated skills or exceed 20 percent.
- Recovery blocks difficulty increases and non-penalty recommendations.
- XP remains calculated only by the reward engine.

### Contract and prompt tests

- Valid and invalid output fixtures for all three schemas.
- Prompts include role boundaries and exclude secrets.
- Catalog recommendation IDs must resolve to eligible quests.
- Prompt versions are explicit and stable.

### Server and application tests

- Session authentication and ownership checks.
- No OpenAI call for unauthorized or foreign submissions.
- Successful three-agent workflow.
- Timeout, rate-limit, invalid JSON, and missing-key fallback.
- Idempotent repeated request.
- Sanitized `agent_runs` persistence.

### Integration and browser tests

- Submission produces AI feedback and adjustment explanation.
- Fallback feedback remains usable.
- Agent statuses progress from running to completed or degraded.
- No API key or raw prompt appears in browser output or client bundles.
- Existing onboarding, mission, penalty, recovery, reset, and responsive flows remain green.

### Evaluation fixtures

Maintain a small deterministic evaluation set covering:

- strong reproducible baseline
- complete but shallow submission
- missing metric
- invalid GitHub commit link
- data leakage in the described validation strategy
- repeated failure requiring smaller checkpoints
- strong performance supporting one-level difficulty increase
- recovery state with open penalty debt

The evaluation set asserts schema validity, policy compliance, and required feedback themes. It does not assert exact prose.

## Explicit exclusions

- Live resource web collection or nightly scheduling
- Autonomous creation of arbitrary quests
- External GitHub or Kaggle evidence verification
- Chat UI or long-lived conversational memory
- AI-controlled XP, deadlines, penalties, recovery, or reset
- Leaderboards and public portfolio export
- Background job infrastructure beyond the synchronous Phase 3 workflow

## Acceptance criteria

1. A verified user submission can produce schema-valid personalized AI feedback.
2. Learning Strategist and Adjuster produce independently testable structured proposals.
3. Coordinator feedback cannot bypass deterministic hard failures or state rules.
4. XP, skill updates, penalties, recovery, and reset remain deterministic and regression-tested.
5. AI failure always produces usable deterministic fallback feedback.
6. Agent runs record model, prompt version, latency, token usage, status, and fallback provenance.
7. API keys remain server-only and absent from browser bundles and committed files.
8. Repeated workflow requests are idempotent.
9. Existing unit and browser suites remain green.
10. Phase 3 does not depend on Phase 4 resource collection.
