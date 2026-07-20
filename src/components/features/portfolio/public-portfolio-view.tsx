"use client";

import { ArrowUpRight, CheckCircle2, Radar } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { SkillKey } from "@/domain/training/types";
import { summarizePublicPortfolio, type PublicPortfolio, type PublishedArtifact } from "@/portfolio/contracts";

const SKILL_LABELS: Record<SkillKey, string> = { dataHandling: "Data Handling", modeling: "Modeling", evaluation: "Evaluation", engineering: "Engineering", researchSense: "Research Sense", productThinking: "Product Thinking", communication: "Communication" };
const selectClass = "min-h-11 rounded-sm border border-command-border bg-command-bg/85 px-3 text-sm text-command-text outline-none focus-visible:border-command-cyan";

function safeHttps(url: string | null) {
  if (!url) return null;
  try { const parsed = new URL(url); return parsed.protocol === "https:" ? parsed.toString() : null; } catch { return null; }
}

function ArtifactCard({ artifact }: { artifact: PublishedArtifact }) {
  const href = safeHttps(artifact.artifactUrl);
  const content = <><div className="flex flex-wrap items-center justify-between gap-3"><Badge tone={artifact.featured ? "success" : "neutral"}>{artifact.featured ? "Featured evidence" : artifact.artifactType}</Badge><span className="font-data text-sm text-command-cyan">{artifact.qualityScore}/100</span></div><h3 className="mt-5 text-xl font-semibold text-command-text">{artifact.publicTitle}</h3><p className="mt-3 leading-7 text-command-muted">{artifact.publicSummary}</p><div className="mt-5 flex flex-wrap gap-2">{artifact.skillTags.map((skill) => <Badge key={skill}>{SKILL_LABELS[skill]}</Badge>)}</div></>;
  return <article className="command-panel h-full border border-command-border bg-command-surface/90 p-5 transition hover:-translate-y-1 hover:border-command-cyan/45 hover:shadow-[0_18px_55px_rgba(0,0,0,0.28)]">{href ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${artifact.publicTitle} — open evidence`} className="block h-full">{content}<span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-command-cyan">Inspect evidence <ArrowUpRight className="size-4" /></span></a> : content}</article>;
}

export function PublicPortfolioView({ portfolio }: { portfolio: PublicPortfolio }) {
  const [skill, setSkill] = useState("all");
  const [type, setType] = useState("all");
  const summary = summarizePublicPortfolio(portfolio.artifacts);
  const types = [...new Set(portfolio.artifacts.map((artifact) => artifact.artifactType))].sort();
  const visible = useMemo(() => portfolio.artifacts.filter((artifact) => (skill === "all" || artifact.skillTags.includes(skill as SkillKey)) && (type === "all" || artifact.artifactType === type)), [portfolio.artifacts, skill, type]);
  const featured = portfolio.artifacts.filter((artifact) => artifact.featured).slice(0, 3);

  return <main className="min-h-screen overflow-hidden bg-command-bg text-command-text"><div aria-hidden className="pointer-events-none fixed inset-0 opacity-50 [background-image:linear-gradient(rgba(77,231,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(77,231,255,.035)_1px,transparent_1px)] [background-size:44px_44px]" /><div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-16"><header className="border-b border-command-border pb-9"><p className="font-data text-xs uppercase tracking-[0.3em] text-command-cyan">Verified field record · MLevelUp</p><h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight sm:text-6xl">{portfolio.profile.displayName}</h1><p className="mt-4 max-w-3xl text-xl text-command-text/85">{portfolio.profile.headline}</p><p className="mt-4 max-w-2xl leading-7 text-command-muted">{portfolio.profile.bio}</p></header>
  <div className="mt-10 grid gap-10 lg:grid-cols-[280px_1fr]"><aside className="space-y-6 lg:sticky lg:top-8 lg:self-start"><section className="command-panel border border-command-cyan/35 bg-command-surface/90 p-5"><div className="flex items-center gap-3"><Radar className="size-5 text-command-cyan" /><h2 className="font-semibold">Evidence signal</h2></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><strong>{summary.artifactCount} artifacts</strong><span>{summary.featuredCount} featured</span><span>{summary.averageQualityScore} avg quality</span><span>{summary.demonstratedSkillCount}/7 skills</span></div></section><section><h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-command-muted">Evidence-backed skills</h2><ul className="mt-4 space-y-2">{Object.entries(summary.skillCoverage).filter(([, count]) => count > 0).map(([key, count]) => <li key={key} className="flex items-center justify-between border-b border-command-border/60 py-2 text-sm"><span>{SKILL_LABELS[key as SkillKey]} · {count}</span><CheckCircle2 className="size-4 text-command-success" /></li>)}</ul></section></aside>
  <div className="space-y-12">{featured.length ? <section><p className="font-data text-xs uppercase tracking-[0.22em] text-command-success">Selected proof</p><h2 className="mt-2 text-3xl font-semibold">Featured work</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{featured.map((artifact) => <ArtifactCard key={artifact.artifactId} artifact={artifact} />)}</div></section> : null}<section><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-data text-xs uppercase tracking-[0.22em] text-command-cyan">Evidence archive</p><h2 className="mt-2 text-3xl font-semibold">All artifacts</h2></div><div className="flex flex-wrap gap-3"><label className="grid gap-1 text-xs text-command-muted">Filter by skill<select aria-label="Filter by skill" className={selectClass} value={skill} onChange={(event) => setSkill(event.target.value)}><option value="all">All skills</option>{Object.entries(SKILL_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="grid gap-1 text-xs text-command-muted">Filter by type<select aria-label="Filter by type" className={selectClass} value={type} onChange={(event) => setType(event.target.value)}><option value="all">All types</option>{types.map((item) => <option key={item}>{item}</option>)}</select></label></div></div><div className="mt-6 grid gap-4 md:grid-cols-2">{visible.map((artifact) => <ArtifactCard key={artifact.artifactId} artifact={artifact} />)}</div>{visible.length === 0 ? <p className="mt-8 text-command-muted">No evidence matches these filters.</p> : null}</section></div></div></div></main>;
}
