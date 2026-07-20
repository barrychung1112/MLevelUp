import { describe, expect, it, vi } from "vitest";

import {
  VerificationConfigurationError,
  createVerifyPortfolioLinkHandler,
} from "./route";

const artifactId = "11111111-1111-4111-8111-111111111111";

function request(body: unknown, token = "token") {
  return new Request("http://localhost/api/portfolio/verify-link", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/portfolio/verify-link", () => {
  it("requires bearer authentication before reading the body", async () => {
    const authenticate = vi.fn();
    const verify = vi.fn();
    const handler = createVerifyPortfolioLinkHandler({ authenticate, verify });

    const response = await handler(
      new Request("http://localhost/api/portfolio/verify-link", {
        method: "POST",
        body: JSON.stringify({ artifactId }),
      }),
    );

    expect(response.status).toBe(401);
    expect(authenticate).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
  });

  it.each([
    "not-json",
    JSON.stringify({ artifactId: "not-a-uuid" }),
    JSON.stringify({ artifactId, url: "https://attacker.example" }),
  ])("rejects malformed or browser-supplied URL payloads", async (body) => {
    const handler = createVerifyPortfolioLinkHandler({
      authenticate: vi.fn(async () => ({ userId: "user-1" })),
      verify: vi.fn(),
    });

    expect((await handler(request(body))).status).toBe(400);
  });

  it("rejects oversized bodies before authentication", async () => {
    const authenticate = vi.fn();
    const handler = createVerifyPortfolioLinkHandler({
      authenticate,
      verify: vi.fn(),
    });

    const response = await handler(request(JSON.stringify({
      artifactId,
      padding: "x".repeat(5_000),
    })));

    expect(response.status).toBe(413);
    expect(authenticate).not.toHaveBeenCalled();
  });

  it("returns a non-disclosing 404 for a foreign or missing artifact", async () => {
    const handler = createVerifyPortfolioLinkHandler({
      authenticate: vi.fn(async () => ({ userId: "user-1" })),
      verify: vi.fn(async () => ({
        ok: false as const,
        reason: "artifact_not_found" as const,
      })),
    });

    const response = await handler(request({ artifactId }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Artifact not found",
      code: "artifact_not_found",
    });
  });

  it("returns the sanitized verification view", async () => {
    const verification = {
      status: "verified" as const,
      provider: "github" as const,
      resourceType: "repository" as const,
      normalizedUrl: "https://github.com/openai/openai-node",
      metadata: { fullName: "openai/openai-node" },
      verifiedAt: "2026-07-20T12:00:00.000Z",
      staleAfter: "2026-08-19T12:00:00.000Z",
    };
    const handler = createVerifyPortfolioLinkHandler({
      authenticate: vi.fn(async () => ({ userId: "user-1" })),
      verify: vi.fn(async () => ({ ok: true as const, verification })),
    });

    const response = await handler(request({ artifactId }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ verification });
  });

  it("maps retryable provider failures and missing configuration", async () => {
    const providerFailure = createVerifyPortfolioLinkHandler({
      authenticate: vi.fn(async () => ({ userId: "user-1" })),
      verify: vi.fn(async () => ({
        ok: true as const,
        verification: {
          status: "error" as const,
          errorCode: "github_timeout",
        },
      })),
    });
    const unavailable = createVerifyPortfolioLinkHandler({
      authenticate: vi.fn(async () => {
        throw new VerificationConfigurationError();
      }),
      verify: vi.fn(),
    });

    expect((await providerFailure(request({ artifactId }))).status).toBe(502);
    expect((await unavailable(request({ artifactId }))).status).toBe(503);
  });
});
