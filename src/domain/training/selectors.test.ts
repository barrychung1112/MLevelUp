import { describe, expect, test } from "vitest";

import { createTrainingSeed } from "@/mocks/training/seed";

import {
  selectAssignmentsForDate,
  selectPrimaryAssignment,
} from "./selectors";

describe("training selectors", () => {
  test("returns the daily plan in slot order", () => {
    const state = createTrainingSeed("2026-07-16T16:00:00.000Z");

    expect(
      selectAssignmentsForDate(state, "2026-07-16").map((item) => item.slot),
    ).toEqual(["primary", "optional"]);
  });

  test("returns the primary assignment with its quest", () => {
    const state = createTrainingSeed("2026-07-16T16:00:00.000Z");

    const result = selectPrimaryAssignment(state, "2026-07-16");

    expect(result?.assignment.slot).toBe("primary");
    expect(result?.quest.id).toBe(result?.assignment.questId);
  });
});
