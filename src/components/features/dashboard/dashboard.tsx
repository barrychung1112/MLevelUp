import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { StatusIndicator } from "@/components/ui/status-indicator";

import type {
  ActivityView,
  AgentRunView,
  FeedbackView,
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
  trainingStatus: "normal" | "failure_review" | "recovery";
  failureDays: number;
  recoveryDeadline: string | null;
  mainMission: QuestView | null;
  dailyMission: QuestView | null;
  penalties: readonly QuestView[];
  skills: readonly SkillStatView[];
  feedback: FeedbackView;
  resources: readonly ResourceView[];
  agents: readonly AgentRunView[];
  recentArtifact: PortfolioArtifactView | null;
  recentActivity: ActivityView | null;
  onOpenQuest: (assignmentId: string) => void;
  onContinueChallenge: () => void;
  onAbandonChallenge: () => void;
};

function agentTone(status: string): "idle" | "active" | "success" | "warning" | "danger" {
  if (status === "complete") return "success";
  if (status === "idle") return "idle";
  if (status === "running" || status === "reviewing") return "active";
  if (status === "failed" || status === "error") return "danger";
  return "warning";
}

function MissionCard({
  heading,
  mission,
  actionLabel,
  onOpen,
  tone = "cyan",
}: {
  heading: string;
  mission: QuestView;
  actionLabel: string;
  onOpen: () => void;
  tone?: "cyan" | "danger";
}) {
  return (
    <article className={`command-panel border p-5 ${tone === "danger" ? "border-command-danger/50 bg-command-danger/5" : "border-command-cyan/50 bg-command-cyan/5"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-command-cyan">{heading}</h2>
          <h3 className="mt-2 text-xl font-semibold text-command-text">{mission.title}</h3>
        </div>
        <Badge tone={tone === "danger" ? "danger" : "cyan"}>{mission.status}</Badge>
      </div>
      <p className="mt-2 text-command-muted">{mission.summary}</p>
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div><dt className="text-command-muted">預估投入</dt><dd>{mission.estimatedMinutes} 分鐘</dd></div>
        <div><dt className="text-command-muted">任務難度</dt><dd>{mission.difficulty} / 5</dd></div>
        <div><dt className="text-command-muted">期間</dt><dd>{mission.durationDays} 天</dd></div>
        {mission.dueAt ? <div><dt className="text-command-muted">截止時間</dt><dd>{mission.dueAt}</dd></div> : null}
      </dl>
      <Button className="mt-5" type="button" variant={tone === "danger" ? "danger" : "primary"} onClick={onOpen}>
        {actionLabel}
      </Button>
    </article>
  );
}

export function DashboardOverview({
  level,
  currentXp,
  nextLevelXp,
  streakDays,
  trainingStatus,
  failureDays,
  recoveryDeadline,
  mainMission,
  dailyMission,
  penalties,
  skills,
  feedback,
  resources,
  agents,
  recentArtifact,
  recentActivity,
  onOpenQuest,
  onContinueChallenge,
  onAbandonChallenge,
  status = "ready",
  errorMessage = "無法載入任務終端。",
}: DashboardOverviewProps) {
  if (status === "loading") return <p role="status" className="text-command-muted">正在載入任務終端…</p>;
  if (status === "error") return <p role="alert" className="text-command-danger">{errorMessage}</p>;

  return (
    <section aria-labelledby="dashboard-title" className="space-y-6">
      <header className="grid gap-4 border-b border-command-border pb-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-command-cyan">Command center</p>
          <h1 id="dashboard-title" className="text-3xl font-semibold text-command-text">今日訓練終端</h1>
          <p className="mt-2 text-command-muted">目標：機器學習工程師 · 每日固定 5 小時</p>
        </div>
        <dl className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <div><dt className="text-command-muted">等級</dt><dd className="font-data">Level {level}</dd></div>
          <div><dt className="text-command-muted">經驗值</dt><dd className="font-data">{currentXp} / {nextLevelXp} XP</dd></div>
          <div><dt className="text-command-muted">連續完成</dt><dd className="font-data">{streakDays} 天</dd></div>
        </dl>
      </header>

      {trainingStatus === "failure_review" ? (
        <div role="dialog" aria-modal="true" aria-labelledby="failure-review-title" className="command-panel border border-command-danger/60 bg-command-danger/10 p-6">
          <h2 id="failure-review-title" className="text-2xl font-semibold text-command-danger">是否放棄挑戰？</h2>
          <p className="mt-3 text-command-muted">你已連續 {failureDays} 天未完成預定義務。放棄會立刻清零等級、XP、能力值與任務進度；繼續則進入三日追回期。</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" onClick={onContinueChallenge}>繼續挑戰</Button>
            <Button type="button" variant="danger" onClick={onAbandonChallenge}>放棄並清零</Button>
          </div>
        </div>
      ) : null}

      {trainingStatus === "recovery" ? (
        <Panel aria-labelledby="recovery-title" className="border-command-warning/60 bg-command-warning/5">
          <h2 id="recovery-title" className="text-xl font-semibold text-command-warning">三日追回期</h2>
          <p className="mt-2 text-command-muted">截止：{recoveryDeadline ?? "計算中"}</p>
          <p className="mt-1 font-semibold text-command-text">待追回 {penalties.length} 項</p>
          <p className="mt-2 text-sm text-command-danger">期限內未清除所有懲罰任務，訓練進度會自動清零。</p>
        </Panel>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="space-y-6">
          {mainMission ? <MissionCard heading="大型主線任務" mission={mainMission} actionLabel="開啟主要任務" onOpen={() => onOpenQuest(mainMission.id)} /> : null}
          {dailyMission ? <MissionCard heading="每日任務（24 小時）" mission={dailyMission} actionLabel="開啟每日任務" onOpen={() => onOpenQuest(dailyMission.id)} /> : null}
          {penalties.length > 0 ? (
            <section aria-labelledby="penalties-title" className="space-y-3">
              <h2 id="penalties-title" className="text-xl font-semibold text-command-danger">懲罰任務</h2>
              {penalties.map((penalty) => <MissionCard key={penalty.id} heading="額外訓練" mission={penalty} actionLabel="開始追回" tone="danger" onOpen={() => onOpenQuest(penalty.id)} />)}
            </section>
          ) : null}
          {!mainMission && !dailyMission && penalties.length === 0 && trainingStatus === "normal" ? (
            <EmptyState title="目前沒有可執行任務" description="系統正在準備下一項可衡量的挑戰。" />
          ) : null}

          <Panel aria-labelledby="skills-title">
            <h2 id="skills-title" className="text-lg font-semibold">七項能力值</h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">{skills.map((skill) => <li key={skill.key} className="flex justify-between border-b border-command-border pb-2"><span className="text-command-muted">{skill.label}</span><span className="font-data">{skill.value} / 100</span></li>)}</ul>
          </Panel>
          <Panel aria-labelledby="resources-title">
            <h2 id="resources-title" className="text-lg font-semibold">可用資源</h2>
            {resources.length ? <ul className="mt-3 space-y-2">{resources.map((resource) => <li key={resource.id}><a className="text-command-cyan underline-offset-4 hover:underline" href={resource.url} target="_blank" rel="noreferrer">{resource.title}</a></li>)}</ul> : <p className="mt-2 text-command-muted">目前沒有額外資源。</p>}
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel>
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="text-lg font-semibold">AI 每日回饋</h2>
              <Badge tone={feedback.provenance === "AI" ? "cyan" : feedback.provenance === "Deterministic fallback" ? "warning" : "neutral"}>
                {feedback.provenance}
              </Badge>
            </div>
            <p className="mt-3 text-command-muted">{feedback.summary}</p>
            {feedback.adjustmentExplanation ? (
              <p className="mt-3 border-l border-command-cyan/50 pl-3 text-sm text-command-muted">
                調整原因：{feedback.adjustmentExplanation}
              </p>
            ) : null}
            {feedback.confidence !== undefined ? (
              <p className="mt-2 text-xs text-command-muted">AI 信心 {Math.round(feedback.confidence * 100)}%</p>
            ) : null}
          </Panel>
          <Panel><h2 className="text-lg font-semibold">Agent 狀態</h2><ul className="mt-3 space-y-3">{agents.map((agent) => <li key={agent.id}><strong>{agent.name}</strong><StatusIndicator className="mt-1" tone={agentTone(agent.status)}>{agent.status} · {agent.summary}</StatusIndicator></li>)}</ul></Panel>
          <Panel><h2 className="text-lg font-semibold">最新作品</h2><p className="mt-2 text-command-muted">{recentArtifact ? `${recentArtifact.title} · Quality ${recentArtifact.qualityScore}` : "尚未建立作品集成果。"}</p></Panel>
          <Panel><h2 className="text-lg font-semibold">最新紀錄</h2><p className="mt-2 text-command-muted">{recentActivity ? `${recentActivity.title} · ${recentActivity.summary}` : "尚無訓練紀錄。"}</p></Panel>
        </aside>
      </div>
    </section>
  );
}
