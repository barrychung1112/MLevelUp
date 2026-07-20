import { describe, expect, it } from "vitest";

import { buildAchievementSourceFacts, fingerprintSourceFacts } from "./source-facts";

describe("achievement source facts", () => {
  it("builds only allowlisted typed facts", () => {
    const facts = buildAchievementSourceFacts({
      artifact: {
        title: "Leakage-safe classifier",
        artifactType: "githubRepo",
        qualityScore: 88,
        skillTags: ["modeling", "evaluation"],
        email: "private@example.com",
        reviewerNotes: "private reviewer note",
      },
      quest: {
        title: "Validate a model",
        objective: "Compare validation strategies",
        executionSteps: ["Train a baseline", "Run error analysis"],
        successMetrics: ["Document validation accuracy"],
        penaltyState: "failed",
      },
      metrics: [{ name: "validation_accuracy", value: "0.88" }],
      verification: {
        provider: "github",
        verifiedAt: "2026-07-20T12:00:00.000Z",
        metadata: { fullName: "learner/model", primaryLanguage: "Python" },
        rawBody: "private upstream response",
      },
      selfReflection: "private reflection",
      feedback: "private feedback",
    });

    expect(facts).toEqual(expect.arrayContaining([
      { ref: "artifact:title", value: "Leakage-safe classifier" },
      { ref: "artifact:quality_score", value: "88" },
      { ref: "quest:step:1", value: "Train a baseline" },
      { ref: "metric:validation_accuracy", value: "0.88" },
      { ref: "verification:provider", value: "github" },
      { ref: "verification:metadata:fullName", value: "learner/model" },
    ]));
    const serialized = JSON.stringify(facts);
    for (const privateValue of [
      "private@example.com",
      "private reviewer note",
      "failed",
      "private upstream response",
      "private reflection",
      "private feedback",
    ]) {
      expect(serialized).not.toContain(privateValue);
    }
  });

  it("produces a stable order-independent fingerprint that changes with facts", () => {
    const first = [
      { ref: "b", value: "two" },
      { ref: "a", value: "one" },
    ];
    const reordered = [...first].reverse();

    expect(fingerprintSourceFacts(first)).toBe(fingerprintSourceFacts(reordered));
    expect(fingerprintSourceFacts(first)).not.toBe(
      fingerprintSourceFacts([{ ref: "a", value: "changed" }, first[0]]),
    );
    expect(fingerprintSourceFacts(first)).toMatch(/^[a-f0-9]{64}$/u);
  });
});
