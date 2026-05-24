// Shown when no Card is due and the daily new-card cap is exhausted.
export function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 text-center animate-fade-in">
      <p className="text-3xl animate-gentle-bounce">🎉</p>
      <p className="text-lg font-medium text-foreground">
        All caught up
      </p>
      <p className="text-sm text-foreground-muted">
        No Cards are due right now. Check back later.
      </p>
    </div>
  );
}
