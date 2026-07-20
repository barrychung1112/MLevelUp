import { describe, expect, it, vi } from "vitest";
import { createGenerateAchievementsHandler } from "./route";

const artifactId = "11111111-1111-4111-8111-111111111111";

describe("POST /api/portfolio/generate-achievements", () => {
  it("requires auth and rejects browser supplied facts", async () => {
    const generate = vi.fn();
    const handler = createGenerateAchievementsHandler({ authenticate: vi.fn(), generate });
    expect((await handler(new Request("http://localhost", { method: "POST", body: "{}" }))).status).toBe(401);
    const authed = createGenerateAchievementsHandler({ authenticate: vi.fn(async () => ({ userId: "u" })), generate });
    const response = await authed(new Request("http://localhost", { method: "POST", headers: { authorization: "Bearer t" }, body: JSON.stringify({ artifactId, replaceExistingDraft: false, facts: [] }) }));
    expect(response.status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });

  it("returns a private generated draft", async () => {
    const draft = { artifactId, userId: "u", status: "draft" as const, sourceFingerprint: "a".repeat(64), model: "gpt-test", promptVersion: "v1", bullets: [{ id: "b1", text: "Built a model.", source_refs: ["artifact:type"] }] };
    const handler = createGenerateAchievementsHandler({ authenticate: vi.fn(async () => ({ userId: "u" })), generate: vi.fn(async () => ({ ok: true as const, draft })) });
    const response = await handler(new Request("http://localhost", { method: "POST", headers: { authorization: "Bearer t" }, body: JSON.stringify({ artifactId, replaceExistingDraft: false }) }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ draft });
  });
});
