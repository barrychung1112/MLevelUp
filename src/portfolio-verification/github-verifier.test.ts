import { describe, expect, it, vi } from "vitest";

import type { JsonHttpTransport } from "./http-transport";
import { createGitHubVerifier } from "./github-verifier";
import { parsePlatformUrl } from "./platform-url";

function githubUrl(url: string) {
  const parsed = parsePlatformUrl(url);
  if (!parsed.ok || parsed.value.provider !== "github") {
    throw new Error("Expected a GitHub URL");
  }
  return parsed.value;
}

function transportReturning(
  result: Awaited<ReturnType<JsonHttpTransport["request"]>>,
): JsonHttpTransport {
  return { request: vi.fn(async () => result) };
}

describe("GitHub verifier", () => {
  it("constructs the fixed repository endpoint and allowlists metadata", async () => {
    const transport = transportReturning({
      kind: "response",
      status: 200,
      body: {
        full_name: "openai/openai-node",
        description: "Official JavaScript library",
        default_branch: "master",
        language: "TypeScript",
        topics: ["openai", "typescript"],
        visibility: "public",
        archived: false,
        pushed_at: "2026-07-19T10:00:00Z",
        owner: { email: "private@example.com" },
        secret: "must-not-leak",
      },
    });
    const verifier = createGitHubVerifier({ transport, token: "server-token" });

    const result = await verifier.verify(
      githubUrl("https://github.com/openai/openai-node"),
    );

    expect(transport.request).toHaveBeenCalledWith({
      url: "https://api.github.com/repos/openai/openai-node",
      headers: expect.objectContaining({
        Accept: "application/vnd.github+json",
        Authorization: "Bearer server-token",
      }),
    });
    expect(result).toEqual({
      status: "verified",
      metadata: {
        fullName: "openai/openai-node",
        description: "Official JavaScript library",
        defaultBranch: "master",
        primaryLanguage: "TypeScript",
        topics: ["openai", "typescript"],
        visibility: "public",
        archived: false,
        pushedAt: "2026-07-19T10:00:00Z",
      },
    });
    expect(JSON.stringify(result)).not.toContain("private@example.com");
    expect(JSON.stringify(result)).not.toContain("must-not-leak");
  });

  it("constructs the fixed commit endpoint and excludes email and message body", async () => {
    const transport = transportReturning({
      kind: "response",
      status: 200,
      body: {
        sha: "a1b2c3d4",
        commit: {
          message: "Add safe verifier\n\nInternal implementation details",
          author: {
            date: "2026-07-19T11:00:00Z",
            email: "private@example.com",
          },
          verification: { verified: true, reason: "valid", signature: "secret" },
        },
        author: { login: "octocat" },
        files: [{ patch: "private patch" }],
      },
    });
    const verifier = createGitHubVerifier({ transport });

    const result = await verifier.verify(
      githubUrl(
        "https://github.com/openai/openai-node/commit/a1b2c3d4",
      ),
    );

    expect(transport.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.github.com/repos/openai/openai-node/commits/a1b2c3d4",
      }),
    );
    expect(result).toEqual({
      status: "verified",
      metadata: {
        repositoryFullName: "openai/openai-node",
        sha: "a1b2c3d4",
        committedAt: "2026-07-19T11:00:00Z",
        authorLogin: "octocat",
        messageSubject: "Add safe verifier",
        signatureVerified: true,
      },
    });
    expect(JSON.stringify(result)).not.toContain("private@example.com");
    expect(JSON.stringify(result)).not.toContain("private patch");
    expect(JSON.stringify(result)).not.toContain("Internal implementation");
  });

  it.each([
    [{ kind: "response", status: 404, body: {} }, { status: "unavailable", errorCode: "github_not_found" }],
    [{ kind: "response", status: 429, body: {} }, { status: "error", errorCode: "github_rate_limited", retryable: true }],
    [{ kind: "response", status: 500, body: {} }, { status: "error", errorCode: "github_upstream_error", retryable: true }],
    [{ kind: "timeout" }, { status: "error", errorCode: "github_timeout", retryable: true }],
    [{ kind: "redirect" }, { status: "error", errorCode: "github_unexpected_redirect", retryable: true }],
    [{ kind: "too_large" }, { status: "error", errorCode: "github_invalid_response", retryable: true }],
    [{ kind: "invalid_json" }, { status: "error", errorCode: "github_invalid_response", retryable: true }],
  ] as const)("maps provider result %# without leaking its body", async (response, expected) => {
    const verifier = createGitHubVerifier({ transport: transportReturning(response) });

    await expect(
      verifier.verify(githubUrl("https://github.com/openai/openai-node")),
    ).resolves.toEqual(expected);
  });

  it("rejects malformed successful metadata", async () => {
    const verifier = createGitHubVerifier({
      transport: transportReturning({
        kind: "response",
        status: 200,
        body: { full_name: "openai/openai-node", archived: "no" },
      }),
    });

    await expect(
      verifier.verify(githubUrl("https://github.com/openai/openai-node")),
    ).resolves.toEqual({
      status: "error",
      errorCode: "github_invalid_response",
      retryable: true,
    });
  });
});
