import { describe, expect, test } from "vitest";

import { generateDailyTraining } from "./generate-daily-training";
import { createTrainingSeed } from "@/mocks/training/seed";

const now = "2026-07-18T09:00:00.000Z";
const localDate = "2026-07-18";

function stateWithoutDaily() {
  const state = createTrainingSeed(now);
  for (const [id, assignment] of Object.entries(state.assignments)) {
    if (state.quests[assignment.questId]?.scope === "daily") delete state.assignments[id];
  }
  return state;
}

describe("generateDailyTraining", () => {
  test("preserves an active mainline and assigns exactly one mission-ready daily quest", () => {
    const state = stateWithoutDaily();
    const mainline = Object.values(state.assignments).find((assignment) => state.quests[assignment.questId]?.scope === "main")!;

    const result = generateDailyTraining({ state, now, localDate, nextId: () => "assignment-daily-1" });

    expect(result.reason).toBe("assigned");
    expect(result.createdAssignment).toMatchObject({ id: "assignment-daily-1", slot: "secondary", assignedDate: localDate });
    expect(result.state.assignments[mainline.id]).toEqual(mainline);
  });

  test("does not add a daily quest while penalty debt is open", () => {
    const state = stateWithoutDaily();
    state.assignments["assignment-penalty"] = {
      id: "assignment-penalty", questId: "quest-penalty-daily", assignedDate: localDate,
      slot: "secondary", status: "assigned", assignedAt: now,
    };

    expect(generateDailyTraining({ state, now, localDate, nextId: () => "unused" }).reason).toBe("penalty_priority");
  });

  test("returns resource_gap instead of assigning an unverifiable mission", () => {
    const state = stateWithoutDaily();
    state.resources = state.resources.map((resource) => ({ ...resource, availabilityStatus: "unavailable" as const }));

    expect(generateDailyTraining({ state, now, localDate, nextId: () => "unused" }).reason).toBe("resource_gap");
  });
});
