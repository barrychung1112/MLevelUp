import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ProfileSettings } from "./profile-settings";

const goals = [
  { id: "job-ready", label: "成為可就業的 ML Engineer" },
  { id: "competition", label: "完成第一場 Kaggle 競賽" },
];

const contracts = [
  { id: "foundation", label: "簡單模式", timeCommitment: "每天 30–45 分鐘", description: "建立穩定基礎" },
  { id: "standard", label: "普通人模式", timeCommitment: "每天 1–2 小時", description: "實作與作品集並進" },
  { id: "intensive", label: "超級戰士模式", timeCommitment: "每天 3 小時以上", description: "貼近真實工程節奏" },
];

describe("ProfileSettings", () => {
  test("edits presentation preferences through callbacks", async () => {
    const onSave = vi.fn();
    render(
      <ProfileSettings
        profile={{ goalId: "job-ready", contractId: "standard", weeklyMinutes: 600 }}
        goals={goals}
        contracts={contracts}
        onSave={onSave}
        onReset={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("訓練目標"), { target: { value: "competition" } });
    fireEvent.change(screen.getByLabelText("訓練契約"), { target: { value: "intensive" } });
    fireEvent.change(screen.getByLabelText("每週投入分鐘數"), { target: { value: "1260" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存個人設定" }));

    expect(onSave).toHaveBeenCalledWith({ goalId: "competition", contractId: "intensive", weeklyMinutes: 1260 });
  }, 15_000);

  test("requires explicit confirmation before resetting demo progress", async () => {
    const onReset = vi.fn();
    render(
      <ProfileSettings
        profile={{ goalId: "job-ready", contractId: "standard", weeklyMinutes: 600 }}
        goals={goals}
        contracts={contracts}
        onSave={vi.fn()}
        onReset={onReset}
      />,
    );

    const resetButton = screen.getByRole("button", { name: "重設 Demo 資料" });
    resetButton.focus();
    fireEvent.click(resetButton);
    expect(screen.getByRole("dialog", { name: "確認重設 Demo 資料" })).toBeVisible();
    expect(screen.getByRole("button", { name: "關閉對話框" })).toHaveFocus();
    expect(onReset).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "確認重設 Demo 資料" })).not.toBeInTheDocument();
    expect(resetButton).toHaveFocus();

    fireEvent.click(resetButton);
    fireEvent.click(screen.getByRole("button", { name: "確認重設" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  }, 15_000);

  test("links validation errors to their fields", () => {
    render(
      <ProfileSettings
        profile={{ goalId: "", contractId: "", weeklyMinutes: 0 }}
        goals={goals}
        contracts={contracts}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "儲存個人設定" }));

    expect(screen.getByLabelText("訓練目標")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("訓練目標")).toHaveAccessibleDescription("請選擇訓練目標");
    expect(screen.getByLabelText("每週投入分鐘數")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("每週投入分鐘數")).toHaveAccessibleDescription("每週投入時間必須大於 0 分鐘");
  }, 15_000);

  test("syncs form fields when a loading profile becomes ready", () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <ProfileSettings
        profile={null}
        goals={goals}
        contracts={contracts}
        onSave={onSave}
        onReset={vi.fn()}
        status="loading"
      />,
    );

    rerender(
      <ProfileSettings
        profile={{ goalId: "competition", contractId: "intensive", weeklyMinutes: 1260 }}
        goals={goals}
        contracts={contracts}
        onSave={onSave}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("訓練目標")).toHaveValue("competition");
    expect(screen.getByLabelText("訓練契約")).toHaveValue("intensive");
    expect(screen.getByLabelText("每週投入分鐘數")).toHaveValue(1260);
  }, 15_000);

  test("exposes save progress, failure, and success from its parent flow", () => {
    render(
      <ProfileSettings
        profile={{ goalId: "job-ready", contractId: "standard", weeklyMinutes: 600 }}
        goals={goals}
        contracts={contracts}
        onSave={vi.fn()}
        onReset={vi.fn()}
        isSubmitting
        submitError="設定儲存失敗"
        successMessage="設定已儲存"
      />,
    );

    const saveButton = screen.getByRole("button", { name: "儲存個人設定" });
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("設定儲存失敗");
    expect(screen.getByRole("status")).toHaveTextContent("設定已儲存");
  }, 15_000);
});
