import { describe, expect, it } from "vitest";

import { adjusterInstructions } from "./adjuster";
import { coordinatorInstructions } from "./coordinator";
import { learningStrategistInstructions } from "./learning-strategist";
import { portfolioAchievementInstructions } from "./portfolio-achievements";
import { resourceCuratorInstructions } from "./resource-curator";

const forbiddenAuthorityTerms = [
  "XP",
  "assignment status",
  "deadline",
  "penalty",
  "recovery",
  "reset",
];

describe("versioned Phase 3 prompts", () => {
  it.each([
    ["learning strategist", learningStrategistInstructions],
    ["adjuster", adjusterInstructions],
    ["coordinator", coordinatorInstructions],
  ])("states authority boundaries for the %s", (_, buildInstructions) => {
    const instructions = buildInstructions("phase3-v1");

    expect(instructions).toContain("phase3-v1");
    for (const term of forbiddenAuthorityTerms) {
      expect(instructions).toContain(term);
    }
    expect(instructions).toContain("Do not");
  });

  it("prevents the strategist from inventing catalog entries", () => {
    const instructions = learningStrategistInstructions("phase3-v1");
    expect(instructions).toContain("eligible quest ID");
    expect(instructions).toContain("available resource");
  });

  it.each([
    ["learning strategist", learningStrategistInstructions],
    ["adjuster", adjusterInstructions],
    ["coordinator", coordinatorInstructions],
    ["resource curator", resourceCuratorInstructions],
    ["portfolio achievements", portfolioAchievementInstructions],
  ])("requires natural English output from the %s", (_, buildInstructions) => {
    expect(buildInstructions("phase3-en-v1")).toContain(
      "Write every user-visible prose field in natural English only.",
    );
  });
});
