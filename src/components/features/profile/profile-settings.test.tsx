import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { ProfileSettings } from "./profile-settings";

const profile = { targetRoleLabel: "機器學習工程師", dailyMinutes: 300 };

describe("ProfileSettings", () => {
  test("shows the fixed target and five-hour commitment as read-only", () => {
    render(<ProfileSettings profile={profile} onReset={vi.fn()} />);

    expect(screen.getByText("機器學習工程師")).toBeVisible();
    expect(screen.getByText("每日固定 5 小時")).toBeVisible();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "儲存設定" })).not.toBeInTheDocument();
  });

  test("requires confirmation before resetting progress", () => {
    const onReset = vi.fn();
    render(<ProfileSettings profile={profile} onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: "重設訓練資料" }));
    fireEvent.click(screen.getByRole("button", { name: "確認重設" }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  test("offers an explicit account sign out action", () => {
    const onSignOut = vi.fn();
    render(<ProfileSettings profile={profile} onReset={vi.fn()} onSignOut={onSignOut} />);
    fireEvent.click(screen.getByRole("button", { name: "登出帳號" }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });
});
