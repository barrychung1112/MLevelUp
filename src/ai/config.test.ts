import { describe, expect, it } from "vitest";

import { readAiConfig, readDailyQuestAiConfig } from "./config";

describe("readAiConfig", () => {
  it("returns null when the server API key is missing", () => {
    expect(readAiConfig({})).toBeNull();
  });

  it("uses safe defaults with a server API key", () => {
    expect(readAiConfig({ OPENAI_API_KEY: "test-key" })).toEqual({
      apiKey: "test-key",
      model: "gpt-5.6-terra",
      promptVersion: "phase3-en-v1",
    });
  });

  it("never accepts a public-prefixed API key", () => {
    expect(
      readAiConfig({ NEXT_PUBLIC_OPENAI_API_KEY: "public-key" }),
    ).toBeNull();
  });
});

describe("readDailyQuestAiConfig", () => {
  it("uses an independent generation prompt version", () => {
    expect(readDailyQuestAiConfig({ OPENAI_API_KEY: "test-key" })).toEqual({
      apiKey: "test-key",
      model: "gpt-5.6-terra",
      promptVersion: "daily-quest-v1",
    });
    expect(readDailyQuestAiConfig({
      OPENAI_API_KEY: "test-key",
      OPENAI_DAILY_QUEST_PROMPT_VERSION: "daily-quest-v2",
    })?.promptVersion).toBe("daily-quest-v2");
  });
});
