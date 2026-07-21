export function ChallengerSilhouette() {
  return (
    <div data-testid="challenger-silhouette" aria-hidden="true" className="challenger-figure pointer-events-none absolute inset-y-0 -right-32 w-80 opacity-15 sm:-right-20 sm:w-96 sm:opacity-25 lg:right-[24%] lg:w-[28rem] lg:opacity-55">
      <div className="challenger-aura" />
      <div className="challenger-body">
        <div className="challenger-head"><span className="challenger-visor" /></div>
        <div className="challenger-neck" />
        <div className="challenger-torso"><span className="challenger-seam" /><span className="challenger-core" /></div>
        <div className="challenger-shoulder challenger-shoulder-left" />
        <div className="challenger-shoulder challenger-shoulder-right" />
      </div>
      <div className="challenger-scan" />
      <div className="challenger-ground" />
    </div>
  );
}
