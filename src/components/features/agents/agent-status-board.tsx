import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusIndicator } from "@/components/ui/status-indicator";

import type { AgentRunView, LoadableViewProps } from "../view-models";

type AgentStatusBoardProps = LoadableViewProps & {
  agents: readonly AgentRunView[];
};

function statusTone(status: string): "idle" | "active" | "success" | "warning" | "danger" {
  if (status === "complete") return "success";
  if (status === "idle") return "idle";
  if (status === "reviewing" || status === "running") return "active";
  if (status === "failed" || status === "error") return "danger";
  return "warning";
}

export function AgentStatusBoard({ agents, status = "ready", errorMessage = "Unable to load Agent Status." }: AgentStatusBoardProps) {
  if (status === "loading") return <p role="status" className="text-command-muted">Reading Agent Status…</p>;
  if (status === "error") return <p role="alert" className="text-command-danger">{errorMessage}</p>;
  if (agents.length === 0) return <EmptyState title="No Agent runs yet." description="Submit your first mission to see AI or deterministic fallback diagnostics." />;

  return (
    <section aria-labelledby="agents-heading" className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.24em] text-command-warning">Agent telemetry</p>
        <h1 id="agents-heading" className="text-3xl font-semibold text-command-text">Agent Status</h1>
        <p className="mt-2 text-command-muted">Latest execution state for learning agents and the resource collection schedule.</p>
      </header>
      <ul className="grid gap-4 md:grid-cols-2">
        {agents.map((agent) => (
          <li key={agent.id} className="command-panel border border-command-border bg-command-surface/92 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-command-text">{agent.name}</h2>
              <Badge tone={agent.provenance === "AI" ? "cyan" : agent.provenance === "Fallback" ? "warning" : "neutral"}>
                {agent.provenance}
              </Badge>
            </div>
            <p className="mt-4 flex gap-2 text-sm">
              <span className="text-command-muted">Status</span>
              <StatusIndicator tone={statusTone(agent.status)}>{agent.status}</StatusIndicator>
            </p>
            <p className="mt-2 text-command-muted">{agent.summary}</p>
            <p className="mt-3 text-sm text-command-muted">Last run: {agent.lastRun}</p>
            {agent.model || agent.promptVersion ? (
              <p className="mt-1 text-xs text-command-muted">
                {[agent.model, agent.promptVersion, agent.latencyMs !== undefined ? `${agent.latencyMs} ms` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            {agent.errorCode ? <p className="mt-1 text-xs text-command-danger">Error: {agent.errorCode}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
