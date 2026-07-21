"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { localDateForInstant } from "@/domain/training/calendar";
import { selectAssignmentsForDate } from "@/domain/training/selectors";
import { useTraining } from "@/providers/training-provider";

import { TrainingPageShell } from "../_components/training-page-shell";

export default function QuestsPage() {
  const training = useTraining();
  const state = training.snapshot;
  const assignments = state
    ? selectAssignmentsForDate(state, localDateForInstant(new Date().toISOString(), state.profile.timezone))
    : [];

  return (
    <TrainingPageShell>
      {training.status === "loading" ? <p role="status" className="text-command-muted">Synchronizing missions…</p> : null}
      {training.status === "error" ? <p role="alert" className="text-command-danger">{training.loadError}</p> : null}
      {training.status === "ready" ? (
        <section aria-labelledby="quests-heading" className="space-y-6">
          <header><p className="text-sm uppercase tracking-[0.24em] text-command-cyan">Mission board</p><h1 id="quests-heading" className="text-3xl font-semibold">Missions</h1></header>
          {assignments.length === 0 ? <EmptyState title="No missions assigned" description="The system is preparing your next measurable challenge." /> : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {assignments.map((assignment) => {
                const quest = state?.quests[assignment.questId];
                if (!quest) return null;
                return <li key={assignment.id} className="command-panel border border-command-border bg-command-surface/92 p-5"><div className="flex justify-between gap-3"><Badge>{assignment.slot}</Badge><span className="text-sm text-command-muted">{assignment.status}</span></div><h2 className="mt-4 text-xl font-semibold">{quest.title}</h2><p className="mt-2 text-command-muted">{quest.summary}</p><Link className="mt-5 inline-flex min-h-11 items-center border border-command-cyan px-4 text-command-cyan hover:bg-command-cyan/10" href={`/quests/${assignment.id}`}>Open Mission</Link></li>;
              })}
            </ul>
          )}
        </section>
      ) : null}
    </TrainingPageShell>
  );
}
