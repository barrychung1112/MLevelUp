# MLevelUp

MLevelUp is a gamified training system for people who want to become machine learning engineers through execution, measurable evidence, feedback, and portfolio-building—not passive course consumption.

Built as an OpenAI Hackathon project, the MVP turns long-term ML engineering growth into a demanding daily loop: accept a mission, complete concrete checkpoints, submit evidence, receive evaluation, and build a public body of work.

## The problem

Machine learning roadmaps explain what to learn, but they rarely answer three practical questions:

- What should I build today?
- How do I know whether the result is good enough?
- How does today's work become credible portfolio evidence?

MLevelUp addresses that gap with structured missions, explicit success metrics, evidence-based completion, and persistent progression.

## Core training loop

1. The learner commits to becoming a machine learning engineer.
2. The system assigns the hardest mission that is still achievable within the learner's current ability and time constraints.
3. A multi-day mainline mission runs alongside a 24-hour daily mission.
4. Each mission defines execution steps, measurable success criteria, boundaries, required evidence, and supporting resources.
5. Missed obligations generate additional penalty missions.
6. Seven consecutive failure days trigger a decision: abandon and reset, or enter a three-day recovery window.
7. Verified results contribute XP, seven ML engineering skill stats, training history, and portfolio artifacts.

## Current MVP

- Email magic-link authentication through Supabase
- Original dark command-center interface with responsive desktop and mobile layouts
- Fixed target role: Machine Learning Engineer
- Five-hour daily training commitment
- Initial calibration mission: **The Courage to Challenge**
- Multi-day mainline missions with explicit checkpoints
- Independent 24-hour daily missions
- Penalty missions for missed checkpoints and daily obligations
- Seven-day failure review and three-day recovery state machine
- Evidence submission for URLs, files, metrics, and written reflections
- XP, levels, streaks, and seven skill dimensions
- Resource readiness checks before mission assignment
- Portfolio artifacts, battle log, progress review, and agent status views
- Supabase persistence with row-level security policies
- Demo mode backed by deterministic local data

The coordinator, learning strategist, resource collector, and adjuster are represented in the current interface and data model. Their generative AI behavior is intentionally mocked in this Phase 2 MVP; real OpenAI-powered agent execution is planned for the next phase.

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

MLevelUp uses a modular monolith so the MVP remains easy to operate while preserving clear boundaries for future agent and scheduling services.

```text
Next.js App Router
├── Feature UI and route composition
├── TrainingProvider application boundary
├── Domain rules and state machines
├── MockTrainingRepository for demo mode
└── SupabaseTrainingRepository for authenticated persistence
        ├── PostgreSQL
        ├── Row Level Security
        └── Magic-link authentication
```

### Technology

- Next.js 16 and React 19
- TypeScript
- Supabase Auth and PostgreSQL
- Tailwind CSS
- Zod domain validation
- Vitest and Testing Library
- Playwright browser testing

## Run locally

Requirements: Node.js 20 or later and npm.

```bash
git clone https://github.com/barrychung1112/MLevelUp.git
cd MLevelUp
npm install
```

For the fastest local evaluation, create `.env.local` with demo mode enabled:

```env
NEXT_PUBLIC_MLEVELUP_DEMO_MODE=1
```

Then start the application:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Connect Supabase

Copy `.env.example` to `.env.local` and provide the browser-safe project values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
```

Run the migrations in chronological order through the Supabase SQL Editor:

1. `supabase/migrations/202607160001_phase2_training.sql`
2. `supabase/migrations/202607170001_adaptive_courage_path.sql`
3. `supabase/migrations/202607180001_mainline_daily_missions.sql`

Do not expose a Supabase secret or `service_role` key in browser environment variables.

## Verification

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
```

The current release is covered by 221 unit and integration tests across 42 files and 20 real-browser scenarios across desktop and mobile Chromium.

## Repository structure

```text
src/app/                  Next.js routes and page composition
src/components/           Feature and UI components
src/domain/training/      Mission, reward, deadline, and recovery rules
src/application/training/ Use cases and repository contracts
src/supabase-training/    Supabase persistence implementation
src/mocks/training/       Deterministic demo repository and seed data
supabase/migrations/      Database schema and migration history
e2e/                      Playwright user-flow tests
docs/superpowers/         Approved designs and implementation plans
```

## Hackathon status and roadmap

The repository contains a functional Phase 2 training dashboard rather than a landing-page prototype. The next milestones are:

- OpenAI-powered coordinator, learning strategist, and adjuster agents
- Evidence-aware AI feedback and quality scoring
- Curated live resource ingestion with freshness and credibility checks
- Kaggle and hackathon result integrations
- Public portfolio export and shareable learner profiles
- Production deployment and hosted demo URL

## Responsible design

- Mission completion requires evidence rather than a self-reported checkbox.
- Reset rules are explicit before training begins.
- Portfolio artifacts are preserved separately from transient mission state where appropriate.
- The visual language is original and does not reuse copyrighted characters, logos, dialogue, or game assets.

## Project stage

Active Hackathon MVP development. Feedback, issues, and contributions are welcome.
