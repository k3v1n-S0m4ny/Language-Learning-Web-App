/**
 * Theme: นักโฆษณา (Advertiser).
 *
 * Hand-extracted from the source text. Every Thai string here appears verbatim
 * in the source — nothing is invented, and the English glosses translate what is
 * actually written rather than paraphrasing what a card "should" say.
 *
 * This is the reference output for the Phase-B extractor: whatever
 * scripts/generate-advanced-thai-deck.ts emits for a new theme must look like
 * this.
 *
 * SCOPE. The full theme yields 122 phrase cards — every space-delimited clause
 * in the document (see PhraseEntry's doc comment for why the space is the unit).
 * The 14 below are a deliberately chosen SPINE of that set, not the easy ones:
 * they span the whole length distribution from คัต! (4 characters) to the single
 * longest clause in the document (71), and cover all five source kinds. If a
 * design survives these it survives the deck; if it only looks good on the short
 * quoted ones, the bake-off would have flattered it. Vocabulary (10) and grammar
 * (5) are likewise a slice, sized so all candidates fit on one screen.
 */
import type { Theme } from "../types";

export const NAK_KOSANA: Theme = {
  slug: "nak-kosana",
  titleThai: "นักโฆษณา",
  titleEnglish: "Advertiser",
  summary:
    "Plans and manages every stage of producing an advertisement to the client's requirements, then places it in the media channels best suited to carrying the message to consumers.",

  // --- Vocabulary ---------------------------------------------------------
  // Chosen to exercise the morphology strip: this text is dense with the three
  // great Thai agent/nominalizing prefixes — นัก- (a person defined by their
  // practice), ผู้- (a person defined by their act), การ- (the act itself).
  // This one short article contains five นัก- professions, five ผู้- roles and
  // five การ- abstractions. Learn the prefix and most of them decode on sight.
  vocab: [
    {
      thai: "นักโฆษณา",
      gloss: "advertiser",
      pos: "noun",
      register: "formal",
      literal: "one-whose-practice-is + advertising",
      morphemes: [
        { form: "นัก", gloss: "one whose practice/profession is", role: "prefix" },
        { form: "โฆษณา", gloss: "advertising, advertisement", role: "root" },
      ],
    },
    {
      thai: "ผู้ว่าจ้าง",
      gloss: "the client, the commissioning party",
      pos: "noun",
      register: "formal",
      literal: "the-person-who + hires",
      morphemes: [
        { form: "ผู้", gloss: "the person who", role: "prefix" },
        { form: "ว่าจ้าง", gloss: "to hire, to commission", role: "root" },
      ],
    },
    {
      thai: "ผู้บริโภค",
      gloss: "consumer",
      pos: "noun",
      register: "formal",
      literal: "the-person-who + consumes",
      morphemes: [
        { form: "ผู้", gloss: "the person who", role: "prefix" },
        { form: "บริโภค", gloss: "to consume", role: "root" },
      ],
    },
    {
      thai: "การนำเสนอ",
      gloss: "the pitch, the presentation",
      pos: "noun",
      register: "formal",
      literal: "the-act-of + presenting",
      morphemes: [
        { form: "การ", gloss: "the act of (turns a verb into a noun)", role: "prefix" },
        { form: "นำเสนอ", gloss: "to present, to put forward", role: "root" },
      ],
    },
    {
      thai: "นักเขียนบทโฆษณา",
      gloss: "copywriter",
      pos: "noun",
      register: "formal",
      literal: "one-whose-practice-is + writing + copy + advertising",
      morphemes: [
        { form: "นัก", gloss: "one whose practice/profession is", role: "prefix" },
        { form: "เขียน", gloss: "to write", role: "root" },
        { form: "บท", gloss: "script, copy", role: "root" },
        { form: "โฆษณา", gloss: "advertising", role: "root" },
      ],
    },
    {
      thai: "โน้มน้าวใจ",
      gloss: "to persuade, to win someone over",
      pos: "verb",
      register: "formal",
      literal: "to-sway + the-heart",
      morphemes: [
        { form: "โน้มน้าว", gloss: "to sway, to induce", role: "root" },
        { form: "ใจ", gloss: "heart, mind", role: "suffix" },
      ],
    },
    {
      thai: "คู่แข่ง",
      gloss: "competitor, rival",
      pos: "noun",
      register: "formal",
      literal: "counterpart + who-competes",
      morphemes: [
        { form: "คู่", gloss: "pair, counterpart", role: "root" },
        { form: "แข่ง", gloss: "to compete", role: "root" },
      ],
    },
    {
      thai: "เผยแพร่",
      gloss: "to disseminate, to put out through the media",
      pos: "verb",
      register: "formal",
      literal: "to-reveal + to-spread",
      morphemes: [
        { form: "เผย", gloss: "to reveal, to disclose", role: "root" },
        { form: "แพร่", gloss: "to spread, to propagate", role: "root" },
      ],
    },
    {
      thai: "พรีเซนเตอร์",
      gloss: "presenter, brand ambassador",
      pos: "noun",
      register: "technical",
      // A straight transliteration of English "presenter" — no Thai morphemes to
      // parse, which is itself the lesson: the ad industry borrows wholesale.
      // Also the case that proves the morphology strip degrades gracefully to one
      // tile rather than looking broken.
      morphemes: [{ form: "พรีเซนเตอร์", gloss: "presenter (from English)", role: "root" }],
    },
    {
      thai: "ถล่มทลาย",
      gloss: "through the roof, in an avalanche",
      pos: "adv",
      register: "colloquial",
      // The register contrast is the point: everything above is boardroom Thai;
      // this is what the same person says when they are selling you something.
      morphemes: [
        { form: "ถล่ม", gloss: "to collapse, to cave in", role: "root" },
        { form: "ทลาย", gloss: "to crumble, to give way", role: "root" },
      ],
    },
  ],

  // --- Grammar ------------------------------------------------------------
  // Slot names in each `frame` must match the `slot` values on the example
  // segments — that is what lets the Slot Frame card paint the frame's slot and
  // its real-world realization in the same colour.
  grammar: [
    {
      frame: "ทำให้ + N + V",
      fn: "causative",
      plainEnglish: "makes N do V / causes N to become V",
      examples: [
        {
          segments: [
            { text: "สำรวจข้อมูลว่าโฆษณาแบบไหนจะ" },
            { text: "ทำให้", slot: "marker" },
            { text: "สินค้า", slot: "N" },
            { text: "ขายดีขึ้น", slot: "V" },
          ],
          gloss: "Research which kind of advertising will make the product sell better.",
        },
        {
          segments: [
            { text: "วิเคราะห์ว่าสื่อช่องทางใดจะ" },
            { text: "ทำให้", slot: "marker" },
            { text: "คน", slot: "N" },
            { text: "รู้จักโฆษณาที่ผลิตออกมาได้ดีที่สุด", slot: "V" },
          ],
          gloss:
            "Analyse which media channel will best make people aware of the advertisement produced.",
        },
      ],
    },
    {
      frame: "แข่งกัน + V",
      fn: "reciprocal",
      plainEnglish: "compete with one another to do V",
      examples: [
        {
          segments: [
            { text: "บริษัทโฆษณาจะ" },
            { text: "แข่งกัน", slot: "marker" },
            { text: "เสนอแผนโฆษณา", slot: "V" },
            { text: "ให้แก่ลูกค้า" },
          ],
          gloss:
            "The advertising agencies compete with one another to pitch their ad plans to the client.",
        },
      ],
    },
    {
      frame: "เพื่อ + V",
      fn: "connector",
      plainEnglish: "in order to V — states the purpose of what came before",
      examples: [
        {
          segments: [
            { text: "นำไปเผยแพร่ทางสื่อต่าง ๆ ที่เหมาะสม " },
            { text: "เพื่อ", slot: "marker" },
            { text: "ใช้เป็นสื่อที่จะนำข้อมูลข่าวสารไปยังผู้บริโภค", slot: "V" },
          ],
          gloss:
            "…and place it in suitable media channels, in order to use them to carry the message to consumers.",
        },
        {
          segments: [
            { text: "จากนั้นจึงวางแผนงานโฆษณา" },
            { text: "เพื่อ", slot: "marker" },
            { text: "ให้ผู้บริโภครู้จักสินค้า", slot: "V" },
          ],
          gloss: "…then plans the advertising campaign, in order to make consumers aware of the product.",
        },
        {
          segments: [
            { text: "ยังควรรู้ภาษาต่างประเทศ" },
            { text: "เพื่อ", slot: "marker" },
            { text: "จะได้รับทราบข้อมูลข่าวสารใหม่ ๆ", slot: "V" },
          ],
          gloss: "…should also know foreign languages, in order to receive new information.",
        },
      ],
    },
    {
      frame: "ยิ่ง + Clause + ก็ยิ่ง + Adj",
      fn: "comparative",
      plainEnglish: "the more Clause, the more Adj",
      examples: [
        {
          segments: [
            { text: "ยิ่ง", slot: "marker" },
            { text: "ถ้าได้สะสมประสบการณ์ในชมรมโฆษณา", slot: "Clause" },
            { text: " หรือผ่านประสบการณ์อื่น ๆ … " },
            { text: "ก็ยิ่ง", slot: "marker" },
            { text: "ดี", slot: "Adj" },
          ],
          gloss:
            "The more experience you accumulate in an advertising club — or through other experience — the better.",
        },
      ],
    },
    {
      frame: "N + โดย + Agent",
      fn: "passive",
      plainEnglish: "N, done by Agent — names who performed the action",
      examples: [
        {
          segments: [
            { text: "โฆษณาเป็นงานที่สร้างสรรค์", slot: "N" },
            { text: "โดย", slot: "marker" },
            { text: "บุคคลหลายฝ่าย", slot: "Agent" },
          ],
          gloss: "Advertising is work created by people from many different disciplines.",
        },
      ],
    },
  ],

  // --- Phrases ------------------------------------------------------------
  // Ordered SHORTEST FIRST, so stepping through the bake-off walks the length
  // distribution from the trivial case to the worst case. The last three are the
  // three longest clauses in the entire document — if a design holds there, it
  // holds everywhere.
  phrases: [
    {
      thai: "คัต!",
      gloss: "Cut!",
      // Punctuation is never a word — the same rule the Mandarin seed prompt enforces.
      words: [{ thai: "คัต", gloss: "cut (the director's call)" }],
      source: "table",
      context: "Step 5 · Filming",
    },
    {
      thai: "ถ่ายทำ",
      gloss: "filming, shooting",
      words: [{ thai: "ถ่ายทำ", gloss: "to film, to shoot" }],
      source: "table",
      context: "Step 5 · Filming",
    },
    {
      thai: "สำรวจตลาด",
      gloss: "market research",
      words: [
        { thai: "สำรวจ", gloss: "to survey, to research" },
        { thai: "ตลาด", gloss: "market" },
      ],
      source: "table",
      context: "Step 2 · Market research",
    },
    {
      thai: "ผมชอบไอเดียคุณ",
      gloss: "I like your idea.",
      words: [
        { thai: "ผม", gloss: "I (male speaker)" },
        { thai: "ชอบ", gloss: "to like" },
        { thai: "ไอเดีย", gloss: "idea (from English)" },
        { thai: "คุณ", gloss: "you, your" },
      ],
      source: "table",
      context: "Step 4 · Pitching the client",
    },
    {
      thai: "นักเขียนบทโฆษณา",
      gloss: "copywriter",
      words: [
        { thai: "นัก", gloss: "one whose profession is" },
        { thai: "เขียน", gloss: "to write" },
        { thai: "บท", gloss: "script, copy" },
        { thai: "โฆษณา", gloss: "advertising" },
      ],
      source: "label",
      context: "Roles · Production stage",
    },
    {
      thai: "รับบรีฟจากผู้ว่าจ้าง",
      gloss: "Take the brief from the client.",
      words: [
        { thai: "รับ", gloss: "to receive, to take" },
        { thai: "บรีฟ", gloss: "brief (from English)" },
        { thai: "จาก", gloss: "from" },
        { thai: "ผู้ว่าจ้าง", gloss: "the client" },
      ],
      source: "table",
      context: "Step 1 · Taking the brief",
    },
    {
      thai: "ความสามารถในการสื่อสาร",
      gloss: "the ability to communicate",
      words: [
        { thai: "ความสามารถ", gloss: "ability, capability" },
        { thai: "ใน", gloss: "in" },
        { thai: "การสื่อสาร", gloss: "communication" },
      ],
      source: "heading",
      context: "Section heading",
    },
    {
      thai: "สำรวจสินค้าคู่แข่งที่มีในตลาด",
      gloss: "Survey the competing products on the market.",
      words: [
        { thai: "สำรวจ", gloss: "to survey" },
        { thai: "สินค้า", gloss: "goods, products" },
        { thai: "คู่แข่ง", gloss: "competitor, rival" },
        { thai: "ที่", gloss: "that, which" },
        { thai: "มี", gloss: "to be, to exist" },
        { thai: "ใน", gloss: "in, on" },
        { thai: "ตลาด", gloss: "the market" },
      ],
      source: "table",
      context: "Step 2 · Market research",
    },
    {
      thai: "ผมรับรองว่ายอดขายถล่มทลายแน่ครับ!",
      gloss: "I guarantee sales will go through the roof!",
      words: [
        { thai: "ผม", gloss: "I (male speaker)" },
        { thai: "รับรอง", gloss: "to guarantee, to assure" },
        { thai: "ว่า", gloss: "that (introduces the claim)" },
        { thai: "ยอดขาย", gloss: "sales figures" },
        { thai: "ถล่มทลาย", gloss: "through the roof" },
        { thai: "แน่", gloss: "for certain" },
        { thai: "ครับ", gloss: "polite particle (male speaker)" },
      ],
      source: "quote",
      context: "Pull-quote · On persuasion",
    },
    {
      thai: "โฆษณาทางโทรทัศน์ออกตรงเวลาหรือเปล่าคะ",
      gloss: "Did the television advertisement air on time?",
      words: [
        { thai: "โฆษณา", gloss: "advertisement" },
        { thai: "ทาง", gloss: "via, by way of" },
        { thai: "โทรทัศน์", gloss: "television" },
        { thai: "ออก", gloss: "to go out, to air" },
        { thai: "ตรงเวลา", gloss: "on time" },
        { thai: "หรือเปล่า", gloss: "…or not? (yes/no question)" },
        { thai: "คะ", gloss: "polite question particle (female speaker)" },
      ],
      source: "table",
      context: "Step 6 · Media placement",
    },
    {
      thai: "เราจะใช้นักกีฬาชื่อดังเป็นพรีเซนเตอร์ค่ะ",
      gloss: "We'll use a famous athlete as the presenter.",
      words: [
        { thai: "เรา", gloss: "we" },
        { thai: "จะ", gloss: "will (future)" },
        { thai: "ใช้", gloss: "to use" },
        { thai: "นักกีฬา", gloss: "athlete" },
        { thai: "ชื่อดัง", gloss: "famous, well-known" },
        { thai: "เป็น", gloss: "as, to be" },
        { thai: "พรีเซนเตอร์", gloss: "presenter" },
        { thai: "ค่ะ", gloss: "polite particle (female speaker)" },
      ],
      source: "table",
      context: "Step 4 · Pitching the client",
    },
    // --- The three longest clauses in the document. The stress test. ---
    {
      thai: "วางแผนและบริหารการผลิตโฆษณาทุกขั้นตอนให้ตรงตามความต้องการของผู้ว่าจ้าง",
      gloss:
        "Plan and manage every stage of producing the advertisement in accordance with the client's requirements.",
      words: [
        { thai: "วางแผน", gloss: "to plan" },
        { thai: "และ", gloss: "and" },
        { thai: "บริหาร", gloss: "to manage, to administer" },
        { thai: "การผลิต", gloss: "the production of" },
        { thai: "โฆษณา", gloss: "advertising" },
        { thai: "ทุก", gloss: "every" },
        { thai: "ขั้นตอน", gloss: "stage, step" },
        { thai: "ให้", gloss: "so as to" },
        { thai: "ตรงตาม", gloss: "in accordance with" },
        { thai: "ความต้องการ", gloss: "the requirements, the needs" },
        { thai: "ของ", gloss: "of" },
        { thai: "ผู้ว่าจ้าง", gloss: "the client" },
      ],
      source: "prose",
      context: "Opening definition",
    },
    {
      thai: "ปัจจุบันสื่อโฆษณามีอิทธิพลต่อสังคมและชีวิตประจำวันของผู้คนเป็นอย่างมาก",
      gloss:
        "Nowadays advertising media have an enormous influence on society and on people's daily lives.",
      words: [
        { thai: "ปัจจุบัน", gloss: "nowadays, at present" },
        { thai: "สื่อโฆษณา", gloss: "advertising media" },
        { thai: "มี", gloss: "to have" },
        { thai: "อิทธิพล", gloss: "influence" },
        { thai: "ต่อ", gloss: "on, upon" },
        { thai: "สังคม", gloss: "society" },
        { thai: "และ", gloss: "and" },
        { thai: "ชีวิตประจำวัน", gloss: "daily life" },
        { thai: "ของ", gloss: "of" },
        { thai: "ผู้คน", gloss: "people" },
        { thai: "เป็นอย่างมาก", gloss: "a very great deal" },
      ],
      source: "prose",
      context: "Planning & managing the whole campaign",
    },
    {
      // The single longest clause in the document (71 characters).
      thai: "นอกจากนี้ยังเป็นตัวแทนของบริษัทโฆษณาที่จะแลกเปลี่ยนความคิดเห็นกับลูกค้า",
      gloss:
        "Beyond this, they also act as the agency's representative in exchanging views with the client.",
      words: [
        { thai: "นอกจากนี้", gloss: "besides this, beyond this" },
        { thai: "ยัง", gloss: "also, still" },
        { thai: "เป็น", gloss: "to be" },
        { thai: "ตัวแทน", gloss: "representative, agent" },
        { thai: "ของ", gloss: "of" },
        { thai: "บริษัทโฆษณา", gloss: "the advertising agency" },
        { thai: "ที่", gloss: "who, which" },
        { thai: "จะ", gloss: "will" },
        { thai: "แลกเปลี่ยน", gloss: "to exchange" },
        { thai: "ความคิดเห็น", gloss: "opinions, views" },
        { thai: "กับ", gloss: "with" },
        { thai: "ลูกค้า", gloss: "the client, the customer" },
      ],
      source: "prose",
      context: "Planning & managing the whole campaign",
    },
  ],
};
