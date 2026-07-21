import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LoginTerminal } from "./login-terminal";

describe("LoginTerminal", () => {
  it("requires confirmation before sending a Magic Link", async () => {
    const user = userEvent.setup();
    const requestMagicLink = vi.fn(async () => undefined);
    render(<LoginTerminal requestMagicLink={requestMagicLink} />);

    expect(screen.getByRole("heading", { name: /become anyone you want to be/i })).toBeVisible();
    await user.type(screen.getByLabelText("Email"), "challenger@example.com");
    await user.click(screen.getByRole("button", { name: "Enter Training" }));

    expect(requestMagicLink).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Challenger Warning" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Accept the Challenge" }));

    expect(requestMagicLink).toHaveBeenCalledWith("challenger@example.com");
    expect(await screen.findByText("Access link transmitted")).toBeVisible();
  });

  it("cancels without sending", async () => {
    const user = userEvent.setup();
    const requestMagicLink = vi.fn(async () => undefined);
    render(<LoginTerminal requestMagicLink={requestMagicLink} />);

    await user.type(screen.getByLabelText("Email"), "challenger@example.com");
    await user.click(screen.getByRole("button", { name: "Enter Training" }));
    await user.click(screen.getByRole("button", { name: "Go Back" }));

    expect(requestMagicLink).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a safe English failure state", async () => {
    const user = userEvent.setup();
    const requestMagicLink = vi.fn(async () => {
      throw new Error("provider secret detail");
    });
    render(<LoginTerminal requestMagicLink={requestMagicLink} />);

    await user.type(screen.getByLabelText("Email"), "challenger@example.com");
    await user.click(screen.getByRole("button", { name: "Enter Training" }));
    await user.click(screen.getByRole("button", { name: "Accept the Challenge" }));

    expect(await screen.findByText("Transmission failed")).toBeVisible();
    expect(screen.queryByText("provider secret detail")).not.toBeInTheDocument();
  });
});
