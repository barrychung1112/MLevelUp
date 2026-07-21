import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

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
    qualityScore: 86,
    source: "github",
    availabilityStatus: "available",
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
  test("uses one controlled filter object for every change and clear action", () => {
    const onFiltersChange = vi.fn();
    const filters = {
      resourceType: "repo",
      skill: "Evaluation",
      minimumRelevance: 80,
      difficulty: "4",
      minimumFreshness: 90,
      minimumCredibility: 80,
      maximumMinutes: 60,
    };

    render(
      <ResourceLibrary
        resources={resources}
        filters={filters}
        onFiltersChange={onFiltersChange}
      />,
    );

    expect(screen.getByLabelText("Resource type")).toHaveValue("repo");
    expect(screen.getByLabelText("Skill tag")).toHaveValue("Evaluation");
    expect(screen.getByLabelText("Minimum relevance")).toHaveValue("80");
    expect(screen.getByLabelText("Difficulty")).toHaveValue("4");
    expect(screen.getByLabelText("Minimum freshness")).toHaveValue("90");
    expect(screen.getByLabelText("Minimum credibility")).toHaveValue("80");
    expect(screen.getByLabelText("Maximum time")).toHaveValue("60");
    expect(screen.getByText("No resources match these filters")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Minimum credibility"), {
      target: { value: "90" },
    });
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      ...filters,
      minimumCredibility: 90,
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear Resource Filters" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      resourceType: "all",
      skill: "all",
      minimumRelevance: 0,
      difficulty: "all",
      minimumFreshness: 0,
      minimumCredibility: 0,
      maximumMinutes: 0,
    });
  });

  test("shows every resource quality field and recovers from an empty filter", async () => {
    render(<ResourceLibrary resources={resources} />);

    expect(screen.getByText("Relevance 94")).toBeVisible();
    expect(screen.getByText("Difficulty 3 / 5")).toBeVisible();
    expect(screen.getByText("Freshness 88")).toBeVisible();
    expect(screen.getByText("Credibility 91")).toBeVisible();
    expect(screen.getByText("Quality 86")).toBeVisible();
    expect(screen.getByText("GitHub")).toBeVisible();
    expect(screen.getByText("Available")).toBeVisible();
    expect(screen.getByText("20 minutes")).toBeVisible();
    expect(screen.getByText("article", { selector: "span" })).toBeVisible();
    expect(within(screen.getAllByRole("list", { name: "Resource skill tags" })[0]).getByText("Evaluation")).toBeVisible();
    expect(screen.getByRole("group", { name: "Resource Filters" })).toBeVisible();
    expect(screen.getByLabelText("Minimum relevance")).toBeVisible();
    expect(screen.getByLabelText("Difficulty")).toBeVisible();
    expect(screen.getByLabelText("Minimum freshness")).toBeVisible();
    expect(screen.getByLabelText("Minimum credibility")).toBeVisible();
    expect(screen.getByLabelText("Maximum time")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Resource type"), { target: { value: "repo" } });
    fireEvent.change(screen.getByLabelText("Skill tag"), { target: { value: "Evaluation" } });
    expect(screen.getByText("No resources match these filters")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Clear Resource Filters" }));
    expect(screen.getByText("Validation strategy field guide")).toBeVisible();
    expect(screen.getByText("FastAPI model service starter")).toBeVisible();
  }, 15_000);

  test("opens an available source through a protected external link", () => {
    render(<ResourceLibrary resources={resources} />);

    const link = screen.getByRole("link", {
      name: "Open source: Validation strategy field guide",
    });
    expect(link).toHaveAttribute("href", "https://example.com/resources/validation");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
    expect(screen.getAllByRole("link")).toHaveLength(1);
  }, 15_000);

  test.each([
    { label: "Minimum relevance", value: "90", hidden: "Lower relevance workshop" },
    { label: "Difficulty", value: "4", hidden: "Validation strategy field guide" },
    { label: "Minimum freshness", value: "90", hidden: "Validation strategy field guide" },
    { label: "Minimum credibility", value: "90", hidden: "FastAPI model service starter" },
    { label: "Maximum time", value: "30", hidden: "FastAPI model service starter" },
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
      <ResourceLibrary resources={resources} status="error" errorMessage="Resource service interrupted" />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Resource service interrupted");

    rerender(<ResourceLibrary resources={[]} />);
    expect(screen.getByText("No resources are available.")).toBeVisible();
  }, 15_000);
});
