import { describe, expect, it } from "vitest";

import { GUIDED_DEMO_SCENARIO } from "./scenario";

describe("GUIDED_DEMO_SCENARIO", () => {
  it("tells the fixed incomplete-to-recovery-to-proof story", () => {
    expect(GUIDED_DEMO_SCENARIO.version).toBe("guided-demo-v1");
    expect(GUIDED_DEMO_SCENARIO.challenger).toMatchObject({ name: "Alex", level: 3 });
    expect(GUIDED_DEMO_SCENARIO.yesterday).toMatchObject({
      completedCheckpoints: 2, totalCheckpoints: 4, status: "expired", xpAwarded: 0,
    });
    expect(GUIDED_DEMO_SCENARIO.penalty).toMatchObject({ status: "completed", xpAwarded: 0, estimatedMinutes: 30 });
    expect(GUIDED_DEMO_SCENARIO.dailyMission).toMatchObject({ title: "Measure validation stability", estimatedMinutes: 60 });
    expect(GUIDED_DEMO_SCENARIO.dailyMission.executionSteps).toHaveLength(3);
    expect(GUIDED_DEMO_SCENARIO.evidence.absoluteDifference).toBeCloseTo(
      Math.abs(GUIDED_DEMO_SCENARIO.evidence.seed11Score - GUIDED_DEMO_SCENARIO.evidence.seed29Score),
    );
    expect(GUIDED_DEMO_SCENARIO.decision).toMatchObject({ verificationStatus: "verified", qualityScore: 88 });
    expect(GUIDED_DEMO_SCENARIO.reward.xpAwarded).toBeGreaterThan(0);
    expect(GUIDED_DEMO_SCENARIO.publicProof.slug).toBe("demo-ml-engineer");
  });
});
