import { Radar, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon = Radar,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("grid justify-items-center gap-3 px-5 py-10 text-center", className)}>
      <span className="grid size-12 place-items-center rounded-sm border border-command-border bg-command-bg text-command-muted">
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.6} />
      </span>
      <div className="space-y-1">
        <h2 className="font-display text-lg font-semibold uppercase tracking-[0.04em] text-command-text">
          {title}
        </h2>
        {description ? (
          <p className="max-w-md text-sm leading-6 text-command-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
