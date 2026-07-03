// Shown when no Card is due and the daily new-card cap is exhausted. A
// quiet glass surface per the design spec's "Empty/loading" note.
export function EmptyState() {
  return (
    <div className="glass flex w-full max-w-md flex-col items-center gap-3 rounded-[var(--r-xl)] px-8 py-12 text-center animate-fade-in">
      <p className="text-4xl animate-gentle-bounce">🎉</p>
      <p className="text-lg font-semibold text-foreground">All caught up</p>
      <p className="text-sm text-foreground-muted">
        No Cards are due right now. Check back later.
      </p>
    </div>
  );
}
