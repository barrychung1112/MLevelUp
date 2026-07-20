import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";

import type {
  PortfolioPublicationRepository,
} from "@/portfolio/portfolio-publication-repository";
import type {
  PortfolioPublicationState,
} from "@/portfolio/contracts";

import {
  PortfolioPublicationProvider,
  usePortfolioPublication,
  type PortfolioPublicationContextValue,
} from "./portfolio-publication-provider";

class FakeRepository implements PortfolioPublicationRepository {
  state: PortfolioPublicationState = { profile: null, artifacts: [] };
  loadCount = 0;
  saveCount = 0;
  publishCount = 0;
  unpublishCount = 0;
  failure: Error | null = null;

  async load() {
    this.loadCount += 1;
    return this.state;
  }

  async saveProfile() {
    this.saveCount += 1;
    if (this.failure) throw this.failure;
  }

  async setVisibility() {
    if (this.failure) throw this.failure;
  }

  async publishArtifact() {
    this.publishCount += 1;
    if (this.failure) throw this.failure;
  }

  async unpublishArtifact() {
    this.unpublishCount += 1;
    if (this.failure) throw this.failure;
  }
}

function Probe({ expose }: { expose(value: PortfolioPublicationContextValue): void }) {
  const publication = usePortfolioPublication();
  useEffect(() => expose(publication), [expose, publication]);
  return <p>{publication.status}:{publication.commandStatus}:{publication.state?.artifacts.length ?? "none"}</p>;
}

describe("PortfolioPublicationProvider", () => {
  it("loads a private empty publication state", async () => {
    const repository = new FakeRepository();
    let context: PortfolioPublicationContextValue | null = null;
    render(
      <PortfolioPublicationProvider createRepository={() => repository}>
        <Probe expose={(value) => { context = value; }} />
      </PortfolioPublicationProvider>,
    );

    await screen.findByText("ready:idle:0");
    expect(context).not.toBeNull();
    expect(repository.loadCount).toBe(1);
  });

  it("refreshes after saving, publishing, and unpublishing", async () => {
    const repository = new FakeRepository();
    let context: PortfolioPublicationContextValue | null = null;
    render(
      <PortfolioPublicationProvider createRepository={() => repository}>
        <Probe expose={(value) => { context = value; }} />
      </PortfolioPublicationProvider>,
    );
    await screen.findByText("ready:idle:0");

    await act(async () => {
      await context!.saveProfile({ slug: "barry-ml", displayName: "Barry", headline: "ML Engineer", bio: "" });
      await context!.publishArtifact({ artifactId: "8a165314-e249-4187-957a-143f80997319", publicTitle: "Model report", publicSummary: "A reproducible model report with evaluation evidence.", showArtifactUrl: false, featured: false, displayOrder: 0 });
      await context!.unpublishArtifact("8a165314-e249-4187-957a-143f80997319");
    });

    expect(repository.saveCount).toBe(1);
    expect(repository.publishCount).toBe(1);
    expect(repository.unpublishCount).toBe(1);
    expect(repository.loadCount).toBe(4);
  });

  it("surfaces command errors and returns to an idle command state", async () => {
    const repository = new FakeRepository();
    repository.failure = new Error("Publication rejected");
    let context: PortfolioPublicationContextValue | null = null;
    render(
      <PortfolioPublicationProvider createRepository={() => repository}>
        <Probe expose={(value) => { context = value; }} />
      </PortfolioPublicationProvider>,
    );
    await screen.findByText("ready:idle:0");

    await act(async () => {
      await expect(context!.setVisibility(true)).rejects.toThrow("Publication rejected");
    });

    await waitFor(() => expect(context!.commandError).toBe("Publication rejected"));
    expect(context!.commandStatus).toBe("idle");
  });
});
