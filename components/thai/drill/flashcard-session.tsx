"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { getUnitProgressSnapshot, submitFlashcardGrade } from "@/lib/thai/actions";
import type { FlashcardCard } from "@/lib/thai/flashcards";
import { AudioPlayButton } from "@/components/thai/audio-play-button";
import { Celebration } from "@/components/ui/celebration";

interface Props {
  unit: number;
  cards: FlashcardCard[];
  nextUnitWasUnlocked: boolean;
  // A per-request seed minted by the server component. The deck is shuffled
  // deterministically from it so the server and client produce the SAME order
  // (no hydration mismatch) while still varying session-to-session.
  shuffleSeed: number;
}

// Unit 2 flashcard pilot (owner-approved 2026-07-05): a self-graded
// clear-the-deck loop, not multiple choice. Every card is revealed from the
// start (no locked subset, no "due"): front = the glyph, flip to check the
// sound + acrophonic name + audio, then self-grade "Knew it" / "Missed it".
// A missed card goes to the BACK of the queue and must be cleared to finish;
// clearing the whole deck once takes unit 2 to 100% and unlocks unit 3 (the
// mastery/unlock math is server-side — see lib/thai/actions.ts::
// submitFlashcardGrade + lib/thai/reachability.ts::unitMasteryStats).

