import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type StatusIndicatorProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "idle" | "active" | "success" | "warning" | "danger";
};

const tones = {
  idle: "bg-command-muted",
  active: "bg-command-cyan shadow-[0_0_10px_rgba(77,231,255,0.9)]",
  success: "bg-command-success shadow-[0_0_10px_rgba(167,243,107,0.75)]",
  warning: "bg-command-warning shadow-[0_0_10px_rgba(255,180,84,0.75)]",
  danger: "bg-command-danger shadow-[0_0_10px_rgba(255,115,115,0.75)]",
} as const;

export function StatusIndicator({
  className,
  tone = "idle",
  children,
  ...props
}: StatusIndicatorProps) {
  return (
    <span
      className={cn("inline-flex min-h-6 items-center gap-2 text-xs font-medium text-command-muted", className)}
      {...props}
    >
      <span aria-hidden="true" className={cn("size-2 rounded-full", tones[tone])} />
      <span>{children}</span>
    </span>
  );
}
