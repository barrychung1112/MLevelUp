import { describe, expect, test } from "vitest";

import { SKILL_KEYS } from "@/domain/training/constants";
import type { ActivityEvent, SkillStats } from "@/domain/training/types";
import { createTrainingSeed } from "@/mocks/training/seed";

import { mapActivity, mapAgent, mapQuest, mapSkills } from "./training-view-models";

const now = "2026-07-16T16:00:00.000Z";

describe("training view-model mapping", () => {
  test("always maps skills in the explicit domain order", () => {
    const state = createTrainingSeed(now);
    state.progress.skills = Object.fromEntries(
      [...SKILL_KEYS].reverse().map((key) => [key, state.progress.skills[key]]),
    ) as SkillStats;

    expect(mapSkills(state).map((skill) => skill.key)).toEqual(SKILL_KEYS);
  });

  test("breaks equal quest-weight ties using the explicit skill order", () => {
    const state = createTrainingSeed(now);
    const assignment = Object.values(state.assignments)[0];
    const quest = structuredClone(state.quests[assignment.questId]);
    for (const key of SKILL_KEYS) quest.skillWeights[key] = 0;
    quest.skillWeights.dataHandling = 0.5;
    quest.skillWeights.engineering = 0.5;

    expect(mapQuest(assignment, quest).primarySkill).toBe("Data Handling");
  });

  test("formats agent and activity timestamps in the supplied profile timezone", () => {
    const state = createTrainingSeed(now);
    const activity: ActivityEvent = {
      id: "activity-time",
      type: "questCompleted",
      sourceId: "assignment-time",
      title: "Completed",
      summary: "Done",
      occurredAt: now,
    };

    const agent = mapAgent(state.agents[0], "America/Los_Angeles");
    const mappedActivity = mapActivity(activity, "America/Los_Angeles");
    expect(agent.lastRun).not.toContain("T");
    expect(agent.lastRun).not.toContain("Z");
    expect(mappedActivity.occurredAt).toBe(agent.lastRun);
  });
});
