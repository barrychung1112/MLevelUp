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
        Open mission details
      </button>
      <Panel aria-label="Mission card">
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="Mission Details"
          description="Review the acceptance criteria before submitting."
        >
          <button type="button">Submit Evidence</button>
        </Dialog>
      </Panel>
    </>
  );
}

describe("Dialog", () => {
  test("closes with Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const trigger = screen.getByRole("button", { name: "Open mission details" });
    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "Mission Details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Mission Details" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test("portals outside a clipped panel and locks background scrolling", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Open mission details" }));

    const dialog = screen.getByRole("dialog", { name: "Mission Details" });
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(document.body).toHaveStyle({ overflow: "hidden" });

    await user.click(screen.getByRole("button", { name: "Close dialog" }));

    expect(document.body.style.overflow).toBe("");
  });

  test("loops Tab and Shift+Tab within the dialog", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Open mission details" }));

    const close = screen.getByRole("button", { name: "Close dialog" });
    const submit = screen.getByRole("button", { name: "Submit Evidence" });

    expect(close).toHaveFocus();
    await user.tab();
    expect(submit).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(submit).toHaveFocus();
  });
});
