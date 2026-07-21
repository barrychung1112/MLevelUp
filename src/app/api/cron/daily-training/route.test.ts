import { describe, expect, test, vi } from "vitest";

import { GET, POST, createDailyTrainingHandler } from "./route";
import { processDailyTrainingLearner } from "./route";
import { createTrainingSeed } from "@/mocks/training/seed";
import { validGeneratedProposal } from "@/test/fixtures/generated-daily-quest";

const diagnostic = {
  agentType: "learningStrategist" as const, status: "completed" as const, model: "gpt-test",
  promptVersion: "daily-v1", latencyMs: 10, inputTokens: 10, outputTokens: 20,
  errorCode: null, fallbackUsed: false, traceId: "trace-1", inputSummary: {}, outputSummary: {},
};

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
      run: vi.fn().mockResolvedValue({
        processed: 3, assigned: 2, aiGenerated: 1, catalogFallback: 1,
        degraded: 1, skipped: 1, failures: 0,
      }),
    });

    const response = await post(new Request("http://test/api/cron/daily-training", {
      method: "POST", headers: { authorization: "Bearer secret" },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      processed: 3, assigned: 2, aiGenerated: 1, catalogFallback: 1,
      degraded: 1, skipped: 1, failures: 0,
    });
  });
});

describe("processDailyTrainingLearner", () => {
  test("persists an accepted private AI quest and its diagnostic", async () => {
    const state = createTrainingSeed("2026-07-20T12:00:00.000Z");
    state.assignments = {};
    const persistGenerated = vi.fn();
    const persistCatalog = vi.fn();
    const persistDiagnostic = vi.fn();
    let id = 0;

    const result = await processDailyTrainingLearner({
      userId: "user-1", state, now: "2026-07-20T12:00:00.000Z", localDate: "2026-07-20",
      nextId: () => `id-${++id}`,
      generator: vi.fn().mockResolvedValue({ ok: true, proposal: validGeneratedProposal, diagnostic }),
      persistGenerated, persistCatalog, persistDiagnostic,
    });

    expect(result).toEqual({ status: "ai_generated", degraded: false });
    expect(persistGenerated).toHaveBeenCalledOnce();
    expect(persistCatalog).not.toHaveBeenCalled();
    expect(persistDiagnostic).toHaveBeenCalledWith(diagnostic);
  });

  test("persists a catalog fallback and degraded diagnostic", async () => {
    const state = createTrainingSeed("2026-07-20T12:00:00.000Z");
    state.assignments = {};
    const persistGenerated = vi.fn();
    const persistCatalog = vi.fn();
    const persistDiagnostic = vi.fn();

    const result = await processDailyTrainingLearner({
      userId: "user-1", state, now: "2026-07-20T12:00:00.000Z", localDate: "2026-07-20",
      nextId: () => "fallback-id",
      generator: vi.fn().mockResolvedValue({
        ok: false, errorCode: "missing_configuration",
        diagnostic: { ...diagnostic, status: "degraded", errorCode: "missing_configuration", fallbackUsed: true },
      }),
      persistGenerated, persistCatalog, persistDiagnostic,
    });

    expect(result).toEqual({ status: "catalog_fallback", degraded: true });
    expect(persistCatalog).toHaveBeenCalledOnce();
    expect(persistGenerated).not.toHaveBeenCalled();
    expect(persistDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "missing_configuration" }));
  });
});
