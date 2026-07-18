import { describe, expect, it } from "vitest";

import { evaluateSubmission } from "@/domain/training/evaluate-submission";
import { createTrainingSeed } from "@/mocks/training/seed";

import { buildAgentContext } from "./context";

describe("buildAgentContext", () => {
  it("builds bounded context without identity or secret fields", () => {
    const now = "2026-07-18T18:00:00.000Z";
    const state = createTrainingSeed(now);
    const assignment = Object.values(state.assignments)[0];
    const quest = state.quests[assignment.questId];
    const input = {
      idempotencyKey: "submission-key",
      assignmentId: assignment.id,
      evidence: [{
        id: "evidence-1",
        requirementId: quest.evidenceRequirements[0].id,
        type: quest.evidenceRequirements[0].type,
        text: `safe evidence ${"x".repeat(2_000)}`,
      }],
      selfReflection: `reflection ${"y".repeat(6_000)}`,
    };
    const evaluation = evaluateSubmission({
      quest,
      evidence: input.evidence,
      selfReflection: input.selfReflection,
    });

    const context = buildAgentContext({ state, assignment, quest, input, evaluation });
    const serialized = JSON.stringify(context);

    expect(context.targetRole).toBe("machine-learning-engineer");
    expect(context.dailyMinutes).toBe(300);
    expect(context.skills).toHaveProperty("modeling");
    expect(context.currentQuest.id).toBe(quest.id);
    expect(context.evidence[0].text?.length).toBeLessThanOrEqual(500);
    expect(context.selfReflection.length).toBeLessThanOrEqual(2_000);
    expect(context.recentOutcomes.total).toBeLessThanOrEqual(10);
    expect(context.eligibleQuests.length).toBeLessThanOrEqual(20);
    expect(context.availableResources.length).toBeLessThanOrEqual(12);
    expect(serialized).not.toContain("accessToken");
    expect(serialized).not.toContain("@example.com");
    expect(serialized).not.toContain("submission-key");
  });

  it("excludes unavailable resources and quests that depend on them", () => {
    const now = "2026-07-18T18:00:00.000Z";
    const state = createTrainingSeed(now);
    const assignment = Object.values(state.assignments)[0];
    const quest = state.quests[assignment.questId];
    const unavailable = state.resources[0];
    unavailable.availabilityStatus = "unavailable";
    const blockedQuest = Object.values(state.quests).find(
      (candidate) => candidate.id !== quest.id,
    );
    if (!blockedQuest) throw new Error("missing eligible quest fixture");
    blockedQuest.resourceIds = [unavailable.id];
    const input = {
      idempotencyKey: "submission-key",
      assignmentId: assignment.id,
      evidence: [],
      selfReflection: "A bounded reflection.",
    };
    const evaluation = evaluateSubmission({
      quest,
      evidence: input.evidence,
      selfReflection: input.selfReflection,
    });

    const context = buildAgentContext({ state, assignment, quest, input, evaluation });

    expect(context.availableResources.map((resource) => resource.id)).not.toContain(
      unavailable.id,
    );
    expect(context.eligibleQuests.map((candidate) => candidate.id)).not.toContain(
      blockedQuest.id,
    );
  });
});
