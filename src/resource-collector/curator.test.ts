import { describe, expect, test, vi } from "vitest";

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
  test("returns strict structured AI curation when the gateway succeeds", async () => {
    const data = {
      summary: "A structured summary that is long enough for validation.",
      difficulty: 4 as const,
      estimatedMinutes: 50,
      skillTags: ["engineering" as const],
      prerequisites: ["Python"],
      relevance: 90,
      taskFit: 88,
      reason: "Useful for an applied MLOps implementation task.",
    };
    const gateway = {
      generate: vi.fn().mockResolvedValue({ data, responseId: "response-1", model: "test-model", inputTokens: 10, outputTokens: 20 }),
    };

    await expect(curateCandidate(candidate, gateway, {
      apiKey: "test-key", model: "test-model", promptVersion: "phase4-resource-v1",
    })).resolves.toEqual({ ...data, fallbackUsed: false });
  });

  test("uses deterministic enrichment when the gateway rejects invalid output", async () => {
    const gateway = { generate: vi.fn().mockRejectedValue(new Error("invalid_structured_output")) };

    await expect(curateCandidate(candidate, gateway, {
      apiKey: "test-key", model: "test-model", promptVersion: "phase4-resource-v1",
    })).resolves.toMatchObject({ fallbackUsed: true, difficulty: 3 });
  });

  test("uses deterministic source enrichment when AI is unavailable", async () => {
    await expect(curateCandidate(candidate, null, null)).resolves.toMatchObject({
      fallbackUsed: true,
      difficulty: 3,
      estimatedMinutes: 45,
      skillTags: ["engineering"],
    });
  });
});
