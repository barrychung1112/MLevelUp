import { ScanLine } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";

import { isCurrentPath, type NavigationProps } from "./navigation";

export function DesktopSidebar({ items, currentPath }: NavigationProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-command-border bg-command-surface/95 backdrop-blur-xl xl:flex">
      <div className="flex h-24 shrink-0 items-center gap-3 border-b border-command-border px-6">
        <span className="grid size-11 place-items-center rounded-sm border border-command-cyan/50 bg-command-cyan/10 text-command-cyan shadow-[0_0_20px_rgba(77,231,255,0.12)]">
          <ScanLine aria-hidden="true" className="size-6" strokeWidth={1.6} />
        </span>
        <div>
          <p className="font-display text-lg font-bold uppercase tracking-[0.08em] text-command-text">
            MLevelUp
          </p>
          <p className="font-data text-[0.58rem] uppercase tracking-[0.2em] text-command-muted">
            Command interface
          </p>
        </div>
      </div>
      <nav
        aria-label="Desktop primary navigation"
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-6"
      >
        <p className="px-3 pb-2 font-data text-[0.62rem] uppercase tracking-[0.2em] text-command-muted">
          Mission channels
        </p>
        {items.map((item, index) => {
          const active = isCurrentPath(item.href, currentPath);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex min-h-11 items-center gap-3 rounded-sm border border-transparent px-3 text-sm font-semibold text-command-muted transition-[color,background-color,border-color] hover:border-command-border hover:bg-command-raised hover:text-command-text",
                active &&
                  "border-command-cyan/35 bg-command-cyan/10 text-command-cyan shadow-[inset_3px_0_0_rgba(77,231,255,0.85)]",
              )}
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.7} />
              <span>{item.label}</span>
              <span
                aria-hidden="true"
                className="ml-auto font-data text-[0.58rem] text-command-muted/60"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 border-t border-command-border px-6 py-5">
        <div className="flex items-center gap-2 font-data text-[0.62rem] uppercase tracking-[0.14em] text-command-muted">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-command-success shadow-[0_0_10px_rgba(167,243,107,0.8)]"
          />
          System online
        </div>
      </div>
    </aside>
  );
}
