import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { OnboardingFlow } from "./onboarding";

describe("OnboardingFlow", () => {
  test("shows one fixed ML engineer target and no time or difficulty controls", () => {
    const onSubmit = vi.fn();
    render(<OnboardingFlow onSubmit={onSubmit} />);

    expect(screen.getByRole("heading", { name: "What do you want to become?" })).toBeVisible();
    expect(screen.getByText("Machine Learning Engineer")).toBeVisible();
    expect(screen.getByText("5 hours every day")).toBeVisible();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start Training" }));
    expect(onSubmit).toHaveBeenCalledWith({ targetRole: "machine-learning-engineer" });
  });
});
