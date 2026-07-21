import Link from "next/link";

import { cn } from "@/lib/cn";

import { isCurrentPath, type NavigationProps } from "./navigation";

export function MobileBottomNav({ items, currentPath }: NavigationProps) {
  const visibleItems = items.slice(0, 5);

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid min-h-[4.75rem] grid-cols-5 border-t border-command-border bg-command-surface/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      {visibleItems.map((item) => {
        const active = isCurrentPath(item.href, currentPath);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-xs font-semibold leading-tight text-command-muted transition-colors hover:text-command-text",
              active && "text-command-cyan",
            )}
          >
            {active ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 top-0 h-px bg-command-cyan shadow-[0_0_8px_rgba(77,231,255,0.8)]"
              />
            ) : null}
            <Icon aria-hidden="true" className="size-5" strokeWidth={1.7} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
