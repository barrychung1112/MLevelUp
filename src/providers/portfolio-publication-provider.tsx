"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { isDemoMode } from "@/lib/demo-mode";
import { isSandboxSession } from "@/demo/sandbox-session";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { DemoPortfolioPublicationRepository } from "@/portfolio/demo-portfolio-publication-repository";
import type { PortfolioPublicationRepository } from "@/portfolio/portfolio-publication-repository";
import { SupabasePortfolioPublicationRepository } from "@/portfolio/supabase-portfolio-publication-repository";
import type {
  PortfolioPublicationState,
  PublicPortfolioProfileInput,
  PublishArtifactInput,
} from "@/portfolio/contracts";

export type PortfolioPublicationContextValue = {
  state: PortfolioPublicationState | null;
  status: "loading" | "ready" | "error";
  commandStatus: "idle" | "submitting";
  loadError: string | null;
  commandError: string | null;
  commandSuccess: string | null;
  saveProfile(input: PublicPortfolioProfileInput): Promise<void>;
  setVisibility(isPublished: boolean): Promise<void>;
  publishArtifact(input: PublishArtifactInput): Promise<void>;
  unpublishArtifact(artifactId: string): Promise<void>;
  refresh(): Promise<void>;
};

const Context = createContext<PortfolioPublicationContextValue | null>(null);

export function createBrowserPortfolioPublicationRepository(): PortfolioPublicationRepository {
  if (typeof window === "undefined") throw new Error("Portfolio publication requires a browser");
  if (isDemoMode() || isSandboxSession()) return new DemoPortfolioPublicationRepository(window.localStorage);
  const client = getBrowserSupabaseClient();
  if (!client) throw new Error("Supabase setup required");
  return new SupabasePortfolioPublicationRepository(client as never);
}

export function PortfolioPublicationProvider({
  children,
  createRepository = createBrowserPortfolioPublicationRepository,
}: {
  children: ReactNode;
  createRepository?: () => PortfolioPublicationRepository;
}) {
  const repositoryRef = useRef<PortfolioPublicationRepository | null>(null);
  const [state, setState] = useState<PortfolioPublicationState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [commandStatus, setCommandStatus] = useState<"idle" | "submitting">("idle");
  const [commandError, setCommandError] = useState<string | null>(null);
  const [commandSuccess, setCommandSuccess] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const repository = repositoryRef.current;
    if (!repository) throw new Error("Portfolio repository unavailable");
    const nextState = await repository.load();
    setState(nextState);
    setLoadError(null);
    setStatus("ready");
  }, []);

  useEffect(() => {
    let cancelled = false;
    try {
      repositoryRef.current ??= createRepository();
      void repositoryRef.current.load().then(
        (nextState) => {
          if (cancelled) return;
          setState(nextState);
          setStatus("ready");
        },
        (error: unknown) => {
          if (cancelled) return;
          setLoadError(error instanceof Error ? error.message : "Portfolio unavailable");
          setStatus("error");
        },
      );
    } catch (error) {
      void Promise.resolve().then(() => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Portfolio unavailable");
        setStatus("error");
      });
    }
    return () => { cancelled = true; };
  }, [createRepository]);

  const command = useCallback(async (
    operation: (repository: PortfolioPublicationRepository) => Promise<void>,
    success: string,
  ) => {
    const repository = repositoryRef.current;
    if (!repository) throw new Error("Portfolio repository unavailable");
    setCommandStatus("submitting");
    setCommandError(null);
    setCommandSuccess(null);
    try {
      await operation(repository);
      await refresh();
      setCommandSuccess(success);
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : "Portfolio command failed");
      throw error;
    } finally {
      setCommandStatus("idle");
    }
  }, [refresh]);

  const value = useMemo<PortfolioPublicationContextValue>(() => ({
    state,
    status,
    commandStatus,
    loadError,
    commandError,
    commandSuccess,
    saveProfile: (input) => command((repository) => repository.saveProfile(input), "Public profile saved. Portfolio remains private until published."),
    setVisibility: (visible) => command((repository) => repository.setVisibility(visible), visible ? "Portfolio published." : "Portfolio hidden."),
    publishArtifact: (input) => command((repository) => repository.publishArtifact(input), "Artifact published."),
    unpublishArtifact: (artifactId) => command((repository) => repository.unpublishArtifact(artifactId), "Artifact removed from public view."),
    refresh,
  }), [state, status, commandStatus, loadError, commandError, commandSuccess, command, refresh]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePortfolioPublication() {
  const value = useContext(Context);
  if (!value) throw new Error("usePortfolioPublication must be used within PortfolioPublicationProvider");
  return value;
}
