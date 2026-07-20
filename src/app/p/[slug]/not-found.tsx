export default function PublicPortfolioNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-command-bg p-6 text-command-text">
      <section className="command-panel max-w-lg border border-command-border bg-command-surface/92 p-8 text-center">
        <p className="font-data text-xs uppercase tracking-[0.24em] text-command-cyan">Signal unavailable</p>
        <h1 className="mt-3 text-3xl font-semibold">Portfolio unavailable</h1>
        <p className="mt-4 text-command-muted">This public evidence record cannot be displayed.</p>
      </section>
    </main>
  );
}
