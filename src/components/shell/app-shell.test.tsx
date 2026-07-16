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
  { href: "/dashboard", label: "指揮中心", icon: House },
  { href: "/quests", label: "今日任務", icon: Target },
  { href: "/progress", label: "能力成長", icon: ChartNoAxesColumnIncreasing },
  { href: "/archive", label: "訓練紀錄", icon: ScrollText },
  { href: "/profile", label: "個人設定", icon: UserRound },
  { href: "/agents", label: "Agent 狀態", icon: Bot },
];

describe("AppShell", () => {
  test("provides a skip link to the main content", () => {
    render(
      <AppShell items={items} currentPath="/dashboard">
        今日任務內容
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "跳至主要內容" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  test("moves keyboard focus to the skip link before navigation", async () => {
    const user = userEvent.setup();
    render(
      <AppShell items={items} currentPath="/dashboard">
        今日任務內容
      </AppShell>,
    );

    await user.tab();

    expect(screen.getByRole("link", { name: "跳至主要內容" })).toHaveFocus();
  });
});

describe("responsive navigation", () => {
  test("marks the current desktop destination", () => {
    render(<DesktopSidebar items={items} currentPath="/quests" />);

    const navigation = screen.getByRole("navigation", { name: "桌面主要導覽" });
    expect(screen.getByRole("link", { name: "今日任務" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(navigation).toHaveClass("overflow-y-auto", "overscroll-contain");
  });

  test("keeps compact rail labels accessible and visible", () => {
    render(<CompactRail items={items} currentPath="/progress" />);

    const navigation = screen.getByRole("navigation", { name: "平板主要導覽" });
    expect(screen.getByText("能力成長")).toBeVisible();
    expect(screen.getByRole("link", { name: "能力成長" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(navigation).toHaveClass("overflow-y-auto", "overscroll-contain");
    expect(screen.getByRole("link", { name: "能力成長" })).toHaveClass("text-xs");
  });

  test("renders at most five labeled mobile destinations", () => {
    render(<MobileBottomNav items={items} currentPath="/dashboard" />);

    const navigation = screen.getByRole("navigation", { name: "主要行動導覽" });

    expect(within(navigation).getAllByRole("link")).toHaveLength(5);
    expect(within(navigation).getByText("指揮中心")).toBeVisible();
    expect(within(navigation).getByText("個人設定")).toBeVisible();
    expect(within(navigation).queryByText("Agent 狀態")).not.toBeInTheDocument();
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
