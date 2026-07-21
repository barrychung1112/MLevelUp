import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ProfileSettings } from "./profile-settings";

const profile = { targetRoleLabel: "Machine Learning Engineer", dailyMinutes: 300 };

describe("ProfileSettings", () => {
  test("shows the fixed target and five-hour commitment as read-only", () => {
    render(<ProfileSettings profile={profile} onReset={vi.fn()} />);

    expect(screen.getByText("Machine Learning Engineer")).toBeVisible();
    expect(screen.getByText("5 hours every day")).toBeVisible();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Settings" })).not.toBeInTheDocument();
  });

  test("requires confirmation before resetting progress", () => {
    const onReset = vi.fn();
    render(<ProfileSettings profile={profile} onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: "Reset Training Data" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Reset" }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  test("offers an explicit account sign out action", () => {
    const onSignOut = vi.fn();
    render(<ProfileSettings profile={profile} onReset={vi.fn()} onSignOut={onSignOut} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });
});
