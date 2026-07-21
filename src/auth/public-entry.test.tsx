import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PublicEntry } from "./public-entry";

describe("PublicEntry", () => {
  it("offers the two deterministic demo entries and a separate sign-in action", () => {
    render(<PublicEntry requestMagicLink={vi.fn()} />);

    expect(screen.getByRole("heading", {
      name: "Make every target in your life a game, and you will be the player who can level up without limitation. Ready to level up? Let's get it!",
    })).toBeVisible();
    expect(screen.getByText("Career path open: Machine Learning Engineer")).toBeVisible();
    expect(screen.getByText("Adaptive missions")).toBeVisible();
    expect(screen.getByText("Evidence before XP")).toBeVisible();
    expect(screen.getByText("AI advice, policy control")).toBeVisible();
    expect(screen.getByText("Portfolio-ready proof")).toBeVisible();

    expect(screen.getByRole("link", { name: "Watch the challenge" })).toHaveAttribute(
      "href", "/demo?guided=1&restart=1",
    );
    expect(screen.getByRole("link", { name: "Enter live demo" })).toHaveAttribute(
      "href", "/demo/sandbox?restart=1",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeVisible();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("reveals the existing email terminal only after Sign in", () => {
    render(<PublicEntry requestMagicLink={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.getByRole("button", { name: "Back to demo options" })).toBeVisible();
  });
});
