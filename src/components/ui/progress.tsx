import { cn } from "@/lib/cn";

type ProgressProps = {
  label: string;
  value: number;
  max?: number;
  showValue?: boolean;
  className?: string;
};

export function Progress({
  label,
  value,
  max = 100,
  showValue = true,
  className,
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const safeValue = Math.min(Math.max(value, 0), safeMax);
  const percentage = (safeValue / safeMax) * 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="font-medium text-command-muted">{label}</span>
        {showValue ? (
          <span className="font-data text-command-text">
            {safeValue}/{safeMax}
          </span>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        className="h-2 overflow-hidden rounded-[2px] border border-command-border bg-command-bg"
      >
        <div
          aria-hidden="true"
          className="h-full origin-left bg-command-cyan shadow-[0_0_14px_rgba(77,231,255,0.7)] transition-transform duration-200"
          style={{ transform: `scaleX(${percentage / 100})` }}
        />
      </div>
    </div>
  );
}
