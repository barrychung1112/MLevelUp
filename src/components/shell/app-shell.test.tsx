import {
  Bot,
  ChartNoAxesColumnIncreasing,
  House,
  ScrollText,
  Target,
  UserRound,
} from "lucide-react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { AppShell } from "./app-shell";
import { CompactRail } from "./compact-rail";
import { DesktopSidebar } from "./desktop-sidebar";
import { MobileBottomNav } from "./mobile-bottom-nav";
import type { NavigationItem } from "./navigation";

const items: NavigationItem[] = [
  { href: "/dashboard", label: "Command Center", icon: House },
  { href: "/quests", label: "Missions", icon: Target },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumnIncreasing },
  { href: "/archive", label: "Training Archive", icon: ScrollText },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/agents", label: "Agent Status", icon: Bot },
];

describe("AppShell", () => {
  test("provides a skip link to the main content", () => {
    render(
      <AppShell items={items} currentPath="/dashboard">
        Mission content
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  test("moves keyboard focus to the skip link before navigation", async () => {
    const user = userEvent.setup();
    render(
      <AppShell items={items} currentPath="/dashboard">
        Mission content
      </AppShell>,
    );

    await user.tab();

    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveFocus();
  });
});

describe("responsive navigation", () => {
  test("marks the current desktop destination", () => {
    render(<DesktopSidebar items={items} currentPath="/quests" />);

    const navigation = screen.getByRole("navigation", { name: "Desktop primary navigation" });
    expect(screen.getByRole("link", { name: "Missions" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(navigation).toHaveClass("overflow-y-auto", "overscroll-contain");
  });

  test("keeps compact rail labels accessible and visible", () => {
    render(<CompactRail items={items} currentPath="/progress" />);

    const navigation = screen.getByRole("navigation", { name: "Tablet primary navigation" });
    expect(screen.getByText("Progress")).toBeVisible();
    expect(screen.getByRole("link", { name: "Progress" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(navigation).toHaveClass("overflow-y-auto", "overscroll-contain");
    expect(screen.getByRole("link", { name: "Progress" })).toHaveClass("text-xs");
  });

  test("renders at most five labeled mobile destinations", () => {
    render(<MobileBottomNav items={items} currentPath="/dashboard" />);

    const navigation = screen.getByRole("navigation", { name: "Mobile primary navigation" });

    expect(within(navigation).getAllByRole("link")).toHaveLength(5);
    expect(within(navigation).getByText("Command Center")).toBeVisible();
    expect(within(navigation).getByText("Profile")).toBeVisible();
    expect(within(navigation).queryByText("Agent Status")).not.toBeInTheDocument();
    for (const link of within(navigation).getAllByRole("link")) {
      expect(link).toHaveClass("min-h-11", "text-xs");
    }
  });
});

describe("shell design contracts", () => {
  test("uses the approved command border token", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/app/globals.css"),
      "utf8",
    );

    expect(css).toContain("--command-border: #243249;");
  });
});
