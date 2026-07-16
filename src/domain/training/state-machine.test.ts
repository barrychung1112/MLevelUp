import { describe, expect, test } from "vitest";

import type { AssignmentStatus } from "./types";
import { transitionAssignment } from "./state-machine";

describe("quest assignment state machine", () => {
  const allowed: Array<[AssignmentStatus, AssignmentStatus]> = [
    ["assigned", "in_progress"],
    ["assigned", "skipped"],
    ["in_progress", "submitted"],
    ["in_progress", "skipped"],
    ["submitted", "reviewing"],
    ["reviewing", "completed"],
    ["reviewing", "needs_revision"],
    ["reviewing", "rejected"],
    ["needs_revision", "in_progress"],
  ];

  test.each(allowed)("allows %s to transition to %s", (from, to) => {
    expect(transitionAssignment(from, to)).toBe(to);
  });

  test("rejects direct completion", () => {
    expect(() => transitionAssignment("in_progress", "completed")).toThrow(
      /invalid assignment transition/i,
    );
  });

  test.each(["completed", "rejected", "skipped", "expired"] as const)(
    "keeps terminal state %s immutable",
    (status) => {
      expect(() => transitionAssignment(status, "in_progress")).toThrow(
        /terminal/i,
      );
    },
  );
});
