import { describe, expect, test, vi } from "vitest";

import { collectResources, type ResourceCatalogRepository } from "./collect-resources";

const candidate = {
  source: "github" as const,
  externalId: "repo-1",
  title: "Practical MLOps repository",
  summary: "A practical repository that demonstrates reproducible ML delivery.",
  url: "https://github.com/example/mlops",
  resourceType: "repository" as const,
  credibilityHint: 90,
  freshnessHint: 85,
};

function repository(): ResourceCatalogRepository {
  return {
    findRun: vi.fn().mockResolvedValue(null),
    startRun: vi.fn().mockResolvedValue("run-1"),
    upsertResource: vi.fn().mockResolvedValue("inserted"),
    recordItem: vi.fn().mockResolvedValue(undefined),
    finishRun: vi.fn().mockResolvedValue(undefined),
  };
}

describe("collectResources", () => {
  test("continues after a source failure and records a degraded run", async () => {
    const catalog = repository();
    const outcome = await collectResources({
      runKey: "2026-07-18",
      now: "2026-07-18T09:00:00.000Z",
      query: "machine learning engineering",
      limit: 5,
      sources: [
        { source: "github", search: vi.fn().mockResolvedValue([candidate]) },
        { source: "arxiv", search: vi.fn().mockRejectedValue(new Error("offline")) },
      ],
      repository: catalog,
    });

    expect(outcome).toMatchObject({ status: "degraded", inserted: 1, sourceFailures: ["arxiv"] });
    expect(catalog.finishRun).toHaveBeenCalledWith("run-1", expect.objectContaining({ status: "degraded" }));
  });

  test("replaying a completed run is idempotent and does not call a source", async () => {
    const source = { source: "github" as const, search: vi.fn() };
    const catalog = repository();
    catalog.findRun = vi.fn().mockResolvedValue({ status: "completed", inserted: 3, updated: 1, duplicates: 0, rejected: 0 });

    const outcome = await collectResources({
      runKey: "2026-07-18", now: "2026-07-18T09:00:00.000Z", query: "mlops", limit: 5,
      sources: [source], repository: catalog,
    });

    expect(outcome).toMatchObject({ status: "completed", replayed: true, inserted: 3 });
    expect(source.search).not.toHaveBeenCalled();
  });
});
