// Fisher-Yates and a random sample, with no dependencies of any kind.
//
// These lived privately in lib/thai/drill.ts, which is where the app's only
// other multiple-choice builder is. The ladder's distractor builder needs the
// same two functions, and drill.ts imports the database — so importing them from
// there would drag a DB connection into lib/ladder/, whose whole contract is that
// it is pure and runs under `tsx --test`. Hence a shared module rather than an
// export from drill.ts: one implementation, reachable from both, dependency-free.

export function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** `n` items drawn at random, without replacement. Returns fewer if the pool is smaller. */
export function pick<T>(arr: T[], n: number): T[] {
  return shuffled(arr).slice(0, n);
}
