import { describe, expect, it } from "vitest";

import {
  PortfolioPublicationError,
  type PortfolioPublicationErrorCode,
} from "./portfolio-publication-repository";
import { SupabasePortfolioPublicationRepository } from "./supabase-portfolio-publication-repository";

type DatabaseError = { code?: string; message: string };
type QueryResult = { data: unknown; error: DatabaseError | null };

class FakeQuery implements PromiseLike<QueryResult> {
  constructor(
    private readonly result: QueryResult,
    private readonly calls: string[],
  ) {}

  select(columns = "*") {
    this.calls.push(`select:${columns}`);
    return this;
  }

  eq(column: string, value: unknown) {
    this.calls.push(`eq:${column}:${String(value)}`);
    return this;
  }

  maybeSingle() {
    this.calls.push("maybeSingle");
    return Promise.resolve(this.result);
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

class FakeClient {
  readonly calls: string[] = [];
  readonly rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  readonly writes: Array<{ table: string; operation: string; value: unknown }> = [];

  constructor(
    private readonly tableResults: Record<string, QueryResult>,
    private readonly rpcError: DatabaseError | null = null,
    private readonly userId: string | null = "user-1",
  ) {}

  readonly auth = {
    getUser: async () => ({
      data: { user: this.userId ? { id: this.userId } : null },
      error: null,
    }),
  };

  from(table: string) {
    this.calls.push(`from:${table}`);
    const result = this.tableResults[table] ?? { data: null, error: null };
    const query = new FakeQuery(result, this.calls);
    return {
      select: query.select.bind(query),
      upsert: async (value: unknown) => {
        this.writes.push({ table, operation: "upsert", value });
        return result;
      },
      update: (value: unknown) => {
        this.writes.push({ table, operation: "update", value });
        return query;
      },
    };
  }

  async rpc(name: string, args: Record<string, unknown>) {
    this.rpcCalls.push({ name, args });
    return { data: null, error: this.rpcError };
  }
}

const profileRow = {
  user_id: "user-1",
  slug: "barry-ml",
  display_name: "Barry",
  headline: "Machine Learning Engineer in Training",
  bio: "Building evaluated ML systems.",
  is_published: false,
  created_at: "2026-07-19T00:00:00.000Z",
  updated_at: "2026-07-19T00:00:00.000Z",
};

const artifactRow = {
  artifact_id: "8a165314-e249-4187-957a-143f80997319",
  public_title: "Validated churn model",
  public_summary: "Compared three baselines and documented validation leakage controls.",
  artifact_type: "modelEvaluationReport",
  artifact_url: "https://example.com/report",
  skill_tags: ["modeling", "evaluation"],
  quality_score: 88,
  featured: false,
  display_order: 0,
  published_at: "2026-07-19T00:00:00.000Z",
  updated_at: "2026-07-19T00:00:00.000Z",
};

function repository(client: FakeClient) {
  return new SupabasePortfolioPublicationRepository(client as never);
}

describe("SupabasePortfolioPublicationRepository", () => {
  it("loads only the current owner's profile and snapshots", async () => {
    const client = new FakeClient({
      public_portfolios: { data: profileRow, error: null },
      published_artifacts: { data: [artifactRow], error: null },
    });

    const state = await repository(client).load();

    expect(client.calls.filter((call) => call === "eq:user_id:user-1")).toHaveLength(2);
    expect(state.profile?.displayName).toBe("Barry");
    expect(state.artifacts[0]?.qualityScore).toBe(88);
  });

  it("creates a private profile before visibility is explicitly enabled", async () => {
    const client = new FakeClient({
      public_portfolios: { data: null, error: null },
    });

    await repository(client).saveProfile({
      slug: "barry-ml",
      displayName: "Barry",
      headline: "Machine Learning Engineer in Training",
      bio: "Building evaluated ML systems.",
    });

    expect(client.writes).toContainEqual({
      table: "public_portfolios",
      operation: "upsert",
      value: expect.objectContaining({ user_id: "user-1", is_published: false }),
    });
  });

  it("sends only editable fields to publish_portfolio_artifact", async () => {
    const client = new FakeClient({});

    await repository(client).publishArtifact({
      artifactId: "8a165314-e249-4187-957a-143f80997319",
      publicTitle: "Validated churn model",
      publicSummary: "Compared three baselines and documented validation leakage controls.",
      showArtifactUrl: true,
      featured: false,
      displayOrder: 0,
    });

    expect(client.rpcCalls).toEqual([
      {
        name: "publish_portfolio_artifact",
        args: {
          p_artifact_id: "8a165314-e249-4187-957a-143f80997319",
          p_public_title: "Validated churn model",
          p_public_summary:
            "Compared three baselines and documented validation leakage controls.",
          p_show_artifact_url: true,
          p_featured: false,
          p_display_order: 0,
        },
      },
    ]);
  });

  it("normalizes portfolio_featured_limit to a stable error", async () => {
    const client = new FakeClient({}, { message: "portfolio_featured_limit" });

    const action = repository(client).publishArtifact({
      artifactId: "8a165314-e249-4187-957a-143f80997319",
      publicTitle: "Validated churn model",
      publicSummary: "Compared three baselines and documented validation leakage controls.",
      showArtifactUrl: false,
      featured: true,
      displayOrder: 0,
    });

    await expect(action).rejects.toMatchObject({
      code: "featured_limit" satisfies PortfolioPublicationErrorCode,
    } satisfies Partial<PortfolioPublicationError>);
  });

  it("unpublishes only through the safe RPC", async () => {
    const client = new FakeClient({});

    await repository(client).unpublishArtifact(
      "8a165314-e249-4187-957a-143f80997319",
    );

    expect(client.rpcCalls).toEqual([
      {
        name: "unpublish_portfolio_artifact",
        args: { p_artifact_id: "8a165314-e249-4187-957a-143f80997319" },
      },
    ]);
    expect(client.writes).toHaveLength(0);
  });
});
