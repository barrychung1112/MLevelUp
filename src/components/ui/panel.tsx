import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type PanelProps = HTMLAttributes<HTMLElement> & {
  tone?: "default" | "elevated" | "accent";
};

const tones = {
  default: "border-command-border bg-command-surface/92",
  elevated: "border-command-border bg-command-raised/95 shadow-[0_20px_60px_rgba(0,0,0,0.28)]",
  accent:
    "border-command-cyan/45 bg-command-surface/95 shadow-[inset_3px_0_0_rgba(77,231,255,0.85),0_20px_60px_rgba(0,0,0,0.25)]",
} as const;

export function Panel({ className, tone = "default", ...props }: PanelProps) {
  return (
    <section
      className={cn("command-panel relative border p-5 sm:p-6", tones[tone], className)}
      {...props}
    />
  );
}
