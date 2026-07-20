import { describe, expect, it } from "vitest";

import { parsePlatformUrl } from "./platform-url";

describe("parsePlatformUrl", () => {
  it.each([
    {
      input: "https://github.com/openai/openai-node.git?tab=readme#usage",
      expected: {
        provider: "github",
        resourceType: "repository",
        normalizedUrl: "https://github.com/openai/openai-node",
        externalId: "openai/openai-node",
        request: { owner: "openai", repo: "openai-node" },
      },
    },
    {
      input: "https://github.com/openai/openai-node/commit/A1b2c3D4",
      expected: {
        provider: "github",
        resourceType: "commit",
        normalizedUrl:
          "https://github.com/openai/openai-node/commit/A1b2c3D4",
        externalId: "A1b2c3D4",
        request: {
          owner: "openai",
          repo: "openai-node",
          sha: "A1b2c3D4",
        },
      },
    },
    {
      input: "https://www.kaggle.com/code/learner/titanic-baseline?scriptVersionId=1",
      expected: {
        provider: "kaggle",
        resourceType: "notebook",
        normalizedUrl:
          "https://www.kaggle.com/code/learner/titanic-baseline",
        externalId: "learner/titanic-baseline",
        request: { owner: "learner", notebook: "titanic-baseline" },
      },
    },
    {
      input: "https://www.kaggle.com/competitions/titanic#overview",
      expected: {
        provider: "kaggle",
        resourceType: "competition",
        normalizedUrl: "https://www.kaggle.com/competitions/titanic",
        externalId: "titanic",
        request: { competition: "titanic" },
      },
    },
  ])("normalizes $input", ({ input, expected }) => {
    expect(parsePlatformUrl(input)).toEqual({ ok: true, value: expected });
  });

  it.each([
    "http://github.com/openai/openai-node",
    "https://user:password@github.com/openai/openai-node",
    "https://github.com:8443/openai/openai-node",
    "https://127.0.0.1/openai/openai-node",
    "https://localhost/openai/openai-node",
    "https://github.com.evil.example/openai/openai-node",
    "https://api.github.com/repos/openai/openai-node",
    "https://githхb.com/openai/openai-node",
    "https://github.com/openai",
    "https://github.com/openai/openai-node/issues/1",
    "https://github.com/openai/openai-node/commit/not-a-sha!",
    "https://www.kaggle.com/datasets/learner/titanic",
    "https://www.kaggle.com/code/learner",
    "https://www.kaggle.com/competitions",
    `https://github.com/${"a".repeat(40)}/repo`,
    `https://github.com/owner/${"r".repeat(101)}`,
    `https://www.kaggle.com/code/owner/${"n".repeat(81)}`,
  ])("rejects unsupported or unsafe URL %s", (input) => {
    expect(parsePlatformUrl(input)).toEqual({
      ok: false,
      reason: "unsupported_url",
    });
  });

  it.each(["", "not a url", "github.com/openai/openai-node"])(
    "rejects malformed input %s",
    (input) => {
      expect(parsePlatformUrl(input)).toEqual({
        ok: false,
        reason: "unsupported_url",
      });
    },
  );
});
