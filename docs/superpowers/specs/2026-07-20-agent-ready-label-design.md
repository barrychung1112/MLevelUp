# Agent Ready Label Design

## Goal

Replace the `Demo` provenance badge shown for placeholder Agent Status records with `Ready`, so an agent that has not run yet is presented as available rather than as a demo implementation.

## Scope

- Change only the Agent Status presentation mapping for `isMock` placeholder records.
- Preserve the underlying `idle` status and all agent execution, persistence, and trigger behavior.
- Preserve `Demo` wording for Demo Mode, demo submissions, deterministic demo feedback, and other non-agent provenance.
- After a real run, the existing `AI` and `Fallback` provenance labels remain unchanged.

## Presentation contract

| Stored agent state | Displayed provenance |
| --- | --- |
| `isMock: true` placeholder | `Ready` |
| completed real AI run | `AI` |
| degraded or fallback run | `Fallback` |

## Testing

- Update the agent view-model test to require `Ready` for a placeholder agent.
- Update the Agent Status component fixture and assertion to render `Ready`.
- Keep existing Demo Mode tests unchanged to prove the change is not global.
