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
