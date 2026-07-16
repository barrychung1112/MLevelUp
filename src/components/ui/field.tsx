import { useId, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description?: string;
  error?: string;
};

export function Field({
  label,
  description,
  error,
  className,
  id: providedId,
  "aria-describedby": describedBy,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const descriptionIds = [describedBy, descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-command-text">
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className="text-xs leading-5 text-command-muted">
          {description}
        </p>
      ) : null}
      <input
        id={id}
        aria-describedby={descriptionIds}
        aria-invalid={error ? true : undefined}
        className={cn(
          "min-h-11 w-full rounded-sm border border-command-border bg-command-bg/80 px-3 text-sm text-command-text outline-none transition-[border-color,box-shadow] placeholder:text-command-muted/60 hover:border-command-muted/70 focus-visible:border-command-cyan focus-visible:shadow-[0_0_0_3px_rgba(77,231,255,0.12)]",
          error && "border-command-danger",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-command-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
