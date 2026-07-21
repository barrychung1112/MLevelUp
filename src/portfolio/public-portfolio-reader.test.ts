import { describe, expect, it } from "vitest";

import { createPublicPortfolioReader, demoPublicPortfolio, readPublicPortfolio } from "./public-portfolio-reader";

class Query implements PromiseLike<{ data: unknown; error: null }> {
  readonly calls: string[] = [];
  constructor(private readonly data: unknown) {}
  select(value: string) { this.calls.push(`select:${value}`); return this; }
  eq(column: string, value: unknown) { this.calls.push(`eq:${column}:${String(value)}`); return this; }
  order(column: string, options?: unknown) { this.calls.push(`order:${column}:${JSON.stringify(options)}`); return this; }
  maybeSingle() { this.calls.push("maybeSingle"); return Promise.resolve({ data: this.data, error: null }); }
  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) { return Promise.resolve({ data: this.data, error: null }).then(onfulfilled, onrejected); }
}

describe("public portfolio reader", () => {
  it("queries only public projection tables and maps their allowlisted fields", async () => {
    const profile = new Query({ user_id: "user-1", slug: "barry-ml", display_name: "Barry", headline: "ML Engineer", bio: "Evidence", is_published: true, created_at: "2026-07-19T00:00:00.000Z", updated_at: "2026-07-19T00:00:00.000Z" });
    const artifacts = new Query([{ artifact_id: "artifact-1", public_title: "Model report", public_summary: "A reproducible report with explicit evaluation evidence.", artifact_type: "modelEvaluationReport", artifact_url: "https://example.com", skill_tags: ["modeling"], quality_score: 88, featured: true, display_order: 0, published_at: "2026-07-19T00:00:00.000Z", updated_at: "2026-07-19T00:00:00.000Z", key_achievements: ["Compared 3 models."], link_existence_verified: true, verification_provider: "github", verification_resource_type: "repository", link_verified_at: "2026-07-20T00:00:00.000Z", verification_stale_after: "2099-08-19T00:00:00.000Z", source_refs: ["must-not-leak"] }]);
    const tables: string[] = [];
    const client = { from(table: string) { tables.push(table); return table === "public_portfolios" ? profile : artifacts; } };

    const result = await createPublicPortfolioReader(client as never)("barry-ml");

    expect(tables).toEqual(["public_portfolios", "published_artifacts"]);
    expect(result?.profile.displayName).toBe("Barry");
    expect(result?.artifacts[0]?.skillTags).toEqual(["modeling"]);
    expect(result?.artifacts[0]?.keyAchievements).toEqual(["Compared 3 models."]);
    expect(result?.artifacts[0]?.linkVerification?.ownershipVerified).toBe(false);
    expect(JSON.stringify(result)).not.toContain("source_refs");
  });

  it("returns null for an unknown or hidden slug", async () => {
    const client = { from: () => new Query(null) };
    await expect(createPublicPortfolioReader(client as never)("missing")).resolves.toBeNull();
  });

  it("provides a deterministic seven-skill demo fixture", () => {
    expect(demoPublicPortfolio.profile.slug).toBe("demo-ml-engineer");
    expect(new Set(demoPublicPortfolio.artifacts.flatMap((item) => item.skillTags))).toHaveLength(7);
  });

  it("reads the guided demo portfolio without database configuration", async () => {
    await expect(readPublicPortfolio("demo-ml-engineer")).resolves.toEqual(demoPublicPortfolio);
  });
});
