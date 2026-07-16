import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { OnboardingFlow } from "./onboarding";

const goals = [
  { id: "job-ready", label: "成為可就業的 ML Engineer" },
  { id: "competition", label: "完成第一場 Kaggle 競賽" },
];

const contracts = [
  { id: "foundation", label: "簡單模式", timeCommitment: "每天 30–45 分鐘", description: "建立穩定基礎" },
  { id: "standard", label: "普通人模式", timeCommitment: "每天 1–2 小時", description: "實作與作品集並進" },
  { id: "intensive", label: "超級戰士模式", timeCommitment: "每天 3 小時以上", description: "貼近真實工程節奏" },
];

describe("OnboardingFlow", () => {
  test("shows three contracts and blocks an incomplete training setup", async () => {
    const onSubmit = vi.fn();
    render(<OnboardingFlow goals={goals} contracts={contracts} onSubmit={onSubmit} />);

    expect(screen.getByLabelText("訓練目標")).toBeVisible();
    expect(screen.getByLabelText("簡單模式")).toBeVisible();
    expect(screen.getByLabelText("普通人模式")).toBeVisible();
    expect(screen.getByLabelText("超級戰士模式")).toBeVisible();
    expect(screen.getByLabelText("每週投入分鐘數")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "建立訓練契約" }));

    expect(screen.getByText("請選擇訓練目標")).toBeVisible();
    expect(screen.getByText("請選擇訓練契約")).toBeVisible();
    expect(screen.getByText("每週投入時間必須大於 0 分鐘")).toBeVisible();
    expect(screen.getByLabelText("訓練目標")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("訓練目標")).toHaveAccessibleDescription("請選擇訓練目標");
    expect(screen.getByLabelText("每週投入分鐘數")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("每週投入分鐘數")).toHaveAccessibleDescription("每週投入時間必須大於 0 分鐘");
    const contractGroup = screen.getByRole("group", { name: "訓練契約" });
    expect(contractGroup).toHaveAttribute("aria-invalid", "true");
    expect(contractGroup).toHaveAccessibleDescription("請選擇訓練契約");
    expect(screen.getByLabelText("普通人模式")).toHaveAccessibleDescription("請選擇訓練契約");
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("普通人模式"));
    expect(contractGroup).not.toHaveAttribute("aria-invalid");
    expect(contractGroup).not.toHaveAccessibleDescription("請選擇訓練契約");
  }, 15_000);

  test("submits only the selected presentation values", async () => {
    const onSubmit = vi.fn();
    render(<OnboardingFlow goals={goals} contracts={contracts} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("訓練目標"), { target: { value: "job-ready" } });
    fireEvent.click(screen.getByLabelText("普通人模式"));
    fireEvent.change(screen.getByLabelText("每週投入分鐘數"), { target: { value: "600" } });
    fireEvent.click(screen.getByRole("button", { name: "建立訓練契約" }));

    expect(onSubmit).toHaveBeenCalledWith({
      goalId: "job-ready",
      contractId: "standard",
      weeklyMinutes: 600,
    });
  }, 15_000);

  test("exposes submit progress, failure, and success from its parent flow", () => {
    render(
      <OnboardingFlow
        goals={goals}
        contracts={contracts}
        onSubmit={vi.fn()}
        isSubmitting
        submitError="契約建立失敗，請重試"
        successMessage="契約已建立"
      />,
    );

    const submitButton = screen.getByRole("button", { name: "建立訓練契約" });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("契約建立失敗，請重試");
    expect(screen.getByRole("status")).toHaveTextContent("契約已建立");
  }, 15_000);

  test("renders representative loading, error, and empty states", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <OnboardingFlow goals={goals} contracts={contracts} onSubmit={onSubmit} status="loading" />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("正在載入訓練契約");

    rerender(
      <OnboardingFlow
        goals={goals}
        contracts={contracts}
        onSubmit={onSubmit}
        status="error"
        errorMessage="設定讀取失敗"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("設定讀取失敗");

    rerender(<OnboardingFlow goals={[]} contracts={contracts} onSubmit={onSubmit} />);
    expect(screen.getByText("目前沒有可用的訓練設定。")).toBeVisible();
  }, 15_000);
});
