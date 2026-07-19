import { describe, expect, test } from "vitest";

import { curateCandidate } from "./curator";

const candidate = {
  source: "github" as const,
  externalId: "123",
  title: "openai/example",
  summary: "Repository for MLOps experiments.",
  url: "https://github.com/openai/example",
  resourceType: "repository" as const,
  credibilityHint: 80,
  freshnessHint: 75,
};

describe("resource curator", () => {
  test("uses deterministic source enrichment when AI is unavailable", async () => {
    await expect(curateCandidate(candidate, null, null)).resolves.toMatchObject({
      fallbackUsed: true,
      difficulty: 3,
      estimatedMinutes: 45,
      skillTags: ["engineering"],
    });
  });
});
