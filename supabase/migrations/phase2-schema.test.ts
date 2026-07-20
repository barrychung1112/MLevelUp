import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(process.cwd(), "supabase", "migrations", "202607160001_phase2_training.sql");
const adaptiveMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "202607170001_adaptive_courage_path.sql",
);
const missionMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "202607180001_mainline_daily_missions.sql",
);
const phase3MigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "202607180002_phase3_ai_feedback.sql",
);
const phase4MigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "202607180003_phase4_resource_collector.sql",
);
const dailyIdempotencyMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "202607190001_daily_assignment_idempotency.sql",
);
const phase41MigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "202607190002_phase4_1_resource_closeout.sql",
);
const resourceUpsertFixMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "202607190003_fix_resource_upsert_conflict.sql",
);
const publicPortfolioMigrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "202607190004_phase5_public_portfolio.sql",
);

describe("phase 2 Supabase schema migration", () => {
  it("defines the compact training schema, RLS, and public-safe app credentials", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, "utf8").toLowerCase();
    const expectedTables = [
      "profiles",
      "user_progress",
      "skill_stats",
      "quests",
      "quest_assignments",
      "submissions",
      "feedback",
      "resources",
      "portfolio_artifacts",
      "agent_runs",
    ];

    for (const table of expectedTables) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }

    expect(sql).toContain("auth.uid() = user_id");
    expect(sql).toContain("to authenticated using (true)");
    expect(sql).toContain("verification_status");
    expect(sql).toContain("quality_score");
    expect(sql).toContain("resource_type");
    expect(sql).toContain("skill_tags");

    const appCode = readFileSync(join(process.cwd(), "src", "lib", "supabase", "config.ts"), "utf8").toLowerCase();
    expect(appCode).not.toContain("service_role");
    expect(appCode).not.toContain("secret");
  });
});

describe("mainline and daily mission migration", () => {
  it("adds fixed training, lifecycle, resource, and relationship fields idempotently", () => {
    expect(existsSync(missionMigrationPath)).toBe(true);
    const sql = readFileSync(missionMigrationPath, "utf8").toLowerCase();

    for (const column of [
      "target_role", "daily_minutes", "consecutive_failure_days", "training_status",
      "recovery_started_at", "recovery_deadline", "scope", "duration_days",
      "execution_steps", "success_metrics", "out_of_scope", "parent_assignment_id",
      "checkpoint_index", "due_at", "expired_at", "penalty_source_assignment_id",
      "prerequisites", "required_tools", "cost_tier", "availability_status",
      "last_checked_at", "fallback_resource_id",
    ]) expect(sql).toContain(column);

    expect(sql).toContain("daily_minutes = 300");
    expect(sql).toContain("'main', 'daily', 'penalty', 'calibration'");
    expect(sql).toContain("references public.quest_assignments(id)");
    expect(sql).toContain("create index if not exists quest_assignments_user_due_idx");
    expect(sql).toContain("create index if not exists quest_assignments_penalty_source_idx");
    expect(sql).toContain("on conflict (id) do update");
    expect(sql).toContain("quest-penalty-main");
    expect(sql).toContain("quest-penalty-daily");
  });
});

describe("adaptive courage path migration", () => {
  it("adds challenge acceptance, quest purpose, and the courage calibration quest", () => {
    expect(existsSync(adaptiveMigrationPath)).toBe(true);

    const sql = readFileSync(adaptiveMigrationPath, "utf8").toLowerCase();
    expect(sql).toContain("challenge_accepted_at");
    expect(sql).toContain("purpose");
    expect(sql).toContain("quest-courage-challenge");
    expect(sql).toContain("'calibration'");
    expect(sql).toContain("difficulty");
    expect(sql).toContain("90");
  });
});

describe("Phase 3 AI feedback migration", () => {
  it("adds auditable AI fields, idempotency, and strict agent ownership", () => {
    expect(existsSync(phase3MigrationPath)).toBe(true);
    const sql = readFileSync(phase3MigrationPath, "utf8").toLowerCase();

    for (const column of [
      "submission_id", "model", "prompt_version", "latency_ms",
      "input_tokens", "output_tokens", "error_code", "fallback_used",
      "trace_id", "source", "ai_confidence", "adjustment_explanation",
      "recommended_quest_id",
    ]) expect(sql).toContain(column);

    expect(sql).toContain("agent_runs_submission_prompt_uidx");
    expect(sql).toContain("auth.uid() = user_id");
    expect(sql).not.toContain("auth.uid() = user_id or user_id is null");
    expect(sql).toContain("alter column user_id set not null");
    expect(sql).toContain("'deterministic', 'ai', 'ai_fallback'");
  });
});

