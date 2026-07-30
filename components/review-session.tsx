"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { McQuestion, type McVerdict } from "@/components/ladder/mc-question";
import { PassFailRow, RevealButton } from "@/components/ladder/flashcard";
import { submitChoice, submitSelfGrade } from "@/lib/review/actions";
import { spokenSyllablesForPhrase } from "@/lib/mandarin/tone-sandhi";
import { setSessionActive } from "@/lib/ux/session-focus";
import {
  setMcAutoplay,
  setPinyinShown,
  setToneColorOn,
  useMcAutoplay,
  usePinyinShown,
  useToneColorOn,
} from "@/lib/ux/prefs";
import type { StudyCard } from "@/lib/review/types";
import { AudioButton, autoplayAudio, playAudio } from "./audio-button";
import { CardBack } from "./card-back";
import { CardFront } from "./card-front";
import { PinyinSyllables } from "./pinyin-syllables";
import { TogglePill } from "./toggle-pill";

// Owns the per-Card interaction state for Mandarin — the counterpart of
// components/advanced-thai/advanced-review-session.tsx.
//
// IT DISPATCHES ON `card.format`. That is the whole ladder change: a Card is not
// one question any more. The same row is a four-option recognition question at
// step 1, the familiar flip card at step 2, and a cold English→Chinese recall at
// step 3 — where the flip card returns, but front-to-back reversed.
//
// Keyed by card.id at the call site, so the interaction state resets when the
// next Card loads.
//
// Reveal is a 3D spring flip (front -> back) via `motion`, with both faces
// mounted simultaneously (stacked, backface-hidden) inside a perspective
// container. `prefers-reduced-motion` users get an instant swap instead — only
// one face is ever mounted, no 3D transform at all.

// How long the correct/incorrect highlight stays up before the next Card is
// requested. Long enough to read which option was right on a miss, short enough
// that a run of easy Cards does not feel gated. Matches Advanced Thai.
const FEEDBACK_MS = 1100;

// Marks that the Learner committed at least one answer this session, so the
// round-complete screen can tell "just finished a round" from "idle revisit,
// nothing due" and reserve the confetti for the former. Written only AFTER a
// successful await, so a failed submit (network error, auth expiry, stale step)
// never arms the celebration. sessionStorage, so it resets with the tab.
function markAnswered() {
  try {
    sessionStorage.setItem("review-session:rated", "1");
  } catch {
    /* private mode / storage disabled — celebration gate simply won't fire */
  }
}

