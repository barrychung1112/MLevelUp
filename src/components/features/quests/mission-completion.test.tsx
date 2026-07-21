import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { MissionCompletion } from "./mission-completion";

describe("MissionCompletion", () => {
  test("shows actionable feedback, growth, and the next mission link", () => {
    render(
      <MissionCompletion
        qualityScore={88}
        feedback={{
          summary: "The evidence is complete and reproducible.",
          provenance: "Demo",
          strengths: ["The validation metric is measurable."],
          improvements: ["Add one more validation seed."],
          nextActions: ["Compare variance across three seeds."],
          xpAwarded: 40,
          skillGrowth: [{ label: "Evaluation", delta: 1.4 }],
        }}
        nextAssignmentId="assignment-next"
      />,
    );

    expect(screen.getByText("88 / 100")).toBeVisible();
    expect(screen.getByText("+40 XP")).toBeVisible();
    expect(screen.getByText("The validation metric is measurable.")).toBeVisible();
    expect(screen.getByText("Add one more validation seed.")).toBeVisible();
    expect(screen.getByText("Evaluation +1.4")).toBeVisible();
    expect(screen.getByRole("link", { name: "Continue to next mission" })).toHaveAttribute(
      "href",
      "/quests/assignment-next",
    );
  });
});

