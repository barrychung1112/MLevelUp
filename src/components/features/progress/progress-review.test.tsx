import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ProgressReview } from "./progress-review";

describe("ProgressReview", () => {
  test("keeps exact skill values and chart summaries visible as text", () => {
    render(
      <ProgressReview
        level={7}
        currentXp={320}
        nextLevelXp={500}
        skills={[
          { key: "data", label: "Data Handling", value: 42 },
          { key: "modeling", label: "Modeling", value: 51 },
          { key: "evaluation", label: "Evaluation", value: 63 },
          { key: "engineering", label: "Engineering", value: 47 },
          { key: "research", label: "Research Sense", value: 36 },
          { key: "product", label: "Product Thinking", value: 29 },
          { key: "communication", label: "Communication", value: 55 },
        ]}
        radarSummary="能力雷達摘要：Evaluation 最高 63，Product Thinking 最低 29。"
        trendSummary="四週趨勢摘要：總能力值增加 18 點，本週增加 6 點。"
        trend={[{ label: "Week 1", value: 42 }, { label: "Week 4", value: 60 }]}
      />,
    );

    expect(screen.getByText("42/100")).toBeVisible();
    expect(screen.getByText("63/100")).toBeVisible();
    expect(screen.getByText("29/100")).toBeVisible();
    expect(screen.getByText("能力雷達摘要：Evaluation 最高 63，Product Thinking 最低 29。")).toBeVisible();
    expect(screen.getByText("四週趨勢摘要：總能力值增加 18 點，本週增加 6 點。")).toBeVisible();
    expect(screen.getByRole("img", { name: "Seven-skill radar chart" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Skill growth trend chart" })).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Data Handling" })).toHaveAttribute("aria-valuenow", "42");
    expect(screen.getByRole("progressbar", { name: "Product Thinking" })).toHaveAttribute("aria-valuenow", "29");
  }, 15_000);
});
