import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CourageOathDialog } from "./courage-oath-dialog";

describe("CourageOathDialog", () => {
  it("presents the approved warning and both decisions", () => {
    const onAccept = vi.fn();
    const onCancel = vi.fn();
    render(<CourageOathDialog onAccept={onAccept} onCancel={onCancel} />);

    expect(screen.getByRole("dialog", { name: "挑戰者警告" })).toBeVisible();
    expect(screen.getByText("這是一條成為強者的道路。")).toBeVisible();
    expect(screen.getByText(/失敗不會終止訓練/)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "接受挑戰" }));
    expect(onAccept).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "暫不開始" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("keeps the oath open and shows a recoverable failure", () => {
    render(
      <CourageOathDialog
        error="誓約紀錄失敗，請重試。"
        onAccept={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("誓約紀錄失敗，請重試。");
    expect(screen.getByRole("dialog", { name: "挑戰者警告" })).toBeVisible();
  });
});
