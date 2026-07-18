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
