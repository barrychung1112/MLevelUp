"use client";

import Link from "next/link";
import { ArrowRight, Check, RotateCcw, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { GUIDED_DEMO_SCENARIO as demo } from "./scenario";
import { advanceDemoState, initialDemoState, type DemoAction } from "./state-machine";
import { clearDemoSession, readDemoSession, writeDemoSession } from "./session-store";

export function GuidedDemo({ restart = false }: { restart?: boolean }) {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return initialDemoState();
    if (restart) {
      clearDemoSession(window.sessionStorage);
      return initialDemoState();
    }
    return readDemoSession(window.sessionStorage);
  });
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    writeDemoSession(window.sessionStorage, state);
    headingRef.current?.focus();
  }, [state]);

  function advance(action: DemoAction) {
    setState((current) => advanceDemoState(current, action));
  }

  function reset() {
    clearDemoSession(window.sessionStorage);
    setState(initialDemoState());
  }

  const actions: Partial<Record<number, { label: string; action: DemoAction }>> = {
    1: { label: "View today's training orders", action: "view_orders" },
    2: { label: "Accept daily mission", action: "accept_daily" },
    3: { label: "Submit evidence", action: "submit_evidence" },
    4: { label: "Apply verified result", action: "apply_result" },
    5: { label: "View public proof", action: "view_proof" },
  };
  const action = actions[state.step];

  return (
    <main className="relative min-h-screen overflow-hidden bg-command-bg text-command-text">
      <div aria-hidden="true" className="command-grid pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="command-glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-5 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-command-border pb-4">
          <div>
            <p className="font-data text-[0.65rem] uppercase tracking-[0.3em] text-command-cyan">MLevelUp / Guided demo</p>
            <p className="mt-1 font-data text-xs text-command-muted">{`Step ${state.step} / 6 · Deterministic run`}</p>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <button className="flex min-h-11 items-center gap-2 text-command-muted hover:text-command-text" onClick={reset} type="button">
              <RotateCcw className="size-4" /> Restart guided demo
            </button>
            <Link className="text-command-muted hover:text-command-text" href="/">Exit demo</Link>
          </nav>
        </header>

        <section className="flex flex-1 items-center py-8">
          <div className="w-full">
            <p className="font-data text-xs uppercase tracking-[0.28em] text-command-danger">90-second evidence chain</p>
            <h1 ref={headingRef} tabIndex={-1} className="mt-3 font-display text-3xl font-semibold sm:text-5xl">
              {stepTitle(state.step)}
            </h1>
            <div className="command-panel mt-7 border border-command-border bg-command-surface/90 p-5 shadow-command sm:p-8">
              <StepContent step={state.step} />
            </div>
            <div className="mt-6 flex justify-end">
              {action ? (
                <button onClick={() => advance(action.action)} type="button" className="flex min-h-12 items-center gap-3 border border-command-cyan bg-command-cyan px-6 font-display font-semibold text-command-bg hover:bg-command-text">
                  {action.label}<ArrowRight className="size-4" />
                </button>
              ) : (
                <Link href={`/p/${demo.publicProof.slug}`} className="flex min-h-12 items-center gap-3 border border-command-success bg-command-success px-6 font-display font-semibold text-command-bg hover:bg-command-text">
                  Open public portfolio<ArrowRight className="size-4" />
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function stepTitle(step: number) {
  return ["", "Failure creates a consequence.", "Recovery and progress run together.", "Evidence replaces self-reporting.", "AI advises. Policy decides.", "Verified work changes the record.", "Growth ends in public proof."][step];
}

function StepContent({ step }: { step: number }) {
  if (step === 1) return <div className="grid gap-6 md:grid-cols-[1fr_auto]"><div><p className="text-command-muted">Challenger / Level {demo.challenger.level}</p><h2 className="mt-2 font-display text-2xl">{demo.challenger.name} · {demo.challenger.goal}</h2><p className="mt-5 text-lg">Yesterday: {demo.yesterday.title}</p><p className="mt-2 text-command-danger">{demo.yesterday.completedCheckpoints} of {demo.yesterday.totalCheckpoints} checkpoints completed before the deadline.</p><p className="mt-2 text-command-muted">Missing: {demo.yesterday.missingItems.join(" and ")}.</p></div><div className="border-l border-command-danger pl-6"><p className="font-data text-xs uppercase text-command-muted">Award</p><p className="mt-2 font-display text-4xl text-command-danger">0 XP</p></div></div>;
  if (step === 2) return <div className="grid gap-5 md:grid-cols-2"><Order tone="danger" label="Penalty · completed" title={demo.penalty.title} body={`${demo.penalty.summary} ${demo.penalty.estimatedMinutes} min · ${demo.penalty.xpAwarded} XP.`} /><Order tone="cyan" label="Today's adjusted mission" title={demo.dailyMission.title} body={`${demo.dailyMission.summary} ${demo.dailyMission.estimatedMinutes} min.`}><ul className="mt-4 space-y-2 text-sm text-command-muted">{demo.dailyMission.acceptanceCriteria.map((item) => <li key={item}>— {item}</li>)}</ul></Order></div>;
  if (step === 3) return <div><p className="font-data text-xs uppercase tracking-widest text-command-cyan">Prefilled evidence · no external request</p><h2 className="mt-3 font-display text-2xl">{demo.evidence.reportName}</h2><div className="mt-6 grid gap-4 sm:grid-cols-3"><Metric label="Seed 11" value={demo.evidence.seed11Score.toFixed(3)} /><Metric label="Seed 29" value={demo.evidence.seed29Score.toFixed(3)} /><Metric label="Absolute difference" value={demo.evidence.absoluteDifference.toFixed(3)} /></div><p className="mt-6 border-l border-command-border pl-4 text-command-muted">{demo.evidence.reflection}</p><p className="mt-4 font-data text-xs text-command-muted">Fixture reference: {demo.evidence.commitUrl}</p></div>;
  if (step === 4) return <div className="grid gap-6 md:grid-cols-[1fr_16rem]"><div><p className="inline-flex border border-command-warning/60 px-3 py-1 font-data text-xs uppercase text-command-warning">{demo.feedback.disclaimer}</p><p className="mt-5 text-lg">{demo.feedback.summary}</p><p className="mt-4 text-command-muted">Next action: {demo.feedback.nextAction}</p></div><div className="border border-command-success/50 bg-command-success/5 p-5"><p className="font-data text-xs uppercase text-command-success">Policy decision · {demo.decision.verificationStatus}</p><p className="mt-3 font-display text-4xl">{demo.decision.qualityScore} / 100</p>{demo.decision.checks.map((check) => <p className="mt-3 flex gap-2 text-sm" key={check}><Check className="size-4 text-command-success" />{check}</p>)}</div></div>;
  if (step === 5) return <div><p className="font-data text-xs uppercase tracking-widest text-command-success">Deterministic reward applied</p><div className="mt-5 grid gap-4 sm:grid-cols-3"><Metric label="Experience" value={`+${demo.reward.xpAwarded} XP`} /><Metric label="Evaluation" value={`${demo.reward.evaluationBefore} → ${demo.reward.evaluationAfter}`} /><Metric label="Communication" value={`${demo.reward.communicationBefore} → ${demo.reward.communicationAfter}`} /></div><p className="mt-6 text-command-muted">Created artifact: <span className="text-command-text">{demo.reward.artifactTitle}</span></p></div>;
  return <div className="grid gap-6 md:grid-cols-[1fr_auto]"><div><p className="font-data text-xs uppercase tracking-widest text-command-success">Public portfolio ready</p><h2 className="mt-3 font-display text-3xl">A claim backed by verified work.</h2><p className="mt-4 max-w-2xl text-command-muted">The recovered failure remains in the training history. The verified report becomes an independent achievement a reviewer can inspect.</p></div><div className="grid grid-cols-3 gap-4"><Metric label="Artifacts" value={String(demo.publicProof.verifiedArtifacts)} /><Metric label="Skills" value={`${demo.publicProof.demonstratedSkills}/7`} /><Metric label="Quality" value={`${demo.publicProof.averageQuality}`} /></div></div>;
}

function Order({ tone, label, title, body, children }: { tone: "danger" | "cyan"; label: string; title: string; body: string; children?: React.ReactNode }) {
  return <article className={`border p-5 ${tone === "danger" ? "border-command-danger/50" : "border-command-cyan/50"}`}><p className={`font-data text-xs uppercase ${tone === "danger" ? "text-command-danger" : "text-command-cyan"}`}>{tone === "danger" && <ShieldAlert className="mr-2 inline size-4" />}{label}</p><h2 className="mt-3 font-display text-xl">{title}</h2><p className="mt-3 text-command-muted">{body}</p>{children}</article>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="border border-command-border bg-command-raised/60 p-4"><p className="font-data text-[0.65rem] uppercase tracking-wider text-command-muted">{label}</p><p className="mt-2 font-display text-2xl text-command-text">{value}</p></div>;
}
