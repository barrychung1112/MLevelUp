import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { OnboardingFlow } from "./onboarding";

const goals = [
  { id: "job-ready", label: "成為能獨立工作的 ML Engineer" },
  { id: "competition", label: "提升 Kaggle 實戰能力" },
];

describe("OnboardingFlow", () => {
  test("collects a goal and weekly time without exposing difficulty choices", () => {
    const onSubmit = vi.fn();
    render(<OnboardingFlow goals={goals} onSubmit={onSubmit} />);

    expect(screen.queryByText("簡單模式")).not.toBeInTheDocument();
    expect(screen.queryByText("普通人模式")).not.toBeInTheDocument();
    expect(screen.queryByText("超級戰士模式")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("訓練目標"), { target: { value: "job-ready" } });
    fireEvent.change(screen.getByLabelText("每週可投入分鐘"), { target: { value: "600" } });
    fireEvent.click(screen.getByRole("button", { name: "開始第一項挑戰" }));

    expect(onSubmit).toHaveBeenCalledWith({ goalId: "job-ready", weeklyMinutes: 600 });
  });

  test("blocks missing goal and invalid weekly time", () => {
    const onSubmit = vi.fn();
    render(<OnboardingFlow goals={goals} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "開始第一項挑戰" }));

    expect(screen.getByText("請選擇訓練目標")).toBeVisible();
    expect(screen.getByText("每週投入時間必須大於 0 分鐘")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
