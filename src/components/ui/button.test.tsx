import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  test("announces loading and prevents interaction", () => {
    render(<Button loading>提交成果</Button>);

    const button = screen.getByRole("button", { name: "提交成果" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  test("honors the disabled state without claiming to be busy", () => {
    render(<Button disabled>開始任務</Button>);

    const button = screen.getByRole("button", { name: "開始任務" });

    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute("aria-busy", "true");
  });

  test("keeps every button size at least 44px tall", () => {
    render(
      <>
        <Button size="sm">小型按鈕</Button>
        <Button size="md">標準按鈕</Button>
        <Button size="icon" aria-label="圖示按鈕">
          ×
        </Button>
      </>,
    );

    expect(screen.getByRole("button", { name: "小型按鈕" })).toHaveClass("min-h-11");
    expect(screen.getByRole("button", { name: "標準按鈕" })).toHaveClass("min-h-11");
    expect(screen.getByRole("button", { name: "圖示按鈕" })).toHaveClass("size-11");
  });
});
