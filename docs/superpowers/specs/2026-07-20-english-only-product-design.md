# English-Only Product Design

Date: 2026-07-20
Status: Approved for implementation planning

## Objective

Convert every system-authored, user-visible part of MLevelUp to English while preserving the existing product behavior, dark command-center visual direction, data model, and trusted server-side workflows.

This is an English-only conversion, not a multilingual localization project.

## Scope

The conversion includes:

- Authentication and Magic Link states
- The login terminal and challenger warning
- Onboarding
- Desktop, compact, and mobile navigation
- Dashboard
- Mainline and daily quests
- Quest checkpoints, measurement criteria, deadlines, penalties, and submission forms
- Resources
- Progress review and skill statistics
- Profile
- Agent status
- Training archive and battle log
- Private and public portfolio views
- Link verification and achievement-generation controls
- Form labels, validation messages, empty states, loading states, success states, and error messages
- Mock and seed content
- System-created database seed content
- AI prompts, structured user-visible output, and deterministic fallback feedback

The conversion does not include:

- Historical design documents and implementation plans
- Internal code comments that never appear in the product
- Database identifiers, enum values, API contracts, or structured-output field names
- User-authored reflections, artifact descriptions, evidence, or other personal content

User-authored content is preserved exactly as entered. The application will not silently machine-translate it.

## Chosen Approach

Use an English-only product with lightweight centralized copy, without adding an internationalization framework.

Shared strings such as navigation labels, statuses, verification messages, and common actions should be defined in focused constants or presentation helpers. Page-specific prose may remain next to the component that renders it. This reduces duplication without introducing locale routing, translation providers, or message-catalog infrastructure that the current product does not need.

## Login Terminal

The signed-out experience becomes an English minimal login terminal. Its primary statement is:

> Become anyone you want to be — the hard way.

The screen retains the existing original dark command-center aesthetic. The Email form opens a confirmation dialog before the Magic Link request is sent.

The confirmation dialog communicates that the system assigns the hardest realistically achievable challenge based on ability and time, that failure informs later assignments, and that the user is choosing a demanding path. Confirming sends the Magic Link; canceling returns to the form without a request.

All pending, success, validation, and failure states use English.

## Application Copy

Every current product route must render English system copy:

- `/dashboard`
- `/quests`
- `/quests/[assignmentId]`
- `/resources`
- `/progress`
- `/profile`
- `/agents`
- `/archive`
- portfolio management and public portfolio routes

Labels should use concise, action-oriented English. Quest instructions must remain concrete and measurable. Tone should remain intense but readable, using original concepts such as command center, training archive, challenger, mission, and battle log without copying protected characters, terminology, or visual assets.

## Training and Seed Content

Mock repositories and seed data must provide English:

- Quest titles and descriptions
- Checkpoint instructions and acceptance criteria
- Mainline and daily mission content
- Penalty missions
- Resources, summaries, and skill tags when displayed as prose
- Default feedback
- Default agent states and activity descriptions
- Portfolio artifact examples

Domain identifiers and machine values remain stable so the language conversion does not break persistence or API compatibility.

## AI Output Contract

All prompts that can produce user-visible content must explicitly require natural English for every prose field. Structured schema keys and enum values remain unchanged.

The requirement applies to:

- Learning Strategist recommendations
- Adjuster recommendations
- Coordinator feedback
- Achievement and resume-highlight generation
- Resource summaries created by the collector

Deterministic fallbacks and degraded-mode messages must also be English. Prompt versions should be incremented when prompt behavior changes so generated results remain auditable.

The application validates structure as it does today. Language instructions guide generation; deterministic application rules remain authoritative for XP, completion, penalties, and state transitions.

## Existing Database Content

Add an idempotent migration for known system-authored Chinese seed or default records. The migration must target records through stable identifiers or exact known values; it must not broadly update arbitrary user content.

Rules:

1. Translate known system quest, resource, feedback, and artifact seed rows when they can be identified safely.
2. Preserve identifiers, relationships, timestamps, scores, and state.
3. Do not translate user-authored submissions, reflections, evidence, or custom portfolio prose.
4. Records that cannot be distinguished safely from user content remain untouched and are reported as a residual risk.
5. New system-authored records must be English after deployment.

## Error Handling

All application-owned validation, network, empty, unavailable, retry, and success messages must be English. Raw provider or database errors must not be shown directly when an application-safe English message exists.

External resource titles and user-provided content may contain non-English text because they are not authored by MLevelUp. The interface surrounding them remains English.

## Testing Strategy

Update unit and integration assertions affected by copy changes. Verify:

- Login submission does not request a Magic Link before confirmation.
- Login confirmation, success, error, and retry states are English.
- Navigation and all route-level headings are English.
- Onboarding and challenger warning are English.
- Quest, resource, progress, profile, agent, archive, and portfolio components render English system copy.
- Mock and seed state contains English system content.
- AI prompts explicitly request English output.
- Fallback AI feedback is English.
- The database migration is idempotent and does not target user-authored fields broadly.

Add a focused source scan or test that rejects Han characters in user-visible production sources and system-authored seed content. Maintain an explicit allowlist for historical documentation, internal comments, tests whose purpose requires non-English input, and user-generated-content fixtures.

Run the standard verification suite:

- ESLint
- TypeScript type checking
- Vitest
- Next.js production build

Browser automation is not required unless a failure cannot be validated adequately through the existing automated suite or the user requests it.

## Acceptance Criteria

The work is accepted when:

1. Every application-owned string visible through the product is English.
2. A new account receives English onboarding, quests, resources, feedback, agent states, and portfolio examples.
3. AI prompts require English and all deterministic fallback text is English.
4. Known existing system-authored Chinese database content has a safe, idempotent English migration.
5. User-authored content is preserved without silent translation.
6. The Chinese-source guard passes for its defined production scope.
7. ESLint, type checking, Vitest, and the production build pass.
8. Existing behavior, data relationships, XP rules, penalties, verification security, and portfolio publication rules remain unchanged.

## Residual Risks

- Previously generated AI or imported external content may contain Chinese when it cannot be distinguished safely from user-authored content.
- External resource titles may remain in their source language.
- English-only prompt instructions reduce but cannot mathematically guarantee the language of third-party model output; the UI should use safe English fallback handling for invalid output.
- A string scan can detect Han characters but cannot by itself assess whether English wording is clear or natural, so route and component review remains necessary.
