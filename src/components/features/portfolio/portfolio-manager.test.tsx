import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PortfolioPublicationState } from "@/portfolio/contracts";
import type { PortfolioArtifactView } from "../view-models";

import { PortfolioManager } from "./portfolio-manager";

const privateArtifacts: readonly PortfolioArtifactView[] = [
  { id: "8a165314-e249-4187-957a-143f80997319", title: "Verified model", artifactType: "modelEvaluationReport", skillKeys: ["modeling", "evaluation"], skillTags: ["Modeling", "Evaluation"], artifactUrl: "https://example.com/report", qualityScore: 88, verificationStatus: "verified", isPrivate: true, summary: "Private verified description" },
  { id: "pending-1", title: "Pending notebook", artifactType: "kaggleNotebook", skillKeys: ["dataHandling"], skillTags: ["Data Handling"], qualityScore: 60, verificationStatus: "pending", isPrivate: true, summary: "Private pending description" },
];

const emptyState: PortfolioPublicationState = { profile: null, artifacts: [] };

function props(state = emptyState) {
  return {
    privateArtifacts,
    publication: state,
    status: "ready" as const,
    commandStatus: "idle" as const,
    onSaveProfile: vi.fn(async () => undefined),
    onSetVisibility: vi.fn(async () => undefined),
    onPublishArtifact: vi.fn(async () => undefined),
    onUnpublishArtifact: vi.fn(async () => undefined),
  };
}

describe("PortfolioManager", () => {
  it("saves profile setup without publishing the portfolio", async () => {
    const callbacks = props();
    render(<PortfolioManager {...callbacks} />);

    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Barry" } });
    fireEvent.change(screen.getByLabelText("Public slug"), { target: { value: "barry-ml" } });
    fireEvent.change(screen.getByLabelText("Headline"), { target: { value: "ML Engineer" } });
    fireEvent.click(screen.getByRole("button", { name: "Save public profile" }));

    expect(callbacks.onSaveProfile).toHaveBeenCalledWith({ slug: "barry-ml", displayName: "Barry", headline: "ML Engineer", bio: "" });
    expect(callbacks.onSetVisibility).not.toHaveBeenCalled();
  });

  it("separates publishable and blocked artifacts without a bypass", () => {
    render(<PortfolioManager {...props()} />);

    expect(screen.getByRole("heading", { name: "Publishable" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Not publishable" })).toBeVisible();
    expect(screen.getByText("Verified model")).toBeVisible();
    const blockedCard = screen.getByText("Pending notebook").closest("li");
    expect(blockedCard).not.toBeNull();
    expect(blockedCard).not.toHaveTextContent("Publish artifact");
  });

  it("publishes only editable public fields", async () => {
    const callbacks = props();
    render(<PortfolioManager {...callbacks} />);
    fireEvent.click(screen.getByRole("button", { name: "Publish artifact: Verified model" }));
    fireEvent.change(screen.getByLabelText("Public summary"), { target: { value: "A reproducible model report with explicit evaluation evidence." } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm publication" }));

    expect(callbacks.onPublishArtifact).toHaveBeenCalledWith({
      artifactId: "8a165314-e249-4187-957a-143f80997319",
      publicTitle: "Verified model",
      publicSummary: "A reproducible model report with explicit evaluation evidence.",
      showArtifactUrl: true,
      featured: false,
      displayOrder: 0,
    });
  });
});
