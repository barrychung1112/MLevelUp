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
        <div><dt className="text-command-muted">Estimated effort</dt><dd>{mission.estimatedMinutes} minutes</dd></div>
        <div><dt className="text-command-muted">Difficulty</dt><dd>{mission.difficulty} / 5</dd></div>
        <div><dt className="text-command-muted">Duration</dt><dd>{mission.durationDays} days</dd></div>
        {mission.dueAt ? <div><dt className="text-command-muted">Due</dt><dd>{mission.dueAt}</dd></div> : null}
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
  errorMessage = "Unable to load the Command Center.",
}: DashboardOverviewProps) {
  if (status === "loading") return <p role="status" className="text-command-muted">Loading the Command Center…</p>;
  if (status === "error") return <p role="alert" className="text-command-danger">{errorMessage}</p>;

  return (
    <section aria-labelledby="dashboard-title" className="space-y-6">
      <header className="grid gap-4 border-b border-command-border pb-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-command-cyan">Command center</p>
          <h1 id="dashboard-title" className="text-3xl font-semibold text-command-text">Training Command Center</h1>
          <p className="mt-2 text-command-muted">Target: Machine Learning Engineer · 5 hours every day</p>
        </div>
        <dl className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <div><dt className="text-command-muted">Level</dt><dd className="font-data">Level {level}</dd></div>
          <div><dt className="text-command-muted">Experience</dt><dd className="font-data">{currentXp} / {nextLevelXp} XP</dd></div>
          <div><dt className="text-command-muted">Completion streak</dt><dd className="font-data">{streakDays} days</dd></div>
        </dl>
      </header>

      {trainingStatus === "failure_review" ? (
        <div role="dialog" aria-modal="true" aria-labelledby="failure-review-title" className="command-panel border border-command-danger/60 bg-command-danger/10 p-6">
          <h2 id="failure-review-title" className="text-2xl font-semibold text-command-danger">Abandon the challenge?</h2>
          <p className="mt-3 text-command-muted">You have missed required progress for {failureDays} consecutive days. Abandoning immediately resets your level, XP, skills, and mission progress. Continuing begins a three-day recovery window.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" onClick={onContinueChallenge}>Continue Challenge</Button>
            <Button type="button" variant="danger" onClick={onAbandonChallenge}>Abandon and Reset</Button>
          </div>
        </div>
      ) : null}

      {trainingStatus === "recovery" ? (
        <Panel aria-labelledby="recovery-title" className="border-command-warning/60 bg-command-warning/5">
          <h2 id="recovery-title" className="text-xl font-semibold text-command-warning">Three-Day Recovery Window</h2>
          <p className="mt-2 text-command-muted">Deadline: {recoveryDeadline ?? "Calculating"}</p>
          <p className="mt-1 font-semibold text-command-text">{penalties.length} recovery missions remaining</p>
          <p className="mt-2 text-sm text-command-danger">If every penalty mission is not cleared before the deadline, all training progress resets automatically.</p>
        </Panel>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="space-y-6">
          {mainMission ? <MissionCard heading="Mainline Mission" mission={mainMission} actionLabel="Open Mainline Mission" onOpen={() => onOpenQuest(mainMission.id)} /> : null}
          {dailyMission ? <MissionCard heading="Daily Mission (24 hours)" mission={dailyMission} actionLabel="Open Daily Mission" onOpen={() => onOpenQuest(dailyMission.id)} /> : null}
          {penalties.length > 0 ? (
            <section aria-labelledby="penalties-title" className="space-y-3">
              <h2 id="penalties-title" className="text-xl font-semibold text-command-danger">Penalty Missions</h2>
              {penalties.map((penalty) => <MissionCard key={penalty.id} heading="Additional Training" mission={penalty} actionLabel="Begin Recovery" tone="danger" onOpen={() => onOpenQuest(penalty.id)} />)}
            </section>
          ) : null}
          {!mainMission && !dailyMission && penalties.length === 0 && trainingStatus === "normal" ? (
            <EmptyState title="No executable missions" description="The system is preparing your next measurable challenge." />
          ) : null}

          <Panel aria-labelledby="skills-title">
            <h2 id="skills-title" className="text-lg font-semibold">Seven Skill Scores</h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">{skills.map((skill) => <li key={skill.key} className="flex justify-between border-b border-command-border pb-2"><span className="text-command-muted">{skill.label}</span><span className="font-data">{skill.value} / 100</span></li>)}</ul>
          </Panel>
          <Panel aria-labelledby="resources-title">
            <h2 id="resources-title" className="text-lg font-semibold">Available Resources</h2>
            {resources.length ? <ul className="mt-3 space-y-2">{resources.map((resource) => <li key={resource.id}><a className="text-command-cyan underline-offset-4 hover:underline" href={resource.url} target="_blank" rel="noreferrer">{resource.title}</a></li>)}</ul> : <p className="mt-2 text-command-muted">No additional resources are available.</p>}
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel>
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="text-lg font-semibold">Daily AI Feedback</h2>
              <Badge tone={feedback.provenance === "AI" ? "cyan" : feedback.provenance === "Deterministic fallback" ? "warning" : "neutral"}>
                {feedback.provenance}
              </Badge>
            </div>
            <p className="mt-3 text-command-muted">{feedback.summary}</p>
            {feedback.adjustmentExplanation ? (
              <p className="mt-3 border-l border-command-cyan/50 pl-3 text-sm text-command-muted">
                Adjustment reason: {feedback.adjustmentExplanation}
              </p>
            ) : null}
            {feedback.confidence !== undefined ? (
              <p className="mt-2 text-xs text-command-muted">AI confidence {Math.round(feedback.confidence * 100)}%</p>
            ) : null}
          </Panel>
          <Panel><h2 className="text-lg font-semibold">Agent Status</h2><ul className="mt-3 space-y-3">{agents.map((agent) => <li key={agent.id}><strong>{agent.name}</strong><StatusIndicator className="mt-1" tone={agentTone(agent.status)}>{agent.status} · {agent.summary}</StatusIndicator></li>)}</ul></Panel>
          <Panel><h2 className="text-lg font-semibold">Latest Artifact</h2><p className="mt-2 text-command-muted">{recentArtifact ? `${recentArtifact.title} · Quality ${recentArtifact.qualityScore}` : "No portfolio artifacts yet."}</p></Panel>
          <Panel><h2 className="text-lg font-semibold">Latest Activity</h2><p className="mt-2 text-command-muted">{recentActivity ? `${recentActivity.title} · ${recentActivity.summary}` : "No training activity yet."}</p></Panel>
        </aside>
      </div>
    </section>
  );
}
