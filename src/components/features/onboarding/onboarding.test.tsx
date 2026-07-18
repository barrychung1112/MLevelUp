import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { OnboardingFlow } from "./onboarding";

describe("OnboardingFlow", () => {
  test("shows one fixed ML engineer target and no time or difficulty controls", () => {
    const onSubmit = vi.fn();
    render(<OnboardingFlow onSubmit={onSubmit} />);

    expect(screen.getByRole("heading", { name: "你想要成為什麼？" })).toBeVisible();
    expect(screen.getByText("機器學習工程師")).toBeVisible();
    expect(screen.getByText("每日固定 5 小時")).toBeVisible();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "開始訓練" }));
    expect(onSubmit).toHaveBeenCalledWith({ targetRole: "machine-learning-engineer" });
  });
});
