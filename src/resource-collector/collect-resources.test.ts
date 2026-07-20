import { describe, expect, test, vi } from "vitest";

import { collectResources, type ResourceCatalogRepository } from "./collect-resources";
import type { ResourceCuration } from "./curator";

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

const curation: ResourceCuration = {
  summary: "A validated AI summary for a production MLOps learning resource.",
  difficulty: 5,
  estimatedMinutes: 55,
  skillTags: ["engineering", "evaluation"],
  prerequisites: ["Python"],
  relevance: 94,
  taskFit: 91,
  reason: "Directly supports a measurable deployment mission.",
  fallbackUsed: false,
};

const available = async () => ({ status: "available" as const });
const curate = async () => curation;

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
      curate,
      checkAvailability: available,
    });

    expect(outcome).toMatchObject({ status: "degraded", inserted: 1, sourceFailures: ["arxiv"] });
    expect(catalog.finishRun).toHaveBeenCalledWith("run-1", expect.objectContaining({ status: "degraded" }));
  });

  test("replaying a completed run is idempotent and does not call a source", async () => {
    const source = { source: "github" as const, search: vi.fn() };
    const catalog = repository();
    catalog.findRun = vi.fn().mockResolvedValue({
      status: "completed",
      candidateCount: 4,
      inserted: 3,
      updated: 1,
      duplicates: 0,
      rejected: 0,
      fallbackCount: 0,
      unavailableCount: 0,
      uncheckedCount: 0,
    });

    const outcome = await collectResources({
      runKey: "2026-07-18", now: "2026-07-18T09:00:00.000Z", query: "mlops", limit: 5,
      sources: [source], repository: catalog,
      curate,
      checkAvailability: available,
    });

    expect(outcome).toMatchObject({ status: "completed", replayed: true, inserted: 3 });
    expect(source.search).not.toHaveBeenCalled();
  });

  test("persists validated curator fields and verified availability", async () => {
    const catalog = repository();

    const outcome = await collectResources({
      runKey: "2026-07-18-curated",
      now: "2026-07-18T09:00:00.000Z",
      query: "mlops",
      limit: 5,
      sources: [{ source: "github", search: vi.fn().mockResolvedValue([candidate]) }],
      repository: catalog,
      curate,
      checkAvailability: available,
    });

    expect(catalog.upsertResource).toHaveBeenCalledWith(expect.objectContaining({
      summary: curation.summary,
      difficulty: 5,
      estimatedMinutes: 55,
      skillTags: ["engineering", "evaluation"],
      relevance: 94,
      taskFit: 91,
      availabilityStatus: "available",
    }));
    expect(outcome).toMatchObject({
      status: "completed",
      candidateCount: 1,
      fallbackCount: 0,
      unavailableCount: 0,
      uncheckedCount: 0,
    });
  });

  test("keeps fallback and unchecked candidates but degrades the run", async () => {
    const catalog = repository();

    const outcome = await collectResources({
      runKey: "2026-07-18-fallback",
      now: "2026-07-18T09:00:00.000Z",
      query: "mlops",
      limit: 5,
      sources: [{ source: "github", search: vi.fn().mockResolvedValue([candidate]) }],
      repository: catalog,
      curate: async () => ({ ...curation, fallbackUsed: true }),
      checkAvailability: async () => ({ status: "unchecked", errorCode: "timeout" }),
    });

    expect(catalog.upsertResource).toHaveBeenCalledWith(expect.objectContaining({
      availabilityStatus: "unchecked",
    }));
    expect(catalog.recordItem).toHaveBeenCalledWith(expect.objectContaining({ disposition: "fallback" }));
    expect(outcome).toMatchObject({
      status: "degraded",
      candidateCount: 1,
      fallbackCount: 1,
      unavailableCount: 0,
      uncheckedCount: 1,
    });
  });

  test("counts an unavailable resource and never marks it available", async () => {
    const catalog = repository();

    const outcome = await collectResources({
      runKey: "2026-07-18-unavailable",
      now: "2026-07-18T09:00:00.000Z",
      query: "mlops",
      limit: 5,
      sources: [{ source: "github", search: vi.fn().mockResolvedValue([candidate]) }],
      repository: catalog,
      curate,
      checkAvailability: async () => ({ status: "unavailable" }),
    });

    expect(catalog.upsertResource).toHaveBeenCalledWith(expect.objectContaining({ availabilityStatus: "unavailable" }));
    expect(outcome).toMatchObject({ status: "degraded", unavailableCount: 1 });
  });
});