// Deterministic PRNG (mulberry32) so a shuffle can be reproduced from a seed.
// Using Math.random() directly would make the server and client shuffle
// differently, desyncing the first card and throwing a hydration mismatch.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function FlashcardSession({ unit, cards, nextUnitWasUnlocked, shuffleSeed }: Props) {
  const total = cards.length;
  // Shuffle once per session (useState initializer → stable across re-renders)
  // so a card's position can't become a memorisation crutch. Seeded from the
  // server-minted `shuffleSeed` so SSR and hydration agree on the order. The
  // queue holds exactly the not-yet-cleared cards, each once; a miss re-appends,
  // never duplicates, so queue.length === total - clearedCount at all times.
  const [queue, setQueue] = useState<FlashcardCard[]>(() => shuffle(cards, shuffleSeed));
  const [flipped, setFlipped] = useState(false);
  // Modern ⇄ classical Thai letterform. Defaults to "looped" — the classical
  // textbook form a beginner learns first; "loopless" is the modern signage cut.
  // Applies to the big glyph and the Thai name (see `thaiFont` below).
  const [thaiStyle, setThaiStyle] = useState<"looped" | "loopless">("looped");
  const [clearedIds, setClearedIds] = useState<Set<string>>(() => new Set());
  const [missedCount, setMissedCount] = useState(0);
  const [summary, setSummary] = useState<{
    percentMastered: number;
    nextUnitNewlyUnlocked: boolean;
    nextUnit: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const current = queue[0];
  const clearedCount = clearedIds.size;
  const thaiFont = thaiStyle === "looped" ? "font-thai-looped" : "font-thai-loopless";

  if (!total) {
    return (
      <div className="rounded-[var(--r-lg)] border border-border-base bg-surface p-6 text-sm text-foreground-muted">
        No flashcards are available for this unit yet.
      </div>
    );
  }

  function grade(knewIt: boolean) {
    if (!current || pending || summary) return;
    const card = current;
    startTransition(async () => {
      await submitFlashcardGrade(card.itemId, knewIt);
      setFlipped(false);
      if (knewIt) {
        setClearedIds((prev) => new Set(prev).add(card.itemId));
        const rest = queue.slice(1);
        setQueue(rest);
        if (rest.length === 0) {
          const snap = await getUnitProgressSnapshot(unit);
          setSummary(snap);
        }
      } else {
        setMissedCount((c) => c + 1);
        // Rotate to the back — the card must still be cleared to finish.
        setQueue((q) => [...q.slice(1), q[0]]);
      }
    });
  }

  if (summary) {
    // Confetti is reserved for the genuine milestone (unit 3 unlocking for the
    // first time this session), exactly as the MCQ DrillSession gates it.
    const unlockedThisRound = summary.nextUnitNewlyUnlocked && !nextUnitWasUnlocked;
    return (
      <div className="flex flex-col gap-6 rounded-[var(--r-lg)] border border-border-base bg-surface p-6 animate-slide-up-fade">
        <h2 className="text-lg font-semibold text-foreground">Deck cleared</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Cards read" value={`${total} / ${total}`} />
          <StatTile label="Slips" value={missedCount} />
          <StatTile label={`Unit ${unit}`} value={`${summary.percentMastered}%`} />
        </div>
        {unlockedThisRound && (
          <Celebration show>
            <div className="rounded-[var(--r-md)] bg-highlight px-4 py-3 text-sm font-semibold text-on-earthy animate-pop-in">
              🎉 Unit {summary.nextUnit} unlocked!
            </div>
          </Celebration>
        )}
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-[var(--r-pill)] bg-accent px-5 py-2 text-sm font-semibold text-on-earthy transition-opacity hover:opacity-90"
          >
            Back to units
          </Link>
        </div>
      </div>
    );
  }

  // Deck just cleared: the completion snapshot is in flight. React commits this
  // render in the gap between setQueue([]) and setSummary (auto-batching does
  // not span an await), so guard against dereferencing an empty queue here
  // instead of crashing on `current.glyph`.
  if (!current) {
    return (
      <div className="rounded-[var(--r-lg)] border border-border-base bg-surface p-6 text-sm text-foreground-muted">
        Finishing…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
          Read {clearedCount} / {total}
          {queue.length > 0 && ` · ${queue.length} to go`}
        </div>
        <div
          role="group"
          aria-label="Thai letterform style"
          className="inline-flex rounded-[var(--r-pill)] border border-border-base p-0.5"
        >
          {(
            [
              ["looped", "Classical"],
              ["loopless", "Modern"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setThaiStyle(value)}
              aria-pressed={thaiStyle === value}
              className={`rounded-[var(--r-pill)] px-3 py-1 text-xs font-medium transition-colors ${
                thaiStyle === value
                  ? "bg-accent text-on-earthy"
                  : "text-foreground-muted hover:bg-background"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-[16rem] flex-col items-center justify-center gap-5 rounded-[var(--r-lg)] border border-border-base bg-surface p-8">
        <div className={`${thaiFont} text-[6rem] leading-none text-foreground`}>{current.glyph}</div>
        {flipped ? (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="flex gap-3">
              <SoundTile label="Initial" ipa={current.sound} />
              <SoundTile label="Final" ipa={current.finalSound} />
            </div>
            <div className={`${thaiFont} text-lg text-foreground`}>{current.name}</div>
            {current.nameIpa && (
              <div className="font-mono text-sm text-foreground-muted">[{current.nameIpa}]</div>
            )}
            {current.audioUrl && <AudioPlayButton url={current.audioUrl} label="▶ Hear it" size="sm" />}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setFlipped(true)}
              disabled={pending}
              className="rounded-[var(--r-pill)] border border-border-base px-5 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-background disabled:opacity-60"
            >
              Tap to reveal
            </button>
            {current.alreadyRead && (
              <span className="text-[0.7rem] uppercase tracking-wide text-foreground-muted">
                Seen before
              </span>
            )}
          </>
        )}
      </div>

      {flipped ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => grade(false)}
            disabled={pending}
            className="rounded-[var(--r-lg)] border-2 border-clay bg-clay px-4 py-3 text-center font-medium text-on-earthy transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Missed it
          </button>
          <button
            type="button"
            onClick={() => grade(true)}
            disabled={pending}
            className="rounded-[var(--r-lg)] border-2 border-success bg-success px-4 py-3 text-center font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Knew it
          </button>
        </div>
      ) : (
        <p className="text-center text-xs text-foreground-muted">
          Say the sound out loud, then reveal to check.
        </p>
      )}
    </div>
  );
}

// A single labelled sound on the reveal — the letter's initial- vs
// final-position IPA (Thai consonants often differ between the two, e.g. จ is
// /tɕ/ initial but /t/ final). A null final (e.g. อ, which can't close a
// syllable) renders "—".
function SoundTile({ label, ipa }: { label: string; ipa: string | null }) {
  return (
    <div className="min-w-[5rem] rounded-[var(--r-md)] bg-background px-4 py-2 text-center">
      <div className="text-[0.65rem] uppercase tracking-wide text-foreground-muted">{label}</div>
      <div className="font-mono text-xl text-foreground">{ipa ? `/${ipa}/` : "—"}</div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--r-md)] bg-background p-3">
      <div className="text-xs text-foreground-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}
