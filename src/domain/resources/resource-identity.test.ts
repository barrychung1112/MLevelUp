import { describe, expect, test } from "vitest";

import {
  canonicalizeResourceUrl,
  createResourceIdentity,
} from "./resource-identity";

describe("resource identity", () => {
  test("normalizes GitHub URLs and removes tracking query parameters", () => {
    expect(
      canonicalizeResourceUrl(
        "HTTPS://GitHub.com/openai/example-repo/?utm_source=test#readme",
      ),
    ).toBe("https://github.com/openai/example-repo");
  });

  test("creates a stable source identity and fingerprint", () => {
    expect(
      createResourceIdentity({
        source: "github",
        externalId: "123",
        title: "Example repository",
        url: "https://github.com/openai/example-repo/",
        publishedAt: "2026-07-01T00:00:00.000Z",
      }),
    ).toEqual({
      canonicalUrl: "https://github.com/openai/example-repo",
      source: "github",
      externalId: "123",
      contentFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
  });
});
