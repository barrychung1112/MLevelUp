"use client";

import { Copy, Eye, EyeOff, LockKeyhole, RadioTower } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import type { PortfolioPublicationState, PublicPortfolioProfileInput, PublishArtifactInput, PublishedArtifact } from "@/portfolio/contracts";

import type { PortfolioArtifactView } from "../view-models";
import { ArtifactPublicationDialog } from "./artifact-publication-dialog";
import { ArtifactEnhancementPanel } from "./artifact-enhancement-panel";
import type { AchievementDraftView } from "@/portfolio/portfolio-command-client";

type Props = {
  privateArtifacts: readonly PortfolioArtifactView[];
  publication: PortfolioPublicationState;
  status: "loading" | "ready" | "error";
  commandStatus: "idle" | "submitting";
  errorMessage?: string | null;
  successMessage?: string | null;
  onSaveProfile(input: PublicPortfolioProfileInput): Promise<void>;
  onSetVisibility(isPublished: boolean): Promise<void>;
  onPublishArtifact(input: PublishArtifactInput): Promise<void>;
  onUnpublishArtifact(artifactId: string): Promise<void>;
  onVerifyLink?(artifactId: string): Promise<{ ok: boolean; status?: string; code?: string }>;
  onGenerateAchievements?(artifactId: string, replace: boolean): Promise<{ ok: boolean; draft?: AchievementDraftView; code?: string }>;
  onUpdateAchievements?(artifactId: string, action: "save" | "approve", bullets: Array<{ id: string; text: string }>): Promise<{ ok: boolean; status?: string; code?: string }>;
};

function ArtifactFacts({ artifact }: { artifact: PortfolioArtifactView }) {
  return <><div className="flex flex-wrap gap-2"><Badge>{artifact.artifactType}</Badge><Badge tone="success">Quality {artifact.qualityScore}</Badge></div><div className="mt-3 flex flex-wrap gap-2">{artifact.skillTags.map((skill) => <Badge key={skill}>{skill}</Badge>)}</div></>;
}

