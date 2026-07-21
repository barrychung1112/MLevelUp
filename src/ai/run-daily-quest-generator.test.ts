import { describe, expect, it, vi } from "vitest";

import { buildDailyQuestGenerationContext } from "./daily-quest-context";
import type { AiConfig } from "./config";
import type { StructuredResponseGateway } from "./openai-gateway";
import { runDailyQuestGenerator } from "./run-daily-quest-generator";
import { createTrainingSeed } from "@/mocks/training/seed";
import { validGeneratedProposal } from "@/test/fixtures/generated-daily-quest";

const config: AiConfig = { apiKey: "test", model: "gpt-test", promptVersion: "daily-v1" };

describe("runDailyQuestGenerator", () => {
  it("returns a validated proposal and one completed diagnostic", async () => {
    const generate = vi.fn().mockResolvedValue({
      data: validGeneratedProposal, responseId: "response-1", model: "gpt-test",
      inputTokens: 100, outputTokens: 200,
    });
    const context = buildDailyQuestGenerationContext(createTrainingSeed("2026-07-20T12:00:00.000Z"));

    const result = await runDailyQuestGenerator({
      config, gateway: { generate } as StructuredResponseGateway, context,
      traceId: "trace-1", nowMs: () => 20,
    });

    expect(result).toMatchObject({ ok: true, proposal: validGeneratedProposal });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][0]).toMatchObject({ schemaName: "generated_daily_quest", maxAttempts: 1 });
    expect(result.diagnostic).toMatchObject({ status: "completed", fallbackUsed: false, traceId: "trace-1" });
  });

  it("degrades without calling the model when configuration is missing", async () => {
    const generate = vi.fn();
    const context = buildDailyQuestGenerationContext(createTrainingSeed("2026-07-20T12:00:00.000Z"));

    const result = await runDailyQuestGenerator({
      config: null, gateway: { generate } as StructuredResponseGateway, context, traceId: "trace-2",
    });

    expect(result).toMatchObject({ ok: false, errorCode: "missing_configuration" });
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects a structurally valid proposal that violates policy", async () => {
    const generate = vi.fn().mockResolvedValue({
      data: { ...validGeneratedProposal, difficulty: 5 }, responseId: "response-2", model: "gpt-test",
      inputTokens: 100, outputTokens: 200,
    });
    const context = buildDailyQuestGenerationContext(createTrainingSeed("2026-07-20T12:00:00.000Z"));

    const result = await runDailyQuestGenerator({
      config, gateway: { generate } as StructuredResponseGateway, context, traceId: "trace-3",
    });

    expect(result).toMatchObject({ ok: false, errorCode: "over_difficulty_ceiling" });
  });
});
