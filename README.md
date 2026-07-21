# MLevelUp

Phase 5.4 adds manual GitHub link-existence verification with an explicit ownership disclaimer and source-grounded AI resume achievements that remain private until the learner edits and approves them.

MLevelUp is a gamified training system for people who want to become machine learning engineers through execution, measurable evidence, feedback, and portfolio building—not passive course consumption.

Built as an OpenAI Hackathon project, it turns long-term ML engineering growth into a demanding daily loop: accept a mission, complete concrete checkpoints, submit evidence, receive evaluation, and build a public body of work.

## Core training loop

1. The learner commits to becoming a machine learning engineer with a fixed five-hour daily training capacity.
2. The system assigns the hardest mission that is still achievable within the learner's current ability.
3. A multi-day mainline mission runs alongside an independent 24-hour daily mission.
4. Every mission defines measurable success criteria, required evidence, and supporting resources.
5. Missed obligations create penalty missions. Seven consecutive failure days trigger a reset decision or a three-day recovery window.
6. Valid evidence produces feedback, XP, seven skill-stat updates, history, and portfolio artifacts.

## Current MVP — Phase 5

- Email magic-link authentication through Supabase
- Responsive dark command-center interface
- Initial calibration mission: **The Courage to Challenge**
- Multi-day mainline, daily, penalty, and recovery mission flows
- Evidence submission for URLs, files, metrics, and written reflection
- Server-side Learning Strategist, Adjuster, and Coordinator modules
- Structured OpenAI Responses API outputs validated with Zod
- A deterministic policy gate that retains authority over completion, XP, skill growth, deadlines, penalties, recovery, and reset
- Deterministic feedback fallback when AI is unavailable or invalid
- Auditable feedback provenance and agent-run diagnostics
- Supabase persistence protected by row-level security
- Deterministic local Demo mode that does not require external services
- Resource collection from GitHub and arXiv with canonicalization, deduplication, quality scoring, and safe fallback
- Bounded URL availability checks and AI Resource Curator enrichment with deterministic fallback
- Protected Vercel Cron routes for resource collection and daily assignment generation
- Server-only Supabase catalog writes and per-user/day daily-assignment idempotency
- Resource source, quality, availability metadata, and real collector telemetry in the dashboard
- User-specific AI daily quest generation with strict evidence, duration, difficulty, safety, and duplication checks
- Automatic catalog fallback when AI generation is unavailable or rejected

See [Phase 4 operations](docs/phase-4-resource-collector-setup.md) for deployment settings and smoke tests.

## Phase 5.1–5.3 public portfolio

- Public portfolio setup and artifact controls live at `/portfolio`.
- Publication is opt-in, and only verified artifacts can be selected.
- Ownership-checking Supabase RPCs copy canonical quality, skill, type, and safe URL fields into dedicated public projection tables.
- Anonymous recruiter-facing portfolios render at `/p/{slug}` with evidence-backed skill coverage.
- Public responses exclude submissions, reflections, feedback, email, failure state, and recovery state.

See [Phase 5 public portfolio deployment](docs/phase-5-public-portfolio-setup.md) for migration, RLS, privacy, and production smoke tests. Kaggle integrations, AI case-study writing, leaderboards, badges, and export remain future work.

## 60-second guided demo

The judge experience has two anonymous paths. `/demo` is a deterministic six-step story, while `/demo/sandbox` resets and opens a fake learner account for free exploration. Neither path requires an account, API key, Supabase project, OpenAI request, GitHub request, or Kaggle request.

macOS / Linux:

```bash
npm install
NEXT_PUBLIC_MLEVELUP_DEMO_MODE=1 npm run dev
```

Windows PowerShell:

```powershell
npm install
$env:NEXT_PUBLIC_MLEVELUP_DEMO_MODE='1'; npm run dev
```

Open `http://localhost:3000/demo?restart=1`, complete the six guided actions, then open `/p/demo-ml-engineer`. To explore the full application with local simulated data, open `/demo/sandbox?restart=1`; every new entry resets the fake account, while navigation and refreshes in the same tab preserve that sandbox run. Returning from the public portfolio restores the last guided step.

For Vercel, create a separate project from this repository, set `NEXT_PUBLIC_MLEVELUP_DEMO_MODE=1`, and deploy. No other environment variable is required for the guided route or its demo portfolio.

## Seven skill dimensions

| Skill | What it measures |
| --- | --- |
| Data Handling | Cleaning, EDA, feature engineering, and data quality judgment |
| Modeling | Model selection, training, tuning, and experiment design |
| Evaluation | Metrics, validation strategy, and error analysis |
| Engineering | Python, APIs, deployment, pipelines, and MLOps |
| Research Sense | Paper reading, method comparison, and trend awareness |
| Product Thinking | Turning models into useful products under real constraints |
| Communication | Technical writing, reports, interviews, and stakeholder communication |

