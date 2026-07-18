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

export function AgentStatusBoard({ agents, status = "ready", errorMessage = "無法載入 Agent 狀態。" }: AgentStatusBoardProps) {
  if (status === "loading") return <p role="status" className="text-command-muted">正在讀取 Agent 狀態…</p>;
  if (status === "error") return <p role="alert" className="text-command-danger">{errorMessage}</p>;
  if (agents.length === 0) return <EmptyState title="目前沒有 Agent 執行紀錄。" description="提交第一個任務後會顯示 AI 或 fallback 診斷。" />;

  return (
    <section aria-labelledby="agents-heading" className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.24em] text-command-warning">Agent telemetry</p>
        <h1 id="agents-heading" className="text-3xl font-semibold text-command-text">Agent 狀態</h1>
        <p className="mt-2 text-command-muted">學習策略、調整者與協調員會顯示真實執行狀態；資源收集維持 Phase 4 Demo。</p>
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
              <span className="text-command-muted">狀態</span>
              <StatusIndicator tone={statusTone(agent.status)}>{agent.status}</StatusIndicator>
            </p>
            <p className="mt-2 text-command-muted">{agent.summary}</p>
            <p className="mt-3 text-sm text-command-muted">最後執行：{agent.lastRun}</p>
            {agent.model ? <p className="mt-1 text-xs text-command-muted">{agent.model}{agent.latencyMs !== undefined ? ` · ${agent.latencyMs} ms` : ""}</p> : null}
            {agent.errorCode ? <p className="mt-1 text-xs text-command-danger">錯誤：{agent.errorCode}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
