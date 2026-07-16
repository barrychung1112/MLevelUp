import { describe, expect, test } from "vitest";

import { SKILL_KEYS, TRAINING_CONTRACTS } from "./constants";

describe("training constants", () => {
  test("defines the seven camelCase ML engineering skills", () => {
    expect(SKILL_KEYS).toEqual([
      "dataHandling",
      "modeling",
      "evaluation",
      "engineering",
      "researchSense",
      "productThinking",
      "communication",
    ]);
  });

  test("defines the three approved training contracts", () => {
    expect(Object.keys(TRAINING_CONTRACTS)).toEqual([
      "foundation",
      "standard",
      "intensive",
    ]);
  });
});