## Architecture

MLevelUp is a Next.js modular monolith. The browser submits a bounded payload to an authenticated server route. The server runs deterministic evidence checks, optionally requests structured recommendations from three AI modules, applies a pure policy gate, and persists one auditable result through the user's Supabase session.

```text
Next.js App Router
├── Feature UI and route composition
├── Authenticated submission API
├── Application use cases
├── Deterministic domain rules and state machines
├── Structured AI workflow and policy gate
├── MockTrainingRepository for Demo mode
└── SupabaseTrainingRepository
    ├── PostgreSQL
    ├── Row Level Security
    └── Magic-link authentication
```

### Technology

- Next.js 16, React 19, and TypeScript
- Supabase Auth and PostgreSQL
- OpenAI Responses API with Zod structured outputs
- Tailwind CSS
- Vitest, Testing Library, and Playwright

## Run locally

Requirements: Node.js 20 or later and npm.

```bash
git clone https://github.com/barrychung1112/MLevelUp.git
cd MLevelUp
npm install
```

For local evaluation without Supabase or OpenAI, create `.env.local`:

```env
NEXT_PUBLIC_MLEVELUP_DEMO_MODE=1
```

Then run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Connect Supabase and OpenAI

Copy `.env.example` to `.env.local` and supply your own values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
OPENAI_API_KEY=your-server-only-openai-key
OPENAI_MODEL=gpt-5.6-terra
OPENAI_PROMPT_VERSION=phase3-en-v1
OPENAI_RESOURCE_PROMPT_VERSION=phase4-resource-v1
OPENAI_DAILY_QUEST_PROMPT_VERSION=daily-quest-v1
```

`OPENAI_API_KEY` is optional at runtime. Without it, authenticated submissions remain usable and receive deterministic fallback feedback. Never add `NEXT_PUBLIC_` to this key and never use a Supabase secret or `service_role` key in browser variables.

Apply all migrations in chronological order. Exact instructions and safety notes are in [docs/phase-3-supabase-setup.md](docs/phase-3-supabase-setup.md) and [docs/phase-4-resource-collector-setup.md](docs/phase-4-resource-collector-setup.md).

AI daily quest deployment and smoke testing are documented in [docs/ai-daily-quest-generation-setup.md](docs/ai-daily-quest-generation-setup.md). Apply its migration before deploying code that reads private generated quests.

## Privacy and authority boundaries

- The browser sends only assignment ID, idempotency key, evidence, and reflection.
- Authentication determines the user; the request cannot choose row ownership.
- AI receives bounded mission context, summarized evidence, recent aggregate outcomes, skills, and eligible resource/quest identifiers.
- Raw access tokens, API keys, email addresses, and full database rows are excluded from AI context.
- Raw prompts are not persisted. Agent logs contain redacted summaries and sanitized failures.
- AI cannot directly award XP, mark completion, change deadlines, cancel penalties, extend recovery, or reset an account.

## Verification

```bash
npm run lint
npm run typecheck
npm run test:unit -- --maxWorkers=1
npm run build
npm run test:e2e
```

Automated tests use fake model transports and never call the live OpenAI API.

## Product language

MLevelUp is an English-only product. Application UI, system-authored missions,
fallback feedback, resource summaries, and AI-generated prose use English.
User-authored evidence and external resource titles are preserved exactly as
submitted and are never silently translated.

## Repository structure

```text
src/app/                  Next.js pages and authenticated API route
src/ai/                   AI contracts, prompts, gateway, and orchestration
src/domain/training/      Mission, reward, policy, deadline, and recovery rules
src/application/training/ Submission and training use cases
src/supabase-training/    Supabase persistence and browser submission client
src/mocks/training/       Deterministic Demo repository and seed data
supabase/migrations/      Database schema and migration history
e2e/                      Playwright user-flow tests
docs/superpowers/         Approved designs and implementation plans
```

## Roadmap

- Phase 4: completed live resource collection, AI curation, URL verification, scheduled ingestion, and Agent telemetry
- Phase 5: Kaggle/hackathon integrations, richer anti-cheat signals, leaderboards, badges, and public portfolio export
- Production deployment: [m-level-up.vercel.app](https://m-level-up.vercel.app/)

## Responsible design

- Mission completion requires evidence rather than a self-reported checkbox.
- Reset and recovery rules are explicit before training begins.
- Model failure never blocks an otherwise valid submission.
- The visual language is original and does not reuse copyrighted characters, logos, dialogue, or game assets.

## Project stage

Active OpenAI Hackathon MVP development. Feedback, issues, and contributions are welcome.
