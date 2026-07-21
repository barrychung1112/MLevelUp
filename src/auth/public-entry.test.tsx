import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PublicEntry } from "./public-entry";

describe("PublicEntry", () => {
  it("offers the two deterministic demo entries and a separate sign-in action", () => {
    render(<PublicEntry requestMagicLink={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Watch the challenge" })).toHaveAttribute(
      "href", "/demo?guided=1&restart=1",
    );
    expect(screen.getByRole("link", { name: "Enter live demo" })).toHaveAttribute(
      "href", "/demo?restart=1",
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
