import { describe, expect, test, vi } from "vitest";

import { createResourceCollectionHandler } from "./route";

describe("resource collection cron handler", () => {
  test("rejects a missing cron secret before collection begins", async () => {
    const run = vi.fn();
    const post = createResourceCollectionHandler({ cronSecret: "secret", run });

    const response = await post(new Request("http://test/api/cron/resources", { method: "POST" }));

    expect(response.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  test("returns a sanitized collection summary for an authorized scheduler", async () => {
    const post = createResourceCollectionHandler({
      cronSecret: "secret",
      run: vi.fn().mockResolvedValue({ status: "completed", inserted: 2, updated: 1, duplicates: 3, rejected: 0, replayed: false, sourceFailures: [] }),
    });

    const response = await post(new Request("http://test/api/cron/resources", {
      method: "POST", headers: { authorization: "Bearer secret" },
    }));

    await expect(response.json()).resolves.toEqual({ status: "completed", inserted: 2, updated: 1, duplicates: 3, rejected: 0, replayed: false, degradedSources: 0 });
  });
});
