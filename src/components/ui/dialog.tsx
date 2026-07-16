"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  closeLabel?: string;
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  closeLabel = "關閉對話框",
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [onOpenChange, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-50 grid place-items-end bg-command-bg/80 p-0 backdrop-blur-sm sm:place-items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "command-panel max-h-[90dvh] w-full overflow-y-auto border border-command-border bg-command-raised shadow-[0_24px_100px_rgba(0,0,0,0.65),0_0_50px_rgba(77,231,255,0.08)] sm:max-w-xl",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-5 border-b border-command-border px-5 py-4 sm:px-6">
          <div className="space-y-1">
            <p className="font-data text-[0.65rem] uppercase tracking-[0.18em] text-command-cyan">
              Secure transmission
            </p>
            <h2 id={titleId} className="font-display text-xl font-semibold text-command-text">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="max-w-prose text-sm leading-6 text-command-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={closeLabel}
            className="grid size-11 shrink-0 place-items-center rounded-sm border border-command-border bg-command-bg text-command-muted transition-colors hover:border-command-cyan/60 hover:text-command-cyan"
            onClick={() => onOpenChange(false)}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>
        <div className="px-5 py-5 sm:px-6">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap justify-end gap-3 border-t border-command-border px-5 py-4 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
