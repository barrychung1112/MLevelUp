"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import type { LoadableViewProps, ProfilePreferencesView } from "../view-models";

type Props = LoadableViewProps & {
  profile: ProfilePreferencesView | null;
  onReset: () => void;
  onSignOut?: () => void;
  isSubmitting?: boolean;
  submitError?: string;
  successMessage?: string;
};

export function ProfileSettings({
  profile,
  onReset,
  onSignOut,
  status = "ready",
  errorMessage = "Unable to load training settings.",
  submitError,
  successMessage,
}: Props) {
  const id = useId();
  const [confirmingReset, setConfirmingReset] = useState(false);
  if (status === "loading") return <p role="status">Loading training settings…</p>;
  if (status === "error") return <p role="alert">{errorMessage}</p>;
  if (!profile) return <EmptyState title="Training settings not found" description="Complete registration before opening your profile." />;

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-8">
      <header>
        <p className="font-data text-xs uppercase tracking-[0.24em] text-command-cyan">Training profile</p>
        <h1 id={`${id}-heading`} className="font-display text-3xl font-semibold text-command-text">Training Profile</h1>
      </header>
      {submitError ? <p role="alert" className="text-command-danger">{submitError}</p> : null}
      {successMessage ? <p role="status" className="text-command-success">{successMessage}</p> : null}
      <Panel className="max-w-2xl border-command-cyan/40 bg-command-cyan/5">
        <p className="text-sm text-command-muted">Target Role</p>
        <p className="mt-1 font-display text-xl font-semibold text-command-text">{profile.targetRoleLabel}</p>
        <p className="mt-4 text-sm text-command-muted">Training Commitment</p>
        <p className="mt-1 font-semibold text-command-cyan">5 hours every day</p>
      </Panel>
      {onSignOut ? (
        <Panel className="max-w-2xl">
          <h2 className="font-display text-lg font-semibold text-command-text">Account</h2>
          <Button className="mt-4" variant="secondary" type="button" onClick={onSignOut}>Sign Out</Button>
        </Panel>
      ) : null}
      <Panel className="max-w-2xl border-command-danger/40 bg-command-danger/5">
        <h2 className="font-display text-lg font-semibold text-command-text">Danger Zone</h2>
        <Button className="mt-4" variant="danger" type="button" onClick={() => setConfirmingReset(true)}>
          Reset Training Data
        </Button>
      </Panel>
      <Dialog
        open={confirmingReset}
        onOpenChange={setConfirmingReset}
        title="Reset all training data?"
        closeLabel="Close reset dialog"
        footer={<><Button variant="secondary" type="button" onClick={() => setConfirmingReset(false)}>Cancel</Button><Button variant="danger" type="button" onClick={() => { onReset(); setConfirmingReset(false); }}>Confirm Reset</Button></>}
      >
        <p className="text-sm text-command-muted">Your level, XP, skill scores, and active missions will restart from zero.</p>
      </Dialog>
    </section>
  );
}
