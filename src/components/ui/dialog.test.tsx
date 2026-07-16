import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { Dialog } from "./dialog";
import { Panel } from "./panel";

function DialogHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        開啟任務詳情
      </button>
      <Panel aria-label="任務卡片">
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="任務詳情"
          description="檢查驗收條件後再提交。"
        >
          <button type="button">提交成果</button>
        </Dialog>
      </Panel>
    </>
  );
}

describe("Dialog", () => {
  test("closes with Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const trigger = screen.getByRole("button", { name: "開啟任務詳情" });
    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "任務詳情" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "關閉對話框" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "任務詳情" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test("portals outside a clipped panel and locks background scrolling", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "開啟任務詳情" }));

    const dialog = screen.getByRole("dialog", { name: "任務詳情" });
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(document.body).toHaveStyle({ overflow: "hidden" });

    await user.click(screen.getByRole("button", { name: "關閉對話框" }));

    expect(document.body.style.overflow).toBe("");
  });

  test("loops Tab and Shift+Tab within the dialog", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "開啟任務詳情" }));

    const close = screen.getByRole("button", { name: "關閉對話框" });
    const submit = screen.getByRole("button", { name: "提交成果" });

    expect(close).toHaveFocus();
    await user.tab();
    expect(submit).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(submit).toHaveFocus();
  });
});
