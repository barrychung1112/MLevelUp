import { describe, expect, it } from "vitest";

import { validateAchievementBullets } from "./grounding-validator";

const facts = [
  { ref: "quest:step:1", value: "Compared 3 validation strategies" },
  { ref: "metric:accuracy", value: "Validation accuracy: 88%" },
  { ref: "artifact:language", value: "Python" },
];

const validBullets = [
  { text: "Compared 3 validation strategies.", sourceRefs: ["quest:step:1"] },
  { text: "Recorded 88% validation accuracy.", sourceRefs: ["metric:accuracy"] },
  { text: "Implemented the experiment in Python.", sourceRefs: ["artifact:language"] },
];

describe("validateAchievementBullets", () => {
  it("accepts three to five concise grounded bullets", () => {
    expect(validateAchievementBullets(validBullets, facts)).toEqual({
      ok: true,
      bullets: validBullets,
    });
  });

  it.each([
    [validBullets.slice(0, 2), "bullet_count"],
    [[...validBullets, validBullets[0], validBullets[1], validBullets[2]], "bullet_count"],
    [[{ text: "x".repeat(161), sourceRefs: ["quest:step:1"] }, ...validBullets.slice(1)], "bullet_length"],
    [[{ text: "No source", sourceRefs: [] }, ...validBullets.slice(1)], "source_required"],
    [[{ text: "Unknown source", sourceRefs: ["unknown"] }, ...validBullets.slice(1)], "unknown_source"],
    [[{ text: "Reached 99% accuracy.", sourceRefs: ["metric:accuracy"] }, ...validBullets.slice(1)], "ungrounded_number"],
    [[validBullets[0], { ...validBullets[0] }, validBullets[2]], "duplicate_bullet"],
    [[{ text: "Owned the GitHub repository.", sourceRefs: ["artifact:language"] }, ...validBullets.slice(1)], "unsupported_claim"],
  ] as const)("rejects invalid output with %s", (bullets, code) => {
    const result = validateAchievementBullets(bullets, facts);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContainEqual(expect.objectContaining({ code }));
  });
});
