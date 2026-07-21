import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { GuidedDemo } from "./guided-demo";
import { GUIDED_DEMO_SESSION_KEY } from "./session-store";

describe("GuidedDemo", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("walks through one deterministic evidence chain", () => {
    render(<GuidedDemo restart />);

    expect(screen.getByText(/Step 1 \/ 6/)).toBeVisible();
    expect(screen.getByText(/2 of 4 checkpoints/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "View today's training orders" }));

    expect(screen.getByText(/Step 2 \/ 6/)).toBeVisible();
    expect(screen.getByText("Recover missing validation evidence")).toBeVisible();
    expect(screen.getByText("Measure validation stability")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Accept daily mission" }));

    expect(screen.getByText(/Step 3 \/ 6/)).toBeVisible();
    expect(screen.getByText("0.842")).toBeVisible();
    expect(screen.getByText("0.824")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Submit evidence" }));

    expect(screen.getByText(/Step 4 \/ 6/)).toBeVisible();
    expect(screen.getByText(/simulated ai response/i)).toBeVisible();
    expect(screen.getByText("88 / 100")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Apply verified result" }));

    expect(screen.getByText(/Step 5 \/ 6/)).toBeVisible();
    expect(screen.getByText("+40 XP")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "View public proof" }));

    expect(screen.getByText(/Step 6 \/ 6/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Open public portfolio" })).toHaveAttribute(
      "href",
      "/p/demo-ml-engineer",
    );
  });

  it("restarts the demo and clears prior progress", () => {
    render(<GuidedDemo restart />);
    fireEvent.click(screen.getByRole("button", { name: "View today's training orders" }));
    fireEvent.click(screen.getByRole("button", { name: "Restart guided demo" }));
    expect(screen.getByText(/Step 1 \/ 6/)).toBeVisible();
    expect(JSON.parse(window.sessionStorage.getItem(GUIDED_DEMO_SESSION_KEY) ?? "{}").step).toBe(1);
  });
});