describe("Phase 4 resource collector migration", () => {
  it("adds catalog provenance, collection diagnostics, and read-only client access", () => {
    expect(existsSync(phase4MigrationPath)).toBe(true);
    const sql = readFileSync(phase4MigrationPath, "utf8").toLowerCase();

    for (const value of [
      "canonical_url", "external_id", "content_fingerprint", "quality_score",
      "task_fit", "published_at", "ingested_at", "resource_collection_runs",
      "resource_collection_items", "resources_source_external_uidx",
      "resources_canonical_url_uidx",
    ]) expect(sql).toContain(value);

    expect(sql).toContain("resources_write_service_only");
    expect(sql).toContain("to service_role");
  });
});

describe("daily assignment idempotency migration", () => {
  it("prevents duplicate scheduler assignments per learner and local date", () => {
    expect(existsSync(dailyIdempotencyMigrationPath)).toBe(true);
    const sql = readFileSync(dailyIdempotencyMigrationPath, "utf8").toLowerCase();

    expect(sql).toContain("generation_key");
    expect(sql).toContain("quest_assignments_user_generation_uidx");
    expect(sql).toContain("where generation_key is not null");
  });
});

describe("Phase 4.1 resource collector closeout migration", () => {
  it("adds aggregate diagnostics and exposes only a sanitized authenticated RPC", () => {
    expect(existsSync(phase41MigrationPath)).toBe(true);
    const sql = readFileSync(phase41MigrationPath, "utf8").toLowerCase();

    for (const column of ["fallback_count", "unavailable_count", "unchecked_count"]) {
      expect(sql).toContain(column);
    }
    expect(sql).toContain("get_latest_resource_collector_status");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public, pg_temp");
    expect(sql).toContain("revoke all on function public.get_latest_resource_collector_status() from public");
    expect(sql).toContain("grant execute on function public.get_latest_resource_collector_status() to authenticated");
    expect(sql).not.toContain("trace_id");
    expect(sql).not.toContain("input_tokens");
    expect(sql).not.toContain("output_tokens");
  });
});

describe("resource collector upsert conflict migration", () => {
  it("replaces the partial source identity index with an inferable unique index", () => {
    expect(existsSync(resourceUpsertFixMigrationPath)).toBe(true);
    const sql = readFileSync(resourceUpsertFixMigrationPath, "utf8").toLowerCase();

    expect(sql).toContain("drop index if exists public.resources_source_external_uidx");
    expect(sql).toContain("create unique index resources_source_external_uidx");
    expect(sql).toContain("on public.resources (source, external_id)");
    expect(sql).not.toContain("where external_id is not null");
  });
});

describe("Phase 5 public portfolio migration", () => {
  it("keeps public portfolio writes behind owner checks and authenticated RPCs", () => {
    expect(existsSync(publicPortfolioMigrationPath)).toBe(true);
    const sql = readFileSync(publicPortfolioMigrationPath, "utf8").toLowerCase();

    expect(sql).toContain(
      "alter table public.public_portfolios enable row level security",
    );
    expect(sql).toContain(
      "alter table public.published_artifacts enable row level security",
    );
    expect(sql).toContain("auth.uid() = user_id");
    expect(sql).toContain("verification_status <> 'verified'");
    expect(sql).toContain("set search_path = pg_catalog, public");
    expect(sql).toContain(
      "revoke all on function public.publish_portfolio_artifact",
    );
    expect(sql).toContain(
      "grant execute on function public.publish_portfolio_artifact",
    );
    expect(sql).not.toMatch(/publish_portfolio_artifact\s*\([^)]*user_id/iu);
  });

  it("allows anonymous reads only through a published public projection", () => {
    const sql = readFileSync(publicPortfolioMigrationPath, "utf8").toLowerCase();

    expect(sql).toContain("is_published or auth.uid() = user_id");
    expect(sql).toContain("p.is_published");
    expect(sql).toContain(
      "grant select on public.public_portfolios, public.published_artifacts to anon, authenticated",
    );
    expect(sql).toContain(
      "revoke insert, update, delete on public.published_artifacts from anon, authenticated",
    );
  });

  it("copies canonical artifact fields and enforces publication limits", () => {
    const sql = readFileSync(publicPortfolioMigrationPath, "utf8").toLowerCase();

    for (const field of [
      "artifact_type",
      "artifact_url",
      "skill_tags",
      "quality_score",
      "verification_status",
    ]) {
      expect(sql).toContain(field);
    }
    expect(sql).toContain("portfolio_artifact_not_verified");
    expect(sql).toContain("portfolio_artifact_url_not_https");
    expect(sql).toContain("portfolio_featured_limit");
    expect(sql).toContain("on conflict (artifact_id) do update");
  });
});
