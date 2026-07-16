import { CircleOff } from "lucide-react";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Badge } from "./badge";
import { EmptyState } from "./empty-state";
import { Field } from "./field";
import { Panel } from "./panel";
import { Progress } from "./progress";
import { StatusIndicator } from "./status-indicator";

describe("design-system primitives", () => {
  test("Panel and Badge expose their content", () => {
    render(
      <Panel aria-label="任務面板">
        <Badge tone="cyan">今日任務</Badge>
      </Panel>,
    );

    expect(screen.getByRole("region", { name: "任務面板" })).toBeInTheDocument();
    expect(screen.getByText("今日任務")).toBeInTheDocument();
  });

  test("Progress exposes its current value and accessible label", () => {
    render(<Progress label="等級經驗值" value={72} />);

    const progressbar = screen.getByRole("progressbar", { name: "等級經驗值" });
    const fill = progressbar.firstElementChild;

    expect(progressbar).toHaveAttribute("aria-valuenow", "72");
    expect(fill).toHaveClass("origin-left", "transition-transform", "duration-200");
    expect(fill).toHaveStyle({ transform: "scaleX(0.72)" });
    expect(fill).not.toHaveClass("transition-[width]");
  });

  test("Field links its label and validation error to the input", () => {
    render(<Field label="成果連結" error="請輸入有效網址" />);

    const input = screen.getByRole("textbox", { name: "成果連結" });
    const error = screen.getByText("請輸入有效網址");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", error.id);
    expect(error).toHaveAttribute("role", "alert");
  });

  test("EmptyState and StatusIndicator keep status text visible", () => {
    render(
      <>
        <EmptyState icon={CircleOff} title="尚無戰鬥紀錄" description="完成任務後會顯示在這裡。" />
        <StatusIndicator tone="active">Agent 運作中</StatusIndicator>
      </>,
    );

    expect(screen.getByText("尚無戰鬥紀錄")).toBeVisible();
    expect(screen.getByText("Agent 運作中")).toBeVisible();
  });
});
