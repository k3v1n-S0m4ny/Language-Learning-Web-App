"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { autoplayAudio, playAudio } from "@/components/audio-button";
import { McQuestion, type McVerdict } from "@/components/ladder/mc-question";
import { PassFailRow, RevealButton } from "@/components/ladder/flashcard";
import {
  gradeAdvancedChoice,
  nextAdvancedPracticeCard,
  submitAdvancedChoice,
  submitAdvancedSelfGrade,
} from "@/lib/advanced-thai/actions";
import type { AtNext, AtStudyCard } from "@/lib/advanced-thai/types";
import { setSessionActive } from "@/lib/ux/session-focus";
import { useActionKeys, useAnswerKeys } from "@/lib/ux/keyboard";
import { PhraseSlab } from "./phrase-slab";
import { useThaiFont } from "./kit";
import { KeyLegend, StageRail } from "./stage-rail";
import { VocabLexemeSlab } from "./vocab-lexeme-slab";

// Owns the per-card interaction state for Advanced Thai — the counterpart of
// components/review-session.tsx.
//
// IT DISPATCHES ON `card.format`, NOT ON `card.kind`. That inversion is the whole
// ladder change: a card is not one question any more. The same vocab row is a
// four-option recognition question at step 1, a flip card at step 2, a
// four-option production question at step 3 and a cold recall at step 4. Kind
// still decides which FACE draws the card (the two bake-off designs), but format
// decides what is being ASKED, and those are now different axes.
//
// Keyed by card.id at the call site, so the interaction state resets when the
// next card loads.
//
// `mode` decides whether an answer is RECORDED. A round writes ladder state; a
// practice drill does not write at all, so its cards cannot climb, cannot be
// demoted and cannot be dragged into a round by being drilled. The interaction is
// otherwise identical, deliberately — practice should feel like study, it just
// must not count as it.
//
// THE NEXT CARD IS NOT FETCHED HERE. It arrives in the grading action's own
// return value and is handed up through `onAdvance` — this component never calls
// router.refresh(), and the page is never re-rendered to change cards. See
// AtNextRound. What that buys is the ordering the flow reads in: the answer is
// acknowledged, then graded, then the reveal is held while the next card loads
// BEHIND it, and the swap when it comes is instant.

// How long a CORRECT answer's highlight stays up before the next card is served.
// It only has to confirm what the Learner already knows, so it is short.
//
// A wrong answer has no constant, because it is not on a clock at all: it holds
// on the reveal until Continue is pressed. Any timer long enough to read and
// absorb the option you missed is far too long on the cards you did not miss, and
// the old single 1100ms compromise did neither job — it was a beat too slow on a
// run of easy cards and nowhere near enough on the one card that mattered.
const CORRECT_ADVANCE_MS = 900;

// The longest the beat will be extended to let a clip finish. Advanced Thai
// vocab clips run well under this, so in practice the ceiling is never the thing
// that fires — it exists because waiting on audio means waiting on a callback
// from outside React, and a clip that never reports itself done would otherwise
// strand the Learner on a card they have already answered correctly. Nothing in
// this flow may be able to deadlock on a sound.
const AUDIO_WAIT_CEILING_MS = 2600;

