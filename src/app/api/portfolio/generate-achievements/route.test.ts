import { describe, expect, it, vi } from "vitest";
import { createGenerateAchievementsHandler, createUpdateAchievementsHandler } from "./route";

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

describe("PATCH /api/portfolio/generate-achievements", () => {
  it("passes only ordered bullet ids/text and the requested action", async () => {
    const update = vi.fn(async () => ({ ok: true as const, status: "approved" as const }));
    const handler = createUpdateAchievementsHandler({ authenticate: vi.fn(async () => ({ userId: "u" })), update });
    const body = { artifactId, action: "approve", bullets: [
      { id: "b1", text: "Compared 3 models." },
      { id: "b2", text: "Recorded 88% accuracy." },
      { id: "b3", text: "Produced a report." },
    ] };
    const response = await handler(new Request("http://localhost", { method: "PATCH", headers: { authorization: "Bearer t" }, body: JSON.stringify(body) }));
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ userId: "u" }, body);
  });
});
