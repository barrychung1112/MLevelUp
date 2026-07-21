import { describe, expect, it } from "vitest";

import { createTrainingSeed } from "@/mocks/training/seed";

import { buildDailyQuestGenerationContext } from "./daily-quest-context";

describe("buildDailyQuestGenerationContext", () => {
  it("returns bounded capability and history context without private URLs", () => {
    const state = createTrainingSeed("2026-07-20T12:00:00.000Z");
    state.progress.skills.engineering.score = 5;
    state.progress.skills.communication.score = 7;
    state.artifacts = [
      {
        id: "artifact-1",
        submissionId: "submission-private",
        assignmentId: "assignment-private",
        artifactType: "githubRepository",
        title: "Private project",
        description: "Private details",
        artifactUrl: "https://github.com/private/repository",
        skillTags: ["engineering"],
        qualityScore: 80,
        verificationStatus: "verified",
        createdAt: "2026-07-20T12:00:00.000Z",
      },
    ];

    const context = buildDailyQuestGenerationContext(state);

    expect(context.difficultyCeiling).toBe(2);
    expect(context.weakestSkills).toEqual(["engineering", "communication"]);
    expect(context.recentDailyQuests.length).toBeLessThanOrEqual(7);
    expect(context.availableResources.length).toBeLessThanOrEqual(10);
    expect(context.availableResources[0]).not.toHaveProperty("url");
    expect(context.portfolioArtifactCounts).toEqual({ githubRepository: 1 });
    expect(JSON.stringify(context)).not.toContain("private/repository");
    expect(JSON.stringify(context)).not.toContain("Private details");
  });
});