export function AdvancedReviewSession({
  card,
  mode = "round",
  rail,
  onAdvance,
}: {
  card: AtStudyCard;
  mode?: "round" | "practice";
  /**
   * The left rail's contents, on desktop only. Supplied by the screen because
   * the counts are the screen's to know — a round has remaining/repeats, a
   * practice drill has a pool size, and this component reads neither. The RIGHT
   * rail is built here instead, because the key legend has to track which keys
   * are actually bound on the current step, which is state only this file holds.
   */
  rail?: ReactNode;
  /**
   * Hands the next card up to the screen, which owns which card is on display.
   * Takes the whole AtNext union because this component serves both flows and
   * reads neither payload's counts; each screen narrows on `flow`.
   */
  onAdvance: (next: AtNext) => void;
}) {
  const thai = useThaiFont();

  const [revealed, setRevealed] = useState(false);
  const [verdict, setVerdict] = useState<McVerdict | null>(null);
  const [pending, startTransition] = useTransition();
  // The option the Learner tapped, set SYNCHRONOUSLY in the click handler and so
  // painted before the server has been asked anything. This is the tap
  // acknowledgement; without it the grid sits inert for the whole grading round
  // trip with no sign the tap registered.
  const [chosen, setChosen] = useState<string | null>(null);
  // Set the moment an answer is committed, so the card cannot be answered twice
  // while the advance and the next card are both in flight.
  const [answered, setAnswered] = useState(false);
  // The next card, in hand while the reveal is still on screen. Applied when the
  // Learner is done reading it, never before.
  const [pendingNext, setPendingNext] = useState<AtNext | null>(null);
  // Held so the auto-advance can wait for the clip rather than cutting across it.
  const clip = useRef<ReturnType<typeof autoplayAudio>>(null);
  // Kept in a ref so the advance effect does not depend on the callback's
  // identity — a caller that rebuilds it every render would otherwise restart the
  // beat mid-feedback, and no caller should have to know that.
  const advanceRef = useRef(onAdvance);
  useEffect(() => {
    advanceRef.current = onAdvance;
  });

  // Recede the bottom nav while a session is on screen; resets on unmount.
  useEffect(() => {
    setSessionActive(true);
    return () => setSessionActive(false);
  }, []);

  // RESET ON ARRIVAL, NOT ON REMOUNT.
  //
  // Every round ends with a single unfinished card, and that card still needs
  // several exposures — so the batch legitimately hands the SAME card.id straight
  // back (lib/ladder/round.ts pickNext has nothing else to return). The call site
  // keys on card.id, so React reuses this component instead of rebuilding it, and
  // every piece of per-serve state survives: `answered` stays true, the verdict
  // stays set, and the card arrives locked under a stale highlight with its
  // options disabled. Only a page reload cleared it.
  //
  // So the reset hangs off the arrival of card DATA rather than off a remount:
  // each answer delivers a new card object even when the id is unchanged. This is
  // React's documented "adjust state when props change" pattern — the setStates
  // run during render and re-render immediately, without ever committing the stale
  // UI. Feedback timing is untouched, because arrival is exactly when the previous
  // card's highlight was going away anyway.
  //
  // Practice mode needs it just as much: it never writes, so a drilled card is
  // ALWAYS still eligible and a one-card pool re-serves the same id every time.
  const [served, setServed] = useState(card);
  if (served !== card) {
    setServed(card);
    setVerdict(null);
    setChosen(null);
    setAnswered(false);
    setRevealed(false);
    setPendingNext(null);
  }

  const producing = card.format.startsWith("produce");

  function reveal() {
    if (revealed) return;
    setRevealed(true);
    // Played inside the click/keydown handler so it counts as a user gesture, and
    // only on reveal — never on the front. On a produce step the front asks for
    // the Thai, and audio before the commit would answer the question out loud.
    playAudio(card.audioUrl);
  }

  // WHICH SERVE HAS ALREADY BEEN COMMITTED — the synchronous half of the
  // double-submit guard, and the keyboard is why it now has to exist.
  //
  // `answered` is React state, so `if (answered) return` only sees what the
  // CURRENT render closed over. Two events dispatched in the same frame both
  // read false and both reach the server. With a pointer that was close enough
  // to impossible to ignore — you cannot click two option buttons at once — but
  // pressing 1 and 2 inside one frame is something a keyboard does by accident.
  //
  // A ref is checked and set synchronously, so the second event in the same
  // frame sees the first one's write. It holds the card OBJECT rather than a
  // boolean for the same reason `autoplayedFor` does: a re-serve is always a new
  // object (see the arrival note above), so it stops matching on its own and
  // there is nothing to reset — which matters because the reset would otherwise
  // have to happen during render, where refs must not be touched.
  const committedFor = useRef<AtStudyCard | null>(null);

  function selfGrade(passed: boolean) {
    if (answered || committedFor.current === card) return;
    committedFor.current = card;
    setAnswered(true);
    // Turn the face back over the moment it is graded, so the answer is not still
    // sitting there through the submit. The same-card re-serve this used to be the
    // partial guard for is now handled properly by the arrival check above.
    setRevealed(false);
    startTransition(async () => {
      // Practice records nothing — the Learner has already seen the answer and the
      // verdict is theirs alone. But the next DRAW is still the server's to make,
      // so there is a call either way; only the write differs.
      const next =
        mode === "practice"
          ? await nextAdvancedPracticeCard(card.id)
          : (await submitAdvancedSelfGrade(card.id, card.step, passed)).next;
      onAdvance(next);
    });
  }

  function choose(choice: string) {
    if (answered || committedFor.current === card) return;
    committedFor.current = card;
    setAnswered(true);
    setChosen(choice);
    startTransition(async () => {
      const result =
        mode === "practice"
          ? await gradeAdvancedChoice(card.id, card.step, choice)
          : await submitAdvancedChoice(card.id, card.step, choice);
      setVerdict({ chosen: choice, ...result });
      setPendingNext(result.next);
      // The plan's one audio rule: it fires on the COMMIT, alongside the
      // feedback, never before it. The `await` above has already spent the tap's
      // user activation, so this needs the gesture-less player (lib/ux/audio.ts).
      clip.current = autoplayAudio(card.audioUrl);
    });
  }

  // THE AUTO-ADVANCE LIVES IN AN EFFECT, NOT IN THE CLICK HANDLER.
  //
  // Two reasons, both of which were live bugs when the timer was started inside
  // choose(). The delay is measured from the moment the feedback is PAINTED
  // rather than from the moment setVerdict was called — those are not the same
  // instant, because a transition-priority update can be deferred, and whatever
  // it is deferred by used to come straight out of the Learner's reading time.
  // And the effect's cleanup clears the timer, which nothing did before: a
  // Learner who left mid-feedback left a live timeout behind that fired into a
  // closure over an unmounted component.
  //
  // Only a PASS is on a timer. A miss holds until Continue.
  useEffect(() => {
    if (!verdict?.passed || !pendingNext) return;

    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      advanceRef.current(pendingNext);
    };

    // Whichever finishes LAST: the beat, or the clip. A 900ms beat over a 1.4s
    // Thai clip would drop the next card on top of the previous card's audio.
    let elapsed = false;
    let quiet = clip.current === null;
    const both = () => {
      if (elapsed && quiet) go();
    };
    const beat = setTimeout(() => {
      elapsed = true;
      both();
    }, CORRECT_ADVANCE_MS);
    const ceiling = setTimeout(go, AUDIO_WAIT_CEILING_MS);
    clip.current?.whenDone(() => {
      quiet = true;
      both();
    });

    return () => {
      done = true;
      clearTimeout(beat);
      clearTimeout(ceiling);
    };
  }, [verdict, pendingNext]);

  const isMc = card.format === "recognise-mc" || card.format === "produce-mc";
  const options = card.options ?? [];

  // A miss, with the next card already loaded behind the reveal. The Learner
  // reads the option they got wrong for as long as they want; Continue is
  // instant because there is nothing left to fetch. Gated on the next card
  // actually being in hand, so the button is never on screen with nowhere to go.
  //
  // Hoisted above the returns below because the Enter binding needs it, and
  // hooks cannot be called after an early return.
  const held = verdict !== null && !verdict.passed ? pendingNext : null;

  // THE KEYBOARD. Every binding is gated on the same state the buttons are
  // disabled by — never on whether a button is mounted — because a window-level
  // listener keeps firing through both the `locked` option grid and the
  // "Next card…" spinner further down this file. See lib/ux/keyboard.ts.
  //
  // Each binding also routes through the same handler its button calls, so the
  // `if (answered) return;` re-entrancy guards in choose() and selfGrade() cover
  // the key path for free rather than being duplicated here.
  useAnswerKeys({
    count: options.length,
    enabled: isMc && !answered && !pending,
    onPick: (index) => choose(options[index]),
  });
  useActionKeys([" ", "Enter"], !isMc && !revealed && !answered, reveal);
  useAnswerKeys({
    // The self-grade is the same digit row one card later: 1 missed, 2 got it.
    count: 2,
    enabled: !isMc && revealed && !answered && !pending,
    onPick: (index) => selfGrade(index === 1),
  });
  useActionKeys(["Enter"], held !== null, () => {
    if (held) onAdvance(held);
  });

  // The theatre grid. Below lg: it is exactly the column this has always been —
  // `flex flex-col max-w-md` — and the rails render nothing. From lg: up it
  // becomes three tracks (rail / stage / rail) with the card on row 1, the
  // answers on row 2 and Continue on row 3.
  // The mobile gap is left to the call site: the two formats have always spaced
  // themselves differently (gap-5 under the option grid, gap-6 under the card)
  // and the desktop layout is not a reason to change what the phone looks like.
  // At lg: the gap-x/gap-y longhands win over either shorthand, because Tailwind
  // emits media-query rules after the base ones.
  const stage =
    "flex w-full max-w-md flex-col items-center lg:grid lg:max-w-[68rem] lg:grid-cols-[9.5rem_minmax(0,1fr)_9.5rem] lg:items-start lg:gap-x-8 lg:gap-y-5";

  const legend = isMc
    ? [
        { keys: "1-4", action: "pick" },
        ...(held ? [{ keys: "↵", action: "continue" }] : []),
      ]
    : revealed
      ? [
          { keys: "1", action: "missed it" },
          { keys: "2", action: "got it" },
        ]
      : [{ keys: "space", action: "reveal" }];

  const rails = (
    <>
      <StageRail side="left">{rail}</StageRail>
      <StageRail side="right">
        <KeyLegend rows={legend} />
      </StageRail>
    </>
  );

  if (isMc) {
    // Only vocab reaches a multiple-choice step — the phrase ladder is a single
    // rung of recognise-card — so the prompt below reads the vocab payload
    // directly rather than branching on kind.
    const entry = card.kind === "vocab" ? card.payload : null;
    if (!entry) return null;

    return (
      <div className={`${stage} gap-5`}>
        {rails}
        <McQuestion
          layout="theatre"
          showKeys
          eyebrow={producing ? "Which is the Thai?" : "What does it mean?"}
          prompt={
            producing ? (
              <p className="text-[clamp(1.25rem,5vw,1.75rem)] font-medium leading-snug text-foreground">
                {entry.gloss}
              </p>
            ) : (
              <p
                className={`${thai} text-[clamp(2rem,9vw,3.25rem)] font-medium leading-tight text-foreground`}
              >
                {entry.thai}
              </p>
            )
          }
          options={options}
          // Thai options need the Learner's chosen letterform; English ones must not
          // get it, or the gloss renders in a Thai-first cut.
          optionClassName={producing ? `${thai} text-lg` : "text-sm"}
          chosen={chosen}
          verdict={verdict}
          pending={pending}
          onChoose={choose}
        />

        {held && (
          <ContinueButton
            className="lg:col-start-2 lg:row-start-3"
            onClick={() => onAdvance(held)}
          />
        )}
      </div>
    );
  }

  // The self-graded path is the ONE place a "Next card…" spinner is honest: there
  // is no verdict to read here — the Learner graded themselves and has already
  // looked away — so the next card genuinely is the only thing happening.
  //
  // This used to be gated on `verdict === null`, which is true of the multiple-
  // choice path too for the whole grading round trip. That is what replaced the
  // option grid with "Next card…" the instant an option was tapped, and made the
  // feedback that followed look like a new card arriving pre-answered.
  if (pending && answered) {
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

  return (
    <div className={`${stage} gap-6 animate-slide-up-fade`}>
      {rails}

      {/* The card is the stage; the reveal/grade controls are the answer row
          beneath it — the same two rows the multiple-choice step uses, so the
          controls never move between formats. */}
      <div className="w-full lg:col-start-2 lg:row-start-1">
        {card.kind === "vocab" ? (
          <VocabLexemeSlab
            entry={card.payload}
            audioUrl={card.audioUrl}
            revealed={revealed}
            onReveal={reveal}
            direction={producing ? "produce" : "recognise"}
          />
        ) : (
          <PhraseSlab
            phrase={card.payload}
            audioUrl={card.audioUrl}
            revealed={revealed}
            onReveal={reveal}
          />
        )}
      </div>

      <div className="flex w-full flex-col items-center lg:col-start-2 lg:row-start-2">
        {!revealed ? (
          <RevealButton onClick={reveal} />
        ) : (
          <PassFailRow
            pending={pending}
            showKeys
            className="lg:max-w-lg"
            onGrade={selfGrade}
          />
        )}
      </div>
    </div>
  );
}

// Quiet on purpose. It sits under a reveal the Learner is meant to be reading,
// so it must not compete with the green/clay highlight above it for attention —
// this is the way out, not the thing to look at.
function ContinueButton({ className = "", onClick }: { className?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      autoFocus
      className={`focus-ring w-full rounded-[var(--r-pill)] border border-border-base bg-surface px-8 py-3 text-sm font-semibold text-foreground transition-transform active:scale-95 animate-slide-up-fade ${className}`}
    >
      Continue
    </button>
  );
}
