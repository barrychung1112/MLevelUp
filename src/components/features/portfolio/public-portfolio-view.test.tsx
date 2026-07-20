import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { demoPublicPortfolio } from "@/portfolio/public-portfolio-reader";
import { PublicPortfolioView } from "./public-portfolio-view";

describe("PublicPortfolioView", () => {
  it("shows evidence totals and evidence-backed skill coverage", () => {
    render(<PublicPortfolioView portfolio={demoPublicPortfolio} />);
    expect(screen.getByText("3 artifacts")).toBeVisible();
    expect(screen.getByText("Modeling · 1")).toBeVisible();
    expect(screen.getByText("Communication · 2")).toBeVisible();
  });

  it("filters artifacts by skill and artifact type", () => {
    render(<PublicPortfolioView portfolio={demoPublicPortfolio} />);
    fireEvent.change(screen.getByLabelText("Filter by skill"), { target: { value: "engineering" } });
    const archive = screen.getByRole("heading", { name: "All artifacts" }).closest("section");
    expect(archive).not.toBeNull();
    expect(within(archive!).getByText("Production inference gateway")).toBeVisible();
    expect(within(archive!).queryByText("Churn model validation dossier")).not.toBeInTheDocument();
  });

  it("renders only safe HTTPS links", () => {
    const unsafe = { ...demoPublicPortfolio, artifacts: demoPublicPortfolio.artifacts.map((item, index) => index === 0 ? { ...item, artifactUrl: "http://unsafe.example" } : item) };
    render(<PublicPortfolioView portfolio={unsafe} />);
    expect(screen.queryByRole("link", { name: /Churn model validation dossier/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Production inference gateway/ })[0]).toHaveAttribute("rel", "noopener noreferrer");
  });
});
