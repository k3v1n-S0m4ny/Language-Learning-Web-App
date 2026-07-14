/**
 * Advanced Thai — the deterministic half of the extractor.
 *
 * Turns a theme's source markdown into the ORDERED LIST OF CLAUSES that become
 * phrase cards, each tagged with where in the document it came from. No LLM is
 * involved here, and that is deliberate: the clause boundaries are already in the
 * text, and asking a model to rediscover them would be both slower and less
 * reliable than reading them off.
 *
 * WHY A SPACE IS A CLAUSE BOUNDARY. Thai does not put spaces between words — it
 * puts them between clauses. So the spaces the author typed are not typography to
 * be normalised away; they are the author telling us where one phrase ends and
 * the next begins. See PhraseEntry in ./types.ts for the measurement that settled
 * this (median 24 / max 71 characters per clause, versus paragraphs of up to 439
 * if the spaces are ignored).
 *
 * THE ๆ EXCEPTION. Thai writes the repetition mark ๆ with a space BEFORE it
 * (ต่าง ๆ, "various"; ใหม่ ๆ, "new"). That space is not a clause boundary, it is
 * part of how the mark is set. A naive split on whitespace therefore severs ๆ
 * from the word it repeats and emits it as a one-character clause. So after
 * splitting, any token that is just ๆ is joined back onto the token before it.
 *
 * The LLM's job (scripts/generate-advanced-thai-deck.ts) is everything this
 * cannot do: the word segmentation inside a clause, the glosses, the readable
 * English context label, and the vocabulary and grammar extraction.
 */
import type { PhraseSource } from "./types";

/** A clause as read off the page, before the LLM adds glosses and word splits. */
export interface RawClause {
  /** The clause verbatim, exactly as it appears in the source. */
  thai: string;
  source: PhraseSource;
  /**
   * Provenance as the DOCUMENT states it, in Thai — the heading the clause sits
   * under, or "Step 3" for a numbered table row. The extractor turns this into
   * the reader-facing English `context` on the card; it is kept raw here so the
   * deterministic half never has to invent English prose.
   */
  provenance: string;
}

const REPEAT_MARK = "ๆ";

/**
 * Split one already-cleaned run of Thai into clauses on its own spaces, rejoining
 * the repetition mark to the word it repeats. Exported for the seed-time
 * assertions and for unit testing — the ๆ rule is the kind of thing that is
 * obviously right until it silently isn't.
 */
export function splitClauses(text: string): string[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const clauses: string[] = [];

  for (const token of tokens) {
    // A bare ๆ (or a token starting with one, e.g. "ๆ,") belongs to the clause
    // before it — the space in "ต่าง ๆ" is orthography, not a boundary.
    if (token.startsWith(REPEAT_MARK) && clauses.length > 0) {
      clauses[clauses.length - 1] += ` ${token}`;
      continue;
    }
    clauses.push(token);
  }

  return clauses.filter(hasThai);
}

/** True if the string contains at least one Thai character. */
function hasThai(s: string): boolean {
  return /[฀-๿]/.test(s);
}

/**
 * The canonical form for "is this word split faithful to the clause?" — used by
 * the extractor's self-check and by the seed-time assertion in
 * scripts/seed-advanced-thai-db.ts. ONE definition, so the two can never
 * disagree about what "faithful" means.
 *
 * Drops punctuation AND whitespace from both sides before comparing. Whitespace
 * has to go because of the ๆ rule above: the word "ต่าง ๆ" legitimately contains
 * a space, so `words.map(w => w.thai).join("")` reproduces the clause only once
 * spaces are ignored on both sides. The repetition mark itself is NOT stripped —
 * it is part of the word, and a split that dropped it would be wrong.
 */
export function normalizeForCompare(s: string): string {
  return s.replace(/[\s!?…,.'"()/:;\-–—]/g, "");
}

/**
 * Strip the markdown that carries no Thai: emphasis, the quote marks around
 * dialogue, list/quote markers, and the emoji the source uses to flag a
 * pull-quote. The Thai text itself — including its own punctuation (! ? …) — is
 * left exactly as written, because the card shows the clause as the author set it.
 */
function stripMarkup(s: string): string {
  return s
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/[“”"„]/g, "")
    .replace(/[\p{Extended_Pictographic}]/gu, "")
    .trim();
}

/** A table row's cells, minus the leading/trailing pipe. */
function tableCells(line: string): string[] {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|[\s:|-]+\|\s*$/.test(line);
}

/**
 * Read a theme's markdown into its clauses, in document order.
 *
 * The FIRST h1 is the theme's title, not content, so it is skipped — but any
 * later h1 is a real section heading and IS content (this document's second h1,
 * "โฆษณาเป็นงานที่สร้างสรรค์โดยบุคคลหลายฝ่าย", is the very sentence its passive
 * grammar pattern is taught from). The table's header row is column labels
 * ("#", "ขั้นตอน", "บทสนทนา") rather than language, so it is skipped too.
 */
export function readClauses(markdown: string): RawClause[] {
  const lines = markdown.split(/\r?\n/);
  const out: RawClause[] = [];

  let seenTitle = false;
  let heading = ""; // nearest heading above — the provenance for prose/labels
  let inTable = false;
  let tableHeaderSeen = false;
  let stepLabel = ""; // e.g. "ขั้นตอน 3", for rows of the numbered process table

  const push = (thai: string, source: PhraseSource, provenance: string) => {
    for (const clause of splitClauses(thai)) {
      out.push({ thai: clause, source, provenance });
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || /^-{3,}$/.test(line)) {
      inTable = false;
      continue;
    }

    // --- Table -------------------------------------------------------------
    if (line.startsWith("|")) {
      if (isTableSeparator(line)) continue;
      if (!inTable) {
        inTable = true;
        tableHeaderSeen = false;
      }
      if (!tableHeaderSeen) {
        // Column labels, not content.
        tableHeaderSeen = true;
        continue;
      }

      const cells = tableCells(line);
      const step = cells[0]?.trim();
      stepLabel = /^\d+$/.test(step ?? "") ? `${heading} ${step}` : heading;

      for (const cell of cells.slice(1)) {
        const cleaned = stripMarkup(cell);
        if (!hasThai(cleaned)) continue;
        // A dialogue cell holds several separate utterances, slash-separated.
        // Each is its own clause set — they are different things people say.
        for (const part of cleaned.split(/\s+\/\s+/)) {
          push(part, "table", stepLabel);
        }
      }
      continue;
    }
    inTable = false;

    // --- Headings ----------------------------------------------------------
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const text = stripMarkup(h[2]);
      if (h[1] === "#" && !seenTitle) {
        // The theme title. Recorded as the heading context, never as a card.
        seenTitle = true;
        heading = text.replace(/\s*\(.*\)\s*$/, "").trim();
        continue;
      }
      heading = text;
      push(text, "heading", text);
      continue;
    }

    // --- Block quote -------------------------------------------------------
    if (line.startsWith(">")) {
      const text = stripMarkup(line.replace(/^>\s*/, ""));
      if (hasThai(text)) push(text, "quote", heading);
      continue;
    }

    // --- A bold-only line is a role label (**นักการตลาด**), not prose -------
    if (/^\*\*[^*]+\*\*$/.test(line)) {
      const text = stripMarkup(line);
      if (hasThai(text)) push(text, "label", heading);
      continue;
    }

    // --- Prose -------------------------------------------------------------
    const text = stripMarkup(line);
    if (hasThai(text)) push(text, "prose", heading);
  }

  return out;
}
