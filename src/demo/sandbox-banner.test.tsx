import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SANDBOX_SESSION_KEY } from "./sandbox-session";
import { SandboxBanner } from "./sandbox-banner";

describe("SandboxBanner", () => {
  it("identifies simulated data and exits the sandbox", () => {
    window.sessionStorage.setItem(SANDBOX_SESSION_KEY, "active");
    const leave = vi.fn();
    render(<SandboxBanner leave={leave} />);

    expect(screen.getByText("Sandbox account")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Exit live demo" }));
    expect(window.sessionStorage.getItem(SANDBOX_SESSION_KEY)).toBeNull();
    expect(leave).toHaveBeenCalledOnce();
  });
});
