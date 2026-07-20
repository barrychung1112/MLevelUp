import { describe, expect, it, vi } from "vitest";

import { verifyPortfolioLink } from "./portfolio-command-client";

describe("verifyPortfolioLink browser command", () => {
  it("sends only the artifact id with bearer authentication", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        verification: { status: "unsupported", errorCode: "unsupported_url" },
      }),
    );

    const result = await verifyPortfolioLink({
      artifactId: "11111111-1111-4111-8111-111111111111",
      accessToken: "access-token",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith("/api/portfolio/verify-link", {
      method: "POST",
      headers: {
        Authorization: "Bearer access-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        artifactId: "11111111-1111-4111-8111-111111111111",
      }),
    });
    expect(result).toEqual({
      ok: true,
      verification: { status: "unsupported", errorCode: "unsupported_url" },
    });
  });

  it("returns a discriminated sanitized failure", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json(
        { error: "Artifact not found", code: "artifact_not_found" },
        { status: 404 },
      ),
    );

    await expect(
      verifyPortfolioLink({
        artifactId: "11111111-1111-4111-8111-111111111111",
        accessToken: "token",
        fetchImpl,
      }),
    ).resolves.toEqual({
      ok: false,
      status: 404,
      code: "artifact_not_found",
    });
  });
});