export function PortfolioManager(props: Props) {
  const profile = props.publication.profile;
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [slug, setSlug] = useState(profile?.slug ?? "");
  const [headline, setHeadline] = useState(profile?.headline ?? "Machine Learning Engineer in Training");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [editing, setEditing] = useState<{ artifact: PortfolioArtifactView; snapshot?: PublishedArtifact } | null>(null);
  const publishedIds = new Set(props.publication.artifacts.map((artifact) => artifact.artifactId));
  const publishable = props.privateArtifacts.filter((artifact) => artifact.verificationStatus === "verified" && !publishedIds.has(artifact.id));
  const blocked = props.privateArtifacts.filter((artifact) => artifact.verificationStatus !== "verified");
  const busy = props.commandStatus === "submitting";
  const enhancement = (artifactId: string) => props.onVerifyLink && props.onGenerateAchievements && props.onUpdateAchievements ? <ArtifactEnhancementPanel artifactId={artifactId} onVerify={props.onVerifyLink} onGenerate={props.onGenerateAchievements} onUpdate={props.onUpdateAchievements} /> : null;

  async function save(event: FormEvent) {
    event.preventDefault();
    await props.onSaveProfile({ slug, displayName, headline, bio });
  }

  if (props.status === "loading") return <p role="status" className="text-command-muted">Loading portfolio controls…</p>;
  if (props.status === "error") return <p role="alert" className="text-command-danger">{props.errorMessage ?? "Portfolio controls unavailable."}</p>;

  return (
    <section className="space-y-8" aria-labelledby="portfolio-heading">
      <header className="border-b border-command-border pb-6">
        <p className="font-data text-xs uppercase tracking-[0.24em] text-command-cyan">Evidence transmission control</p>
        <h1 id="portfolio-heading" className="mt-2 text-3xl font-semibold text-command-text">Public portfolio</h1>
        <p className="mt-2 max-w-3xl text-command-muted">Your training vault stays private. Publish only verified evidence you explicitly choose.</p>
      </header>

      <Panel tone="accent" className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <form onSubmit={(event) => void save(event)} className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
          <Field label="Public slug" description={`/p/${slug || "your-slug"}`} value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} required />
          <Field label="Headline" className="sm:col-span-2" value={headline} onChange={(event) => setHeadline(event.target.value)} required />
          <Field label="Bio" className="sm:col-span-2" value={bio} onChange={(event) => setBio(event.target.value)} />
          <Button type="submit" loading={busy} className="sm:col-span-2 sm:justify-self-start">Save public profile</Button>
        </form>
        <div className="flex min-w-56 flex-col gap-3 border-t border-command-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <Badge tone={profile?.isPublished ? "success" : "neutral"}>{profile?.isPublished ? "LIVE" : "PRIVATE"}</Badge>
          {profile ? <Button onClick={() => void props.onSetVisibility(!profile.isPublished)} loading={busy} variant={profile.isPublished ? "danger" : "primary"}>{profile.isPublished ? <EyeOff className="size-4" /> : <RadioTower className="size-4" />}{profile.isPublished ? "Hide portfolio" : "Publish portfolio"}</Button> : null}
          {profile ? <Button variant="secondary" onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/p/${profile.slug}`)}><Copy className="size-4" />Copy public URL</Button> : null}
        </div>
      </Panel>

      {props.successMessage ? <p role="status" className="text-sm text-command-success">{props.successMessage}</p> : null}
      {props.errorMessage ? <p role="alert" className="text-sm text-command-danger">{props.errorMessage}</p> : null}

      <div className="grid gap-8">
        <section><div className="mb-4 flex items-center gap-3"><Eye className="size-5 text-command-success" /><h2 className="text-2xl font-semibold">Published</h2><Badge>{props.publication.artifacts.length}</Badge></div><ul className="grid gap-4 md:grid-cols-2">{props.publication.artifacts.map((snapshot) => { const source = props.privateArtifacts.find((item) => item.id === snapshot.artifactId); return <li key={snapshot.artifactId} className="command-panel border border-command-success/35 bg-command-surface/92 p-5"><h3 className="text-lg font-semibold">{snapshot.publicTitle}</h3><p className="mt-2 text-sm text-command-muted">{snapshot.publicSummary}</p><div className="mt-4 flex gap-2"><Button size="sm" variant="secondary" disabled={!source} onClick={() => source && setEditing({ artifact: source, snapshot })}>Edit</Button><Button size="sm" variant="danger" onClick={() => void props.onUnpublishArtifact(snapshot.artifactId)}>Unpublish</Button></div>{enhancement(snapshot.artifactId)}</li>; })}</ul>{props.publication.artifacts.length === 0 ? <p className="text-sm text-command-muted">No public evidence yet.</p> : null}</section>
        <section><div className="mb-4 flex items-center gap-3"><RadioTower className="size-5 text-command-cyan" /><h2 className="text-2xl font-semibold">Publishable</h2><Badge>{publishable.length}</Badge></div><ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{publishable.map((artifact) => <li key={artifact.id} className="command-panel border border-command-border bg-command-surface/92 p-5"><h3 className="text-lg font-semibold">{artifact.title}</h3><p className="mt-2 text-sm text-command-muted">{artifact.summary}</p><div className="mt-4"><ArtifactFacts artifact={artifact} /></div><Button className="mt-5" size="sm" aria-label={`Publish artifact: ${artifact.title}`} onClick={() => setEditing({ artifact })}>Publish artifact</Button>{enhancement(artifact.id)}</li>)}</ul>{publishable.length === 0 ? <p className="text-sm text-command-muted">Complete a task with verified evidence to unlock publication.</p> : null}</section>
        <section><div className="mb-4 flex items-center gap-3"><LockKeyhole className="size-5 text-command-warning" /><h2 className="text-2xl font-semibold">Not publishable</h2><Badge>{blocked.length}</Badge></div><ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{blocked.map((artifact) => <li key={artifact.id} className="command-panel border border-command-warning/25 bg-command-surface/60 p-5"><h3 className="text-lg font-semibold">{artifact.title}</h3><p className="mt-2 text-sm text-command-warning">Verification: {artifact.verificationStatus}</p><div className="mt-4"><ArtifactFacts artifact={artifact} /></div></li>)}</ul></section>
      </div>

      {editing ? <ArtifactPublicationDialog artifact={editing.artifact} snapshot={editing.snapshot} submitting={busy} onClose={() => setEditing(null)} onSubmit={props.onPublishArtifact} /> : null}
    </section>
  );
}
