import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { PortfolioGallery } from "./portfolio-gallery";
import type { PortfolioArtifactView } from "../view-models";

const artifacts = [
  {
    id: "a1",
    title: "Churn error analysis",
    artifactType: "report",
    skillTags: ["Evaluation"],
    qualityScore: 88,
    verificationStatus: "demo-verified",
    isPrivate: true,
  },
  {
    id: "a2",
    title: "Model API demo",
    artifactType: "deployed-demo",
    skillTags: ["Engineering"],
    qualityScore: 91,
    verificationStatus: "demo-verified",
    isPrivate: true,
  },
] satisfies readonly PortfolioArtifactView[];

describe("PortfolioGallery", () => {
  test("keeps artifacts private and recovers from an empty filter", async () => {
    render(<PortfolioGallery artifacts={artifacts} />);

    expect(screen.getByText("私人作品集")).toBeVisible();
    expect(screen.getAllByText("Private · Demo")).toHaveLength(2);
    expect(screen.getByText("Quality 88 / 100")).toBeVisible();
    expect(screen.getByRole("group", { name: "作品篩選" })).toBeVisible();

    fireEvent.change(screen.getByLabelText("成果類型"), { target: { value: "deployed-demo" } });
    fireEvent.change(screen.getByLabelText("能力標籤"), { target: { value: "Evaluation" } });
    expect(screen.getByText("沒有符合目前篩選條件的作品")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "清除作品篩選" }));
    expect(screen.getByText("Churn error analysis")).toBeVisible();
    expect(screen.getByText("Model API demo")).toBeVisible();
  }, 15_000);

  test("refuses to expose an unsafe non-private artifact at runtime", () => {
    const unsafeArtifacts = [
      { ...artifacts[0], id: "public-1", title: "Should remain hidden", isPrivate: false },
    ] as unknown as readonly PortfolioArtifactView[];

    render(<PortfolioGallery artifacts={unsafeArtifacts} />);

    expect(screen.queryByText("Should remain hidden")).not.toBeInTheDocument();
    expect(screen.getByText("沒有可安全顯示的私人作品。")).toBeVisible();
  }, 15_000);
});
