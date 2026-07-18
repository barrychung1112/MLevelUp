import { describe, expect, it } from "vitest";

import type { Quest, Resource, SkillKey } from "./types";
import {
  evaluateMissionReadiness,
  type MissionReadinessFailure,
} from "./mission-readiness";

const skillKeys: SkillKey[] = [
  "dataHandling",
  "modeling",
  "evaluation",
  "engineering",
  "researchSense",
  "productThinking",
  "communication",
];

const quest: Quest = {
  id: "quest-ready",
  trainingContract: "standard",
  purpose: "training",
  scope: "daily",
  durationDays: 1,
  executionSteps: ["Run the baseline", "Record the validation result"],
  successMetrics: ["Validation score is recorded"],
  outOfScope: [],
  title: "Ready mission",
  summary: "Produce a measured baseline.",
  instructions: "Train and evaluate one baseline.",
  questType: "modelExperiment",
  difficulty: 3,
  estimatedMinutes: 120,
  baseXp: 80,
  optional: false,
  acceptanceCriteria: ["Baseline result is reproducible"],
  evidenceRequirements: [{ id: "metric", type: "metricResult", required: true }],
  reflectionMinChars: 40,
  skillWeights: Object.fromEntries(
    skillKeys.map((key) => [key, key === "modeling" ? 1 : 0]),
  ) as Quest["skillWeights"],
  resourceIds: ["resource-ready"],
};

const resource: Resource = {
  id: "resource-ready",
  title: "Baseline guide",
  summary: "A focused baseline workflow.",
  url: "https://example.com/baseline",
  resourceType: "article",
  difficulty: 2,
  estimatedMinutes: 30,
  skillTags: ["modeling"],
  relevance: 90,
  freshness: 85,
  credibility: 90,
  prerequisites: ["Python basics"],
  requiredTools: ["Python"],
  costTier: "free",
  availabilityStatus: "available",
  lastCheckedAt: "2026-07-18T08:00:00.000Z",
};

const incompleteMissionCases: Array<[MissionReadinessFailure, Partial<Quest>]> = [
  ["steps_required", { executionSteps: [] }],
  ["metrics_required", { successMetrics: [] }],
  ["evidence_required", { evidenceRequirements: [] }],
  ["resource_required", { resourceIds: [] }],
];

describe("mission readiness", () => {
  it("accepts a clear mission with suitable resources inside the time budget", () => {
    expect(evaluateMissionReadiness({ quest, resources: [resource], availableMinutes: 240 })).toEqual({
      ready: true,
      failures: [],
    });
  });

  it.each(incompleteMissionCases)("reports %s when mission requirements are incomplete", (failure, change) => {
    expect(evaluateMissionReadiness({
      quest: { ...quest, ...change },
      resources: [resource],
      availableMinutes: 240,
    })).toMatchObject({ ready: false, failures: [failure] });
  });

  it.each([
    { availabilityStatus: "unavailable" as const },
    { relevance: 59 },
    { credibility: 59 },
    { costTier: "paid" as const },
  ])("rejects an unsuitable referenced resource", (change) => {
    expect(evaluateMissionReadiness({
      quest,
      resources: [{ ...resource, ...change }],
      availableMinutes: 240,
    })).toMatchObject({ ready: false, failures: ["resource_unavailable"] });
  });

  it("rejects a mission when work plus resource time exceeds the budget", () => {
    expect(evaluateMissionReadiness({ quest, resources: [resource], availableMinutes: 149 })).toMatchObject({
      ready: false,
      failures: ["resource_time_exceeded"],
    });
  });

  it("requires a declared fallback resource to be suitable", () => {
    expect(evaluateMissionReadiness({
      quest,
      resources: [
        { ...resource, fallbackResourceId: "resource-fallback" },
        { ...resource, id: "resource-fallback", availabilityStatus: "unchecked" },
      ],
      availableMinutes: 240,
    })).toMatchObject({ ready: false, failures: ["resource_unavailable"] });
  });
});
