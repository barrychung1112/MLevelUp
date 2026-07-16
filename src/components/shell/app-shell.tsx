import type { ReactNode } from "react";

import { CompactRail } from "./compact-rail";
import { DesktopSidebar } from "./desktop-sidebar";
import { MobileBottomNav } from "./mobile-bottom-nav";
import type { NavigationProps } from "./navigation";
import { SkipLink } from "./skip-link";

type AppShellProps = NavigationProps & {
  children: ReactNode;
};

export function AppShell({ items, currentPath, children }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-command-bg text-command-text">
      <SkipLink />
      <div aria-hidden="true" className="command-grid pointer-events-none fixed inset-0" />
      <div aria-hidden="true" className="command-glow pointer-events-none fixed inset-0" />
      <DesktopSidebar items={items} currentPath={currentPath} />
      <CompactRail items={items} currentPath={currentPath} />
      <MobileBottomNav items={items} currentPath={currentPath} />
      <main
        id="main-content"
        tabIndex={-1}
        className="relative min-h-screen pb-24 md:ml-24 md:pb-0 xl:ml-72"
      >
        {children}
      </main>
    </div>
  );
}
