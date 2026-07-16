import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ResourceLibrary } from "./resource-library";

const resources = [
  {
    id: "r1",
    title: "Validation strategy field guide",
    resourceType: "article",
    relevance: 94,
    difficulty: 3,
    freshness: 88,
    credibility: 91,
    estimatedMinutes: 20,
    skillTags: ["Evaluation"],
    url: "https://example.com/resources/validation",
  },
  {
    id: "r2",
    title: "FastAPI model service starter",
    resourceType: "repo",
    relevance: 90,
    difficulty: 4,
    freshness: 96,
    credibility: 87,
    estimatedMinutes: 55,
    skillTags: ["Engineering"],
  },
];

describe("ResourceLibrary", () => {
  test("shows every resource quality field and recovers from an empty filter", async () => {
    render(<ResourceLibrary resources={resources} />);

    expect(screen.getByText("Relevance 94")).toBeVisible();
    expect(screen.getByText("Difficulty 3 / 5")).toBeVisible();
    expect(screen.getByText("Freshness 88")).toBeVisible();
    expect(screen.getByText("Credibility 91")).toBeVisible();
    expect(screen.getByText("20 分鐘")).toBeVisible();
    expect(screen.getByText("article", { selector: "span" })).toBeVisible();
    expect(within(screen.getAllByRole("list", { name: "資源能力標籤" })[0]).getByText("Evaluation")).toBeVisible();
    expect(screen.getByRole("group", { name: "資源篩選" })).toBeVisible();
    expect(screen.getByLabelText("最低相關性")).toBeVisible();
    expect(screen.getByLabelText("資源難度")).toBeVisible();
    expect(screen.getByLabelText("最低新鮮度")).toBeVisible();
    expect(screen.getByLabelText("最低可信度")).toBeVisible();
    expect(screen.getByLabelText("最長預估時間")).toBeVisible();

    fireEvent.change(screen.getByLabelText("資源類型"), { target: { value: "repo" } });
    fireEvent.change(screen.getByLabelText("能力標籤"), { target: { value: "Evaluation" } });
    expect(screen.getByText("沒有符合目前篩選條件的資源")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "清除資源篩選" }));
    expect(screen.getByText("Validation strategy field guide")).toBeVisible();
    expect(screen.getByText("FastAPI model service starter")).toBeVisible();
  }, 15_000);

  test("opens an available source through a protected external link", () => {
    render(<ResourceLibrary resources={resources} />);

    const link = screen.getByRole("link", {
      name: "開啟來源：Validation strategy field guide",
    });
    expect(link).toHaveAttribute("href", "https://example.com/resources/validation");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
    expect(screen.getAllByRole("link")).toHaveLength(1);
  }, 15_000);

  test.each([
    { label: "最低相關性", value: "90", hidden: "Lower relevance workshop" },
    { label: "資源難度", value: "4", hidden: "Validation strategy field guide" },
    { label: "最低新鮮度", value: "90", hidden: "Validation strategy field guide" },
    { label: "最低可信度", value: "90", hidden: "FastAPI model service starter" },
    { label: "最長預估時間", value: "30", hidden: "FastAPI model service starter" },
  ])("applies the $label filter behavior", ({ label, value, hidden }) => {
    const extendedResources = [
      ...resources,
      {
        id: "r3",
        title: "Lower relevance workshop",
        resourceType: "workshop",
        relevance: 79,
        difficulty: 2,
        freshness: 75,
        credibility: 82,
        estimatedMinutes: 110,
        skillTags: ["Modeling"],
      },
    ];
    render(<ResourceLibrary resources={extendedResources} />);

    fireEvent.change(screen.getByLabelText(label), { target: { value } });

    expect(screen.queryByText(hidden)).not.toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThan(0);
  }, 15_000);

  test("renders representative error and empty states", () => {
    const { rerender } = render(
      <ResourceLibrary resources={resources} status="error" errorMessage="資源服務中斷" />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("資源服務中斷");

    rerender(<ResourceLibrary resources={[]} />);
    expect(screen.getByText("目前沒有可用資源。")).toBeVisible();
  }, 15_000);
});
