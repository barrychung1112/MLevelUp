import { describe, expect, it, vi } from "vitest";
import type { StructuredResponseGateway } from "@/ai/openai-gateway";

import { generateAchievements } from "./generate-achievements";

const source = {
  artifact: { title: "Model report", artifactType: "report", qualityScore: 88, skillTags: ["evaluation"] },
  quest: { title: "Evaluate", objective: "Compare models", executionSteps: ["Compare 3 models"], successMetrics: ["Record 88% accuracy"] },
  metrics: [{ name: "accuracy", value: "88%" }],
};

describe("generateAchievements", () => {
  it("refuses to overwrite an existing draft without confirmation", async () => {
    const repository = { loadOwnedSource: vi.fn(async () => source), loadDraft: vi.fn(async () => ({ status: "draft" })), saveDraft: vi.fn() };
    const gateway = { generate: vi.fn() };
    await expect(generateAchievements({ repository, gateway, model: "gpt-test", promptVersion: "v1" }, { userId: "u", artifactId: "a", replaceExistingDraft: false })).resolves.toEqual({ ok: false, reason: "draft_exists" });
    expect(gateway.generate).not.toHaveBeenCalled();
    expect(repository.saveDraft).not.toHaveBeenCalled();
  });

  it("persists only a fully grounded structured result", async () => {
    const repository = { loadOwnedSource: vi.fn(async () => source), loadDraft: vi.fn(async () => null), saveDraft: vi.fn(async () => undefined) };
    const gateway = { generate: vi.fn(async () => ({ data: { bullets: [
      { text: "Compared 3 models.", source_refs: ["quest:step:1"] },
      { text: "Recorded 88% accuracy.", source_refs: ["metric:accuracy"] },
      { text: "Produced an evaluation report.", source_refs: ["artifact:type"] },
    ] }, responseId: "r", model: "gpt-test", inputTokens: 10, outputTokens: 20 })) } as unknown as StructuredResponseGateway;
    const result = await generateAchievements({ repository, gateway, model: "gpt-test", promptVersion: "v1", nextId: (() => { let i = 0; return () => `b${++i}`; })() }, { userId: "u", artifactId: "a", replaceExistingDraft: false });
    expect(result.ok).toBe(true);
    expect(repository.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ status: "draft", model: "gpt-test", promptVersion: "v1", bullets: expect.arrayContaining([expect.objectContaining({ id: "b1", source_refs: ["quest:step:1"] })]) }), expect.any(Array));
  });

  it("does not overwrite the previous draft when grounding fails", async () => {
    const repository = { loadOwnedSource: vi.fn(async () => source), loadDraft: vi.fn(async () => ({ status: "draft" })), saveDraft: vi.fn() };
    const gateway = { generate: vi.fn(async () => ({ data: { bullets: [
      { text: "Reached 99% accuracy.", source_refs: ["metric:accuracy"] },
      { text: "Compared 3 models.", source_refs: ["quest:step:1"] },
      { text: "Produced a report.", source_refs: ["artifact:type"] },
    ] }, responseId: "r", model: "gpt-test", inputTokens: 1, outputTokens: 1 })) } as unknown as StructuredResponseGateway;
    const result = await generateAchievements({ repository, gateway, model: "gpt-test", promptVersion: "v1" }, { userId: "u", artifactId: "a", replaceExistingDraft: true });
    expect(result).toEqual(expect.objectContaining({ ok: false, reason: "grounding_failed" }));
    expect(repository.saveDraft).not.toHaveBeenCalled();
  });
});
