import { describe, expect, test, vi } from "vitest";

import { GET, POST, createDailyTrainingHandler } from "./route";

describe("daily training cron handler", () => {
  test("exports GET for Vercel Cron and POST for manual smoke tests", () => {
    expect(GET).toBe(POST);
  });

  test("rejects an invalid cron secret before processing learners", async () => {
    const run = vi.fn();
    const post = createDailyTrainingHandler({ cronSecret: "secret", run });

    const response = await post(new Request("http://test/api/cron/daily-training", { method: "POST" }));

    expect(response.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  test("returns only aggregate processing counts to an authorized scheduler", async () => {
    const post = createDailyTrainingHandler({
      cronSecret: "secret",
      run: vi.fn().mockResolvedValue({ processed: 3, assigned: 1, skipped: 2, failures: 0 }),
    });

    const response = await post(new Request("http://test/api/cron/daily-training", {
      method: "POST", headers: { authorization: "Bearer secret" },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ processed: 3, assigned: 1, skipped: 2, failures: 0 });
  });
});
