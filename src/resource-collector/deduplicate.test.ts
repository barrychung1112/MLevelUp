import { describe, expect, test } from "vitest";

import { deduplicateCandidates } from "./deduplicate";

const candidate = {
  source: "github" as const,
  externalId: "123",
  title: "Repository",
  summary: "A repository for machine learning engineering practice.",
  url: "https://github.com/openai/repository",
  resourceType: "repository" as const,
  publishedAt: "2026-07-01T00:00:00.000Z",
};

describe("resource candidate deduplication", () => {
  test("prefers source identity before canonical URL and fingerprint", () => {
    const result = deduplicateCandidates([
      candidate,
      { ...candidate, title: "Same source identity", url: "https://example.com/other" },
      { ...candidate, externalId: "456", url: "https://github.com/openai/repository/" },
    ]);

    expect(result.unique).toEqual([candidate]);
    expect(result.duplicates).toHaveLength(2);
    expect(result.duplicates.map((item) => item.reason)).toEqual([
      "source_identity",
      "canonical_url",
    ]);
  });
});
