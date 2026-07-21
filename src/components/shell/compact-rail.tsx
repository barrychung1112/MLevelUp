import { ScanLine } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";

import { isCurrentPath, type NavigationProps } from "./navigation";

export function CompactRail({ items, currentPath }: NavigationProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-24 flex-col items-center border-r border-command-border bg-command-surface/95 backdrop-blur-xl md:flex xl:hidden">
      <div className="grid h-20 w-full shrink-0 place-items-center border-b border-command-border">
        <span className="grid size-11 place-items-center rounded-sm border border-command-cyan/50 bg-command-cyan/10 text-command-cyan">
          <ScanLine aria-hidden="true" className="size-6" strokeWidth={1.6} />
        </span>
      </div>
      <nav
        aria-label="Tablet primary navigation"
        className="flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-2 py-5"
      >
        {items.map((item) => {
          const active = isCurrentPath(item.href, currentPath);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-sm border border-transparent px-1 py-1 text-center text-xs font-semibold leading-tight text-command-muted transition-colors hover:border-command-border hover:bg-command-raised hover:text-command-text",
                active && "border-command-cyan/35 bg-command-cyan/10 text-command-cyan",
              )}
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.7} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
