import { describe, expect, test, vi } from "vitest";

import { createArxivSource } from "./arxiv-source";

describe("arXiv resource source", () => {
  test("maps an Atom entry into a bounded paper candidate", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(`<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <id>http://arxiv.org/abs/2401.00001v2</id>
          <title> Reliable ML Evaluation </title>
          <summary> A practical paper about validation. </summary>
          <published>2026-07-01T00:00:00Z</published>
          <updated>2026-07-10T00:00:00Z</updated>
        </entry>
      </feed>`, { status: 200 }));
    const source = createArxivSource(fetcher);

    await expect(source.search({ query: "evaluation", limit: 2 })).resolves.toEqual([
      expect.objectContaining({
        source: "arxiv",
        externalId: "2401.00001",
        resourceType: "paper",
        title: "Reliable ML Evaluation",
      }),
    ]);
  });
});
