// Shown when no Card is due and the daily new-card cap is exhausted.
export function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-3xl">🎉</p>
      <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
        All caught up
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No Cards are due right now. Check back later.
      </p>
    </div>
  );
}
