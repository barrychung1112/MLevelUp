import { describe, expect, it, vi } from "vitest";

import { createGeneratedQuestWriter } from "./generated-quest-writer";
import { createTrainingSeed } from "@/mocks/training/seed";

describe("generated quest writer", () => {
  it("calls the atomic RPC with trusted ownership and generation metadata", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ quest_id: "quest-ai", assignment_id: "assignment-ai" }], error: null });
    const state = createTrainingSeed("2026-07-20T12:00:00.000Z");
    const quest = { ...state.quests["quest-standard-report"], id: "quest-ai", resourceIds: [] };
    const assignment = {
      id: "00000000-0000-4000-8000-000000000002", questId: quest.id,
      assignedDate: "2026-07-20", slot: "secondary" as const, status: "assigned" as const,
      assignedAt: "2026-07-20T12:00:00.000Z", dueAt: "2026-07-21T12:00:00.000Z",
    };
    const writer = createGeneratedQuestWriter({ rpc } as never);

    await writer.write({
      userId: "user-1", quest, assignment, generationKey: "daily:2026-07-20",
      model: "gpt-test", promptVersion: "daily-v1", traceId: "trace-1",
    });

    expect(rpc).toHaveBeenCalledWith("create_generated_daily_quest", expect.objectContaining({
      p_user_id: "user-1", p_quest: expect.objectContaining({ id: "quest-ai" }),
      p_assignment_id: assignment.id, p_generation_key: "daily:2026-07-20",
      p_model: "gpt-test", p_prompt_version: "daily-v1", p_trace_id: "trace-1",
    }));
  });

  it("surfaces a sanitized persistence failure", async () => {
    const writer = createGeneratedQuestWriter({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "23505", message: "private database detail" } }),
    } as never);

    const error = await writer.write({ quest: {}, assignment: {} } as never).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: "23505" });
    expect((error as Error).message).not.toContain("private database detail");
  });
});
