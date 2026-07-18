import { describe, expect, test } from "vitest";

import type { EvidenceRecord, Quest } from "./types";
import { evaluateSubmission } from "./evaluate-submission";

const reflection = "這次實驗先建立基準模型，再比較驗證集誤差。我確認資料切分沒有洩漏，並記錄下一步要檢查類別不平衡與錯誤樣本。".repeat(
  5,
);

const quest: Quest = {
  id: "quest-github",
  trainingContract: "standard",
  purpose: "training",
  scope: "daily",
  durationDays: 1,
  executionSteps: ["Complete the evaluation exercise"],
  successMetrics: ["Submit the required evidence"],
  outOfScope: [],
  title: "Ship a model experiment",
  summary: "Commit a reproducible experiment.",
  instructions: "Submit the commit and reflect on the result.",
  questType: "modelExperiment",
  difficulty: 3,
  estimatedMinutes: 70,
  baseXp: 70,
  optional: false,
  acceptanceCriteria: ["Commit the experiment"],
  evidenceRequirements: [
    { id: "commit", type: "githubCommit", required: true },
  ],
  reflectionMinChars: 40,
  skillWeights: {
    dataHandling: 0.1,
    modeling: 0.4,
    evaluation: 0.2,
    engineering: 0.2,
    researchSense: 0,
    productThinking: 0,
    communication: 0.1,
  },
  expectedArtifactType: "githubRepository",
  resourceIds: [],
};

const githubEvidence: EvidenceRecord = {
  id: "evidence-1",
  requirementId: "commit",
  type: "githubCommit",
  url: "https://github.com/acme/ml-project/commit/abcdef",
};

describe("deterministic submission evaluation", () => {
  test("awards all four score sections for valid evidence", () => {
    const result = evaluateSubmission({
      quest,
      evidence: [githubEvidence],
      selfReflection: reflection,
    });

    expect(result.scoreBreakdown).toEqual({
      evidenceCompleteness: 45,
      evidenceValidity: 25,
      reflection: 20,
      artifactReadiness: 10,
    });
    expect(result.qualityScore).toBe(100);
    expect(result.verificationStatus).toBe("verified");
    expect(result.artifactReady).toBe(true);
  });

  test("caps missing required evidence at 59 and requests revision", () => {
    const result = evaluateSubmission({
      quest,
      evidence: [],
      selfReflection: reflection,
    });

    expect(result.qualityScore).toBeLessThanOrEqual(59);
    expect(result.verificationStatus).toBe("needs_revision");
    expect(result.hardFailures).toContain("Missing required evidence: commit");
  });

  test.each([
    ["an HTTP URL", "http://github.com/acme/ml-project/commit/abcdef"],
    ["the wrong GitHub host", "https://gitlab.com/acme/ml-project/commit/abcdef"],
  ])("rejects %s", (_label, url) => {
    const result = evaluateSubmission({
      quest,
      evidence: [{ ...githubEvidence, url }],
      selfReflection: reflection,
    });

    expect(result.verificationStatus).toBe("needs_revision");
    expect(result.scoreBreakdown.evidenceValidity).toBe(0);
  });

  test("rejects the wrong Kaggle host", () => {
    const result = evaluateSubmission({
      quest: {
        ...quest,
        evidenceRequirements: [
          { id: "notebook", type: "kaggleNotebook", required: true },
        ],
        expectedArtifactType: "kaggleNotebook",
      },
      evidence: [
        {
          id: "evidence-kaggle",
          requirementId: "notebook",
          type: "kaggleNotebook",
          url: "https://example.com/code/acme/notebook",
        },
      ],
      selfReflection: reflection,
    });

    expect(result.verificationStatus).toBe("needs_revision");
    expect(result.scoreBreakdown.evidenceValidity).toBe(0);
  });

  test("rejects file evidence without complete metadata", () => {
    const result = evaluateSubmission({
      quest: {
        ...quest,
        evidenceRequirements: [
          { id: "screenshot", type: "screenshot", required: true },
        ],
        expectedArtifactType: undefined,
      },
      evidence: [
        {
          id: "evidence-file",
          requirementId: "screenshot",
          type: "screenshot",
          fileName: "metric.png",
        },
      ],
      selfReflection: reflection,
    });

    expect(result.verificationStatus).toBe("needs_revision");
    expect(result.scoreBreakdown.evidenceValidity).toBe(0);
  });

  test("rejects a reflection below the quest minimum", () => {
    const result = evaluateSubmission({
      quest,
      evidence: [githubEvidence],
      selfReflection: "太短",
    });

    expect(result.verificationStatus).toBe("needs_revision");
    expect(result.scoreBreakdown.reflection).toBe(0);
  });

  test("returns identical output for identical normalized input", () => {
    const input = { quest, evidence: [githubEvidence], selfReflection: reflection };

    expect(evaluateSubmission(input)).toEqual(evaluateSubmission(input));
  });

  test("does not let one evidence record satisfy two requirements of the same type", () => {
    const result = evaluateSubmission({
      quest: {
        ...quest,
        evidenceRequirements: [
          { id: "before", type: "screenshot", required: true },
          { id: "after", type: "screenshot", required: true },
        ],
        expectedArtifactType: undefined,
      },
      evidence: [
        {
          id: "only-before",
          requirementId: "before",
          type: "screenshot",
          fileName: "before.png",
          mimeType: "image/png",
          byteSize: 100,
        },
      ],
      selfReflection: reflection,
    });

    expect(result.verificationStatus).toBe("needs_revision");
    expect(result.hardFailures).toContain("Missing required evidence: after");
  });

  test("rejects duplicate evidence for one requirement", () => {
    const duplicate = { ...githubEvidence, id: "evidence-duplicate" };

    const result = evaluateSubmission({
      quest,
      evidence: [githubEvidence, duplicate],
      selfReflection: reflection,
    });

    expect(result.verificationStatus).toBe("needs_revision");
    expect(result.hardFailures).toContain("Duplicate evidence for requirement: commit");
  });

  test("matches evidence by requirement id regardless of submission order", () => {
    const twoEvidenceQuest: Quest = {
      ...quest,
      evidenceRequirements: [
        { id: "commit", type: "githubCommit", required: true },
        { id: "metric", type: "metricResult", required: true },
      ],
    };
    const metric: EvidenceRecord = {
      id: "evidence-metric",
      requirementId: "metric",
      type: "metricResult",
      metricName: "f1",
      metricValue: 0.82,
    };

    expect(
      evaluateSubmission({
        quest: twoEvidenceQuest,
        evidence: [githubEvidence, metric],
        selfReflection: reflection,
      }),
    ).toEqual(
      evaluateSubmission({
        quest: twoEvidenceQuest,
        evidence: [metric, githubEvidence],
        selfReflection: reflection,
      }),
    );
  });
});
