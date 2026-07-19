import { describe, expect, test, vi } from "vitest";

import { createGitHubSource } from "./github-source";

describe("GitHub resource source", () => {
  test("maps a repository result into a bounded candidate", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        items: [{
          id: 123,
          full_name: "openai/example-repo",
          html_url: "https://github.com/openai/example-repo",
          description: "An MLOps repository.",
          stargazers_count: 500,
          archived: false,
          updated_at: "2026-07-17T00:00:00Z",
          created_at: "2026-01-01T00:00:00Z",
          license: { spdx_id: "MIT" },
        }],
      }), { status: 200 }),
    );
    const source = createGitHubSource(fetcher);

    await expect(source.search({ query: "mlops", limit: 2 })).resolves.toEqual([
      expect.objectContaining({
        source: "github",
        externalId: "123",
        resourceType: "repository",
        title: "openai/example-repo",
      }),
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("q=mlops"),
      expect.any(Object),
    );
  });

  test("rejects an unsuccessful provider response without exposing its body", async () => {
    const source = createGitHubSource(vi.fn().mockResolvedValue(new Response("secret body", { status: 429 })));
    await expect(source.search({ query: "mlops", limit: 2 })).rejects.toMatchObject({ code: "github_http_429" });
  });
});
