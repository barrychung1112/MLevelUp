import { describe, expect, it, vi } from "vitest";

import { createBoundedJsonHttpTransport } from "./http-transport";

describe("createBoundedJsonHttpTransport", () => {
  it("uses manual redirects and returns parsed JSON within the byte limit", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const transport = createBoundedJsonHttpTransport({ fetchImpl });

    await expect(
      transport.request({ url: "https://api.github.com/repos/openai/openai-node" }),
    ).resolves.toMatchObject({ kind: "response", status: 200, body: { ok: true } });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.github.com/repos/openai/openai-node",
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("rejects redirects without following them", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 302 }));
    const transport = createBoundedJsonHttpTransport({ fetchImpl });

    await expect(
      transport.request({ url: "https://api.github.com/repos/openai/openai-node" }),
    ).resolves.toEqual({ kind: "redirect" });
  });

  it("rejects responses larger than the configured byte limit", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: "x".repeat(100) }), { status: 200 }),
    );
    const transport = createBoundedJsonHttpTransport({
      fetchImpl,
      maxBytes: 32,
    });

    await expect(
      transport.request({ url: "https://api.github.com/repos/openai/openai-node" }),
    ).resolves.toEqual({ kind: "too_large" });
  });
});
