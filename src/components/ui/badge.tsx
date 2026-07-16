import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "cyan" | "success" | "warning" | "danger" | "violet";
};

const tones = {
  neutral: "border-command-border bg-command-raised text-command-muted",
  cyan: "border-command-cyan/40 bg-command-cyan/10 text-command-cyan",
  success: "border-command-success/40 bg-command-success/10 text-command-success",
  warning: "border-command-warning/40 bg-command-warning/10 text-command-warning",
  danger: "border-command-danger/40 bg-command-danger/10 text-command-danger",
  violet: "border-command-violet/40 bg-command-violet/10 text-command-violet",
} as const;

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1 rounded-sm border px-2 py-0.5 font-data text-[0.68rem] font-medium uppercase tracking-[0.1em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
