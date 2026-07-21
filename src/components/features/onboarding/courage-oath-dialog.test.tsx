import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CourageOathDialog } from "./courage-oath-dialog";

describe("CourageOathDialog", () => {
  it("presents the approved warning and both decisions", () => {
    const onAccept = vi.fn();
    const onCancel = vi.fn();
    render(<CourageOathDialog onAccept={onAccept} onCancel={onCancel} />);

    expect(screen.getByRole("dialog", { name: "Challenger Warning" })).toBeVisible();
    expect(screen.getByText("This is a road for those who choose to become stronger.")).toBeVisible();
    expect(screen.getByText(/Failure will not end your training/)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Accept the Challenge" }));
    expect(onAccept).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Not Yet" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("keeps the oath open and shows a recoverable failure", () => {
    render(
      <CourageOathDialog
        error="The oath could not be recorded. Try again."
        onAccept={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("The oath could not be recorded. Try again.");
    expect(screen.getByRole("dialog", { name: "Challenger Warning" })).toBeVisible();
  });
});
