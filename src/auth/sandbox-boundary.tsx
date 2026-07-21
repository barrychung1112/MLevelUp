"use client";

import { useState, type ReactNode } from "react";

import { activateSandboxSession } from "@/demo/sandbox-session";

export function SandboxBoundary({ children }: { children: ReactNode }) {
  const [activated] = useState(() => {
    if (typeof window === "undefined") return false;
    activateSandboxSession(window.sessionStorage, window.localStorage);
    return true;
  });

  if (!activated) return null;
  return children;
}