export function ReviewSession({ card }: { card: StudyCard }) {
  const router = useRouter();

  const [revealed, setRevealed] = useState(false);
  const [verdict, setVerdict] = useState<McVerdict | null>(null);
  const [pending, startTransition] = useTransition();
  // Set the moment an answer is committed, so the Card cannot be answered twice
  // while the feedback timer and the refresh are both in flight.
  const [answered, setAnswered] = useState(false);
  // Display preferences are device-local and REMEMBERED (lib/ux/prefs), not local
  // state: this component is keyed by card.id at the call site, so anything held
  // in useState here is forgotten on every single question — which is exactly
  // what made the old back-face pinyin toggle need re-tapping card after card.
  const pinyinShown = usePinyinShown();
  const toneColorOn = useToneColorOn();
  const autoplay = useMcAutoplay();
  const reduceMotion = useReducedMotion();
  // Which SERVE the pronunciation has already been played for. Holding the card
  // object rather than a boolean means it needs no resetting: a new arrival is a
  // new object, so it simply stops matching. Written only inside the effect —
  // refs must not be touched during render.
  const autoplayedFor = useRef<StudyCard | null>(null);

  // Recede the bottom nav while a review session is on screen (Phase 4) — the
  // store resets on unmount (round complete, or navigating away).
  useEffect(() => {
    setSessionActive(true);
    return () => setSessionActive(false);
  }, []);

  // RESET ON ARRIVAL, NOT ON REMOUNT.
  //
  // Every round ends with a single unfinished Card, and that Card still needs
  // several exposures — so the batch legitimately hands the SAME card.id straight
  // back (lib/ladder/round.ts pickNext has nothing else to return). The call site
  // keys on card.id, so React reuses this component instead of rebuilding it, and
  // every piece of per-serve state survives: `answered` stays true, the verdict
  // stays set, and the Card arrives locked under a stale highlight with its
  // options disabled. Only a page reload cleared it.
  //
  // So the reset hangs off the arrival of card DATA rather than off a remount:
  // each refresh delivers a new card object even when the id is unchanged. This is
  // React's documented "adjust state when props change" pattern — the setStates
  // run during render and re-render immediately, without ever committing the stale
  // UI. Feedback timing is untouched, because arrival is exactly when the previous
  // Card's highlight was going away anyway.
  const [served, setServed] = useState(card);
  if (served !== card) {
    setServed(card);
    setVerdict(null);
    setAnswered(false);
    setRevealed(false);
  }

  const producing = card.format.startsWith("produce");

  // Autoplay the pronunciation once per Card on a RECOGNITION multiple-choice
  // question. Without it step 1 is a pure reading test — the Learner never hears
  // the word at the one step they meet it most often.
  //
  // NEVER on a produce step, and this is the same rule the flip card follows by
  // only playing on reveal: there the options ARE the Chinese, so speaking it
  // aloud would read the answer out. Mandarin's ladder has no produce-mc today,
  // but the format is handled here, so the guard is on the format and not on the
  // course.
  //
  // Once per SERVE rather than once per effect run, so turning the preference ON
  // mid-question plays the current Card while toggling off and back on does not
  // stack up a second play.
  //
  // autoplayAudio, NOT playAudio: an effect is not a user gesture, and iOS
  // refuses a media element outside one — which is exactly why this shipped
  // silent on an iPhone. See lib/ux/audio.ts. The 🔊 replay button beside the
  // prompt stays the fallback for the cases even Web Audio cannot serve
  // (page never touched yet, ringer switch off).
  //
  // Depends on `served` — the arriving card OBJECT — not on card.id or the fields
  // read below. A re-served Card has an identical id and identical audio url, so
  // depending on those would skip the replay on exactly the tail-of-round repeat
  // this is meant to handle.
  useEffect(() => {
    if (autoplayedFor.current === served) return;
    if (served.format !== "recognise-mc" || !autoplay) return;
    autoplayedFor.current = served;
    autoplayAudio(served.wholeAudioUrl);
  }, [served, autoplay]);

  function reveal() {
    if (revealed) return;
    setRevealed(true);
    // Played inside the click/keydown handler so it counts as a user gesture, and
    // only on reveal — never on the front. On a produce step the front asks for
    // the Chinese, and audio before the reveal would answer the question out loud.
    // playAudio is a no-op when wholeAudioUrl is null.
    playAudio(card.wholeAudioUrl);
  }

  function advance() {
    startTransition(() => {
      router.refresh();
    });
  }

  function selfGrade(passed: boolean) {
    if (answered) return;
    setAnswered(true);
    // Turn the face back over the moment it is graded, so the answer is not still
    // sitting there through the submit. The same-Card re-serve this used to be the
    // partial guard for is now handled properly by the arrival check above.
    setRevealed(false);
    startTransition(async () => {
      await submitSelfGrade(card.id, card.step, passed);
      markAnswered();
      router.refresh();
    });
  }

  function choose(choice: string) {
    if (answered) return;
    setAnswered(true);
    startTransition(async () => {
      const result = await submitChoice(card.id, card.step, choice);
      markAnswered();
      setVerdict({ chosen: choice, ...result });
      // The one audio rule: it fires on the COMMIT, alongside the feedback, never
      // before it. The `await` above has already spent the tap's user activation,
      // so this needs the gesture-less player too.
      autoplayAudio(card.wholeAudioUrl);
      setTimeout(advance, FEEDBACK_MS);
    });
  }

  // The answer is committed and the next Card is being fetched. Showing a spinner
  // instead of the answered Card stops it sitting frozen on screen — but NOT
  // while multiple-choice feedback is up, which is the one thing the Learner is
  // meant to be reading.
  if (pending && verdict === null && answered) {
    return (
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-4 py-16 animate-fade-in">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-sage border-t-brand"
          aria-hidden
        />
        <p className="text-sm text-foreground-muted">Next card…</p>
      </div>
    );
  }

  if (card.format === "recognise-mc" || card.format === "produce-mc") {
    return (
      <McQuestion
        eyebrow={producing ? "Which is the Chinese?" : "What does it mean?"}
        prompt={
          producing ? (
            // No audio and no pinyin on a produce step — both would hand over the
            // Chinese the Learner is being asked to pick.
            <p className="text-[clamp(1.25rem,5vw,1.75rem)] font-medium leading-snug text-foreground">
              {card.wholeGloss}
            </p>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p className="font-hanzi text-[clamp(2rem,10vw,3.5rem)] font-medium leading-tight text-foreground">
                {card.headword}
              </p>
              {/* Only derived when actually shown — same phrase-level spoken
                  tones as the flip card's back face, via the shared helper. */}
              {pinyinShown && (
                <PinyinSyllables
                  syllables={spokenSyllablesForPhrase(card.words, card.wholePinyin)}
                  toneColorOn={toneColorOn}
                  className="text-base font-semibold"
                />
              )}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <AudioButton url={card.wholeAudioUrl} label="Play the pronunciation again" />
                <TogglePill
                  label={pinyinShown ? "Hide pinyin" : "Show pinyin"}
                  onToggle={() => setPinyinShown(!pinyinShown)}
                />
                <TogglePill
                  label={autoplay ? "Autoplay on" : "Autoplay off"}
                  onToggle={() => setMcAutoplay(!autoplay)}
                  pressed={autoplay}
                  title="Play the pronunciation automatically on each new card"
                />
              </div>
            </div>
          )
        }
        options={card.options ?? []}
        // Chinese options need the hanzi cut; English glosses must not get it.
        optionClassName={producing ? "font-hanzi text-lg" : "text-sm"}
        verdict={verdict}
        pending={pending}
        onChoose={choose}
      />
    );
  }

  const backFace = (
    <CardBack
      card={card}
      pinyinShown={pinyinShown}
      onTogglePinyin={() => setPinyinShown(!pinyinShown)}
      toneColorOn={toneColorOn}
      onToggleToneColor={() => setToneColorOn(!toneColorOn)}
    />
  );

  const frontFace = (
    <CardFront card={card} direction={producing ? "produce" : "recognise"} />
  );

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 animate-slide-up-fade">
      {/* Tapping/clicking the card is a pointer-only convenience shortcut for
          the SAME action as the "Show answer" button below, which is the
          sole keyboard-focusable control for revealing (no `role`/`tabIndex`
          here — deliberately not a second tab stop for one action). Once
          revealed, the back face's own buttons (audio, chips, pinyin toggle)
          are the interactive surface, so the click handler is removed
          entirely rather than becoming a nested `role="button"` around them
          (which would be invalid ARIA). */}
      <div
        className={`relative aspect-[1/1.12] w-full select-none ${revealed ? "" : "cursor-pointer"}`}
        style={reduceMotion ? undefined : { perspective: 1600 }}
        onClick={revealed ? undefined : reveal}
      >
        {reduceMotion ? (
          revealed ? (
            backFace
          ) : (
            frontFace
          )
        ) : (
          <motion.div
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: revealed ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            {/* Both faces stay mounted throughout the flip (required for the
                3D rotation), so the currently-invisible one is excluded from
                the tab order via `inert` — otherwise a keyboard user could
                Tab into the back face's buttons (pinyin/tone toggles, per-
                word audio + reveal) while it is still rotated away. */}
            <div
              className="absolute inset-0"
              style={{ backfaceVisibility: "hidden" }}
              aria-hidden={revealed}
              inert={revealed}
            >
              {frontFace}
            </div>
            <div
              className="absolute inset-0"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              aria-hidden={!revealed}
              inert={!revealed}
            >
              {backFace}
            </div>
          </motion.div>
        )}
      </div>

      {!revealed ? (
        <RevealButton onClick={reveal} />
      ) : (
        <PassFailRow pending={pending} onGrade={selfGrade} />
      )}
    </div>
  );
}
