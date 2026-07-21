import { describe, expect, it, vi } from "vitest";

import type { DailyQuestGeneratorResult } from "@/ai/run-daily-quest-generator";
import { createTrainingSeed } from "@/mocks/training/seed";
import { validGeneratedProposal } from "@/test/fixtures/generated-daily-quest";

import { generateAiDailyTraining } from "./generate-ai-daily-training";

const NOW = "2026-07-20T12:00:00.000Z";
const DATE = "2026-07-20";
const diagnostic = {
  agentType: "learningStrategist" as const, status: "completed" as const, model: "gpt-test",
  promptVersion: "daily-v1", latencyMs: 20, inputTokens: 10, outputTokens: 20,
  errorCode: null, fallbackUsed: false, traceId: "trace-1", inputSummary: {}, outputSummary: {},
};

describe("generateAiDailyTraining", () => {
  it("creates trusted quest fields and a 24-hour assignment from accepted AI output", async () => {
    const state = createTrainingSeed(NOW);
    state.assignments = {};
    const generator = vi.fn().mockResolvedValue({ ok: true, proposal: validGeneratedProposal, diagnostic } satisfies DailyQuestGeneratorResult);
    let id = 0;

    const outcome = await generateAiDailyTraining({ state, now: NOW, localDate: DATE, nextId: () => `id-${++id}`, generator });

    expect(outcome).toMatchObject({ source: "ai_generated", reason: "assigned" });
    expect(outcome.createdQuest).toMatchObject({
      id: "id-1", title: validGeneratedProposal.title, purpose: "training", scope: "daily",
      durationDays: 1, optional: false, trainingContract: "standard",
    });
    expect(outcome.createdAssignment).toMatchObject({ id: "id-2", questId: "id-1", dueAt: "2026-07-21T12:00:00.000Z" });
  });

  it("uses catalog fallback when AI generation degrades", async () => {
    const state = createTrainingSeed(NOW);
    state.assignments = {};
    const generator = vi.fn().mockResolvedValue({
      ok: false, errorCode: "missing_configuration", diagnostic: { ...diagnostic, status: "degraded", fallbackUsed: true },
    } satisfies DailyQuestGeneratorResult);

    const outcome = await generateAiDailyTraining({ state, now: NOW, localDate: DATE, nextId: () => "fallback-assignment", generator });

    expect(outcome).toMatchObject({ source: "catalog_fallback", fallbackReason: "missing_configuration" });
    expect(outcome.createdQuest).toBeUndefined();
    expect(outcome.createdAssignment?.questId).toMatch(/^quest-standard-/u);
  });

  it("does not call AI when a daily assignment already exists", async () => {
    const state = createTrainingSeed(NOW);
    const generator = vi.fn();

    const outcome = await generateAiDailyTraining({ state, now: NOW, localDate: DATE, nextId: () => "unused", generator });

    expect(outcome).toMatchObject({ source: "none", reason: "already_assigned" });
    expect(generator).not.toHaveBeenCalled();
  });

  it("does not call AI while an open penalty exists", async () => {
    const state = createTrainingSeed(NOW);
    state.assignments = {
      penalty: { id: "penalty", questId: "quest-penalty-daily", assignedDate: DATE, slot: "secondary", status: "assigned", assignedAt: NOW },
    };
    const generator = vi.fn();

    const outcome = await generateAiDailyTraining({ state, now: NOW, localDate: DATE, nextId: () => "unused", generator });

    expect(outcome).toMatchObject({ source: "none", reason: "penalty_priority" });
    expect(generator).not.toHaveBeenCalled();
  });
});
