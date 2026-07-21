import { ArrowRight, CheckCircle2, TrendingUp } from "lucide-react";
import Link from "next/link";

import type { FeedbackView } from "@/components/features/view-models";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

type MissionCompletionProps = {
  qualityScore: number;
  feedback?: FeedbackView | null;
  nextAssignmentId?: string;
};

export function MissionCompletion({
  qualityScore,
  feedback,
  nextAssignmentId,
}: MissionCompletionProps) {
  const provenanceTone = feedback?.provenance === "AI"
    ? "cyan"
    : feedback?.provenance === "Deterministic fallback"
      ? "warning"
      : "neutral";

  return (
    <section className="space-y-6" aria-labelledby="verified-heading">
      <header>
        <p className="text-sm uppercase tracking-[0.24em] text-command-success">Mission cleared</p>
        <h1 id="verified-heading" className="mt-2 text-3xl font-semibold">Mission Verification Complete</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel>
          <p className="font-data text-xs uppercase tracking-wider text-command-muted">Quality score</p>
          <p className="mt-2 font-display text-3xl text-command-success">{qualityScore} / 100</p>
        </Panel>
        <Panel>
          <p className="font-data text-xs uppercase tracking-wider text-command-muted">Experience awarded</p>
          <p className="mt-2 font-display text-3xl text-command-cyan">+{feedback?.xpAwarded ?? 0} XP</p>
        </Panel>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Training feedback</h2>
          <Badge tone={provenanceTone}>{feedback?.provenance ?? "Deterministic"}</Badge>
        </div>
        <p className="mt-4 leading-7 text-command-muted">{feedback?.summary ?? "Evidence verification passed."}</p>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <FeedbackList title="What worked" items={feedback?.strengths ?? []} />
          <FeedbackList title="Improve next" items={feedback?.improvements ?? []} />
          <FeedbackList title="Next actions" items={feedback?.nextActions ?? []} />
        </div>
      </Panel>

      {feedback?.skillGrowth?.length ? (
        <Panel>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><TrendingUp className="size-5 text-command-cyan" />Skill growth</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {feedback.skillGrowth.map((skill) => (
              <li key={skill.label} className="border border-command-cyan/30 bg-command-cyan/5 px-3 py-2 text-sm text-command-cyan">
                {skill.label} +{skill.delta}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {nextAssignmentId ? (
          <Link className="inline-flex min-h-12 items-center gap-3 border border-command-cyan bg-command-cyan px-5 font-display font-semibold text-command-bg hover:bg-command-text" href={`/quests/${nextAssignmentId}`}>
            Continue to next mission <ArrowRight className="size-4" />
          </Link>
        ) : null}
        <Link className="inline-flex min-h-12 items-center border border-command-border px-5 font-display font-semibold text-command-text hover:border-command-cyan/60" href="/dashboard">
          Return to command center
        </Link>
      </div>
    </section>
  );
}

function FeedbackList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <section>
      <h3 className="font-display font-semibold text-command-text">{title}</h3>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm text-command-muted">
          {items.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-command-success" />{item}</li>)}
        </ul>
      ) : <p className="mt-3 text-sm text-command-muted">No additional note.</p>}
    </section>
  );
}

