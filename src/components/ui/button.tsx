import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

const variantClasses = {
  primary:
    "border-command-cyan/70 bg-command-cyan text-command-ink shadow-[0_0_24px_rgba(77,231,255,0.18)] hover:bg-command-cyan/90",
  secondary:
    "border-command-border bg-command-raised text-command-text hover:border-command-cyan/60 hover:text-command-cyan",
  ghost:
    "border-transparent bg-transparent text-command-muted hover:border-command-border hover:bg-command-raised hover:text-command-text",
  danger:
    "border-command-danger/60 bg-command-danger/10 text-command-danger hover:bg-command-danger/20",
} as const;

const sizeClasses = {
  sm: "min-h-11 px-3 text-xs",
  md: "min-h-11 px-4 text-sm",
  icon: "size-11 p-0",
} as const;

export function Button({
  loading = false,
  variant = "primary",
  size = "md",
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-sm border font-display font-semibold uppercase tracking-[0.09em] transition-[color,background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-px disabled:pointer-events-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
