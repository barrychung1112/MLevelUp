import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { StatusIndicator } from "@/components/ui/status-indicator";

import type {
  ActivityView,
  AgentRunView,
  LoadableViewProps,
  PortfolioArtifactView,
  QuestView,
  ResourceView,
  SkillStatView,
} from "../view-models";

type DashboardOverviewProps = LoadableViewProps & {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  streakDays: number;
  contractLabel: string;
  primaryQuest: QuestView | null;
  skills: readonly SkillStatView[];
  feedback: string;
  resources: readonly ResourceView[];
  agents: readonly AgentRunView[];
  recentArtifact: PortfolioArtifactView | null;
  recentActivity: ActivityView | null;
  onOpenPrimaryQuest: () => void;
};

function agentTone(status: string): "idle" | "active" | "success" | "warning" | "danger" {
  if (status === "complete") return "success";
  if (status === "idle") return "idle";
  if (status === "running" || status === "reviewing") return "active";
  if (status === "failed" || status === "error") return "danger";
  return "warning";
}

export function DashboardOverview({
  level,
  currentXp,
  nextLevelXp,
  streakDays,
  contractLabel,
  primaryQuest,
  skills,
  feedback,
  resources,
  agents,
  recentArtifact,
  recentActivity,
  onOpenPrimaryQuest,
  status = "ready",
  errorMessage = "無法載入今日指揮中心。",
}: DashboardOverviewProps) {
  if (status === "loading") return <p role="status" className="text-command-muted">正在同步今日任務…</p>;
  if (status === "error") return <p role="alert" className="text-command-danger">{errorMessage}</p>;
  if (!primaryQuest) return <EmptyState title="今天尚未派發任務" description="任務情報正在整理，請稍後重新整理。" />;

  return (
    <section aria-labelledby="dashboard-title" className="space-y-6">
      <header className="grid gap-4 border-b border-command-border pb-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-command-cyan">Command center</p>
          <h1 id="dashboard-title" className="text-3xl font-semibold text-command-text">今日訓練指揮中心</h1>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div><dt className="text-command-muted">等級</dt><dd className="font-data text-command-text">Level {level}</dd></div>
          <div><dt className="text-command-muted">經驗值</dt><dd className="font-data text-command-text">{currentXp} / {nextLevelXp} XP</dd></div>
          <div><dt className="text-command-muted">連續訓練</dt><dd className="font-data text-command-text">連續 {streakDays} 天</dd></div>
          <div><dt className="text-command-muted">契約</dt><dd className="text-command-text">{contractLabel}</dd></div>
        </dl>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="space-y-6">
          <article aria-label="今日主要任務" className="command-panel border border-command-cyan/60 bg-command-cyan/5 p-6 shadow-[0_0_32px_rgba(77,231,255,0.08)]">
            <p className="text-xs uppercase tracking-[0.24em] text-command-cyan">Primary quest</p>
            <h2 className="mt-2 text-2xl font-semibold text-command-text">{primaryQuest.title}</h2>
            <p className="mt-2 text-command-muted">{primaryQuest.summary}</p>
            <dl className="mt-5 flex flex-wrap gap-4 text-sm">
              <div><dt className="text-command-muted">預估時間</dt><dd className="text-command-text">{primaryQuest.estimatedMinutes} 分鐘</dd></div>
              <div><dt className="text-command-muted">難度</dt><dd className="text-command-text">{primaryQuest.difficulty} / 5</dd></div>
              <div><dt className="text-command-muted">主要能力</dt><dd className="text-command-text">{primaryQuest.primarySkill}</dd></div>
              <div><dt className="text-command-muted">證據</dt><dd className="text-command-text">{primaryQuest.evidenceTypes.join(" · ")}</dd></div>
            </dl>
            <Button className="mt-6" type="button" onClick={onOpenPrimaryQuest}>開始主要任務</Button>
          </article>

          <Panel aria-labelledby="skills-title">
            <h2 id="skills-title" className="text-lg font-semibold text-command-text">七項能力值</h2>
            {skills.length === 0 ? <p className="mt-3 text-command-muted">尚無能力資料。</p> : (
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {skills.map((skill) => (
                  <li key={skill.key} className="grid grid-cols-[1fr_auto] gap-3 border-b border-command-border pb-2">
                    <span className="text-command-muted">{skill.label}</span>
                    <span className="font-data text-command-text">{skill.value} / 100</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel aria-labelledby="resources-title">
            <h2 id="resources-title" className="text-lg font-semibold text-command-text">推薦資源</h2>
            {resources.length === 0 ? <p className="mt-3 text-command-muted">目前沒有推薦資源。</p> : (
              <ul className="mt-3 space-y-3">
                {resources.map((resource) => (
                  <li key={resource.id} className="flex flex-wrap justify-between gap-2 border-l-2 border-command-violet pl-3">
                    <span className="text-command-text">{resource.title}</span>
                    <span className="text-sm text-command-muted">{resource.estimatedMinutes} 分鐘 · {resource.resourceType}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel aria-labelledby="feedback-title">
            <div className="flex items-center justify-between gap-3">
              <h2 id="feedback-title" className="text-lg font-semibold text-command-text">AI 每日回饋</h2>
              <Badge tone="warning">Demo</Badge>
            </div>
            <p className="mt-3 text-command-muted">{feedback}</p>
          </Panel>

          <Panel aria-labelledby="agents-title">
            <h2 id="agents-title" className="text-lg font-semibold text-command-text">Agent 狀態</h2>
            {agents.length === 0 ? <p className="mt-3 text-command-muted">沒有 Agent 狀態。</p> : (
              <ul className="mt-3 space-y-3">
                {agents.map((agent) => (
                  <li key={agent.id} className="border-b border-command-border pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-command-text">{agent.name}</strong>
                      <Badge tone="warning">Demo</Badge>
                    </div>
                    <StatusIndicator className="mt-1" tone={agentTone(agent.status)}>{agent.status} · {agent.summary}</StatusIndicator>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel aria-labelledby="artifact-title">
            <h2 id="artifact-title" className="text-lg font-semibold text-command-text">最近作品</h2>
            {recentArtifact ? <p className="mt-3 text-command-muted">{recentArtifact.title} · Quality {recentArtifact.qualityScore}</p> : <p className="mt-3 text-command-muted">尚未累積作品。</p>}
          </Panel>

          <Panel aria-labelledby="activity-title">
            <h2 id="activity-title" className="text-lg font-semibold text-command-text">最近戰鬥紀錄</h2>
            {recentActivity ? <p className="mt-3 text-command-muted">{recentActivity.title} · {recentActivity.summary}</p> : <p className="mt-3 text-command-muted">尚無訓練紀錄。</p>}
          </Panel>
        </aside>
      </div>
    </section>
  );
}
