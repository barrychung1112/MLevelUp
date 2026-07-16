import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { Progress } from "@/components/ui/progress";

import type { LoadableViewProps, SkillStatView, TrendPointView } from "../view-models";

type ProgressReviewProps = LoadableViewProps & {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  skills: readonly SkillStatView[];
  radarSummary: string;
  trendSummary: string;
  trend: readonly TrendPointView[];
};

export function ProgressReview({
  level,
  currentXp,
  nextLevelXp,
  skills,
  radarSummary,
  trendSummary,
  trend,
  status = "ready",
  errorMessage = "無法載入成長資料。",
}: ProgressReviewProps) {
  if (status === "loading") return <p role="status" className="text-command-muted">正在整理能力成長…</p>;
  if (status === "error") return <p role="alert" className="text-command-danger">{errorMessage}</p>;
  if (skills.length === 0) return <EmptyState title="能力成長尚未啟動" description="完成第一個任務後，能力成長會顯示在這裡。" />;

  const radarPoints = skills.map((skill, index) => {
    const angle = (Math.PI * 2 * index) / skills.length - Math.PI / 2;
    const radius = (skill.value / 100) * 78;
    return `${100 + Math.cos(angle) * radius},${100 + Math.sin(angle) * radius}`;
  }).join(" ");
  const maxTrend = Math.max(...trend.map((point) => point.value), 1);
  const trendPoints = trend.map((point, index) => `${20 + index * (160 / Math.max(trend.length - 1, 1))},${180 - (point.value / maxTrend) * 150}`).join(" ");

  return (
    <section aria-labelledby="progress-heading" className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-command-border pb-5">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-command-success">Stat progression</p>
          <h1 id="progress-heading" className="text-3xl font-semibold text-command-text">能力成長</h1>
        </div>
        <p className="font-data text-command-text">Level {level} · {currentXp} / {nextLevelXp} XP</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel aria-labelledby="exact-skills-heading">
          <h2 id="exact-skills-heading" className="text-lg font-semibold text-command-text">七項能力精確值</h2>
          <ul className="mt-4 space-y-4">
            {skills.map((skill) => (
              <li key={skill.key}>
                <Progress label={skill.label} value={skill.value} max={100} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel aria-labelledby="radar-heading">
          <h2 id="radar-heading" className="text-lg font-semibold text-command-text">能力雷達</h2>
          <svg role="img" aria-label="七項能力雷達圖" className="mx-auto mt-3 h-52 w-52" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" className="text-command-border" />
            <polygon points={radarPoints} className="fill-command-cyan/20 stroke-command-cyan" strokeWidth="2" />
          </svg>
          <p className="mt-3 text-command-muted">{radarSummary}</p>
        </Panel>

        <Panel aria-labelledby="trend-heading" className="lg:col-span-2">
          <h2 id="trend-heading" className="text-lg font-semibold text-command-text">成長趨勢</h2>
          <svg role="img" aria-label="能力成長趨勢圖" className="mt-3 h-52 w-full" viewBox="0 0 200 200" preserveAspectRatio="none">
            <polyline points={trendPoints} fill="none" className="stroke-command-success" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          </svg>
          <p className="mt-3 text-command-muted">{trendSummary}</p>
          <ul className="mt-3 flex flex-wrap gap-4 text-sm text-command-muted">
            {trend.map((point) => <li key={point.label}>{point.label}: {point.value}</li>)}
          </ul>
        </Panel>
      </div>
    </section>
  );
}
