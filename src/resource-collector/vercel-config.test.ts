import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

describe("Phase 4 Vercel schedules", () => {
  test("runs resource collection before daily training", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8"));
    expect(config.crons).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "/api/cron/resources", schedule: "0 9 * * *" }),
      expect.objectContaining({ path: "/api/cron/daily-training", schedule: "20 9 * * *" }),
    ]));
  });
});
