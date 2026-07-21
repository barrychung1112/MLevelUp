import { describe, expect, test } from "vitest";

import { NAVIGATION_COPY, SKILL_LABELS } from "./product-copy";

describe("English product copy", () => {
  test("uses the approved navigation labels", () => {
    expect(NAVIGATION_COPY.map((item) => item.label)).toEqual([
      "Command Center",
      "Missions",
      "Resources",
      "Progress",
      "Agent Status",
      "Portfolio",
      "Training Archive",
      "Profile",
    ]);
  });

  test("uses stable English skill labels", () => {
    expect(SKILL_LABELS.dataHandling).toBe("Data Handling");
    expect(SKILL_LABELS.productThinking).toBe("Product Thinking");
  });
});
