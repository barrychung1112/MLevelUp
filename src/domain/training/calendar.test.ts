import { describe, expect, test } from "vitest";

import { calculateNextStreak, localDateForInstant } from "./calendar";

describe("profile-timezone calendar", () => {
  test("keeps a UTC-midnight instant on the prior Los Angeles calendar day", () => {
    expect(
      localDateForInstant(
        "2026-07-16T00:30:00.000Z",
        "America/Los_Angeles",
      ),
    ).toBe("2026-07-15");
  });

  test("increments streak across the Los Angeles midnight boundary", () => {
    expect(
      calculateNextStreak(
        4,
        "2026-07-14",
        "2026-07-16T06:59:00.000Z",
        "America/Los_Angeles",
      ),
    ).toBe(5);
    expect(
      calculateNextStreak(
        5,
        "2026-07-15",
        "2026-07-16T07:01:00.000Z",
        "America/Los_Angeles",
      ),
    ).toBe(6);
  });
});
