# M14 content bank — implementer source of truth

Merged, vetted content for Read-Thai M14 (units 12–14). The implementer has NO
WebFetch and MUST integrate this content verbatim — do not invent words, IPA,
glosses, or boundary indices. Every bucket below was independently verified.

## Provenance / verification
- **Numerals (unit 13):** `m14-content-numerals.md` — 10 digit names, each
  Wiktionary-verified. Tone contours read from the raw Chao pitch letters
  (˩˩˦=rising, ˨˩=low, ˥˩=falling), NOT the page-summary prose (which mislabeled
  them). ๑ = citation-form low /nɯ̀ŋ/ (colloquial mid /nɯ̄ŋ/ noted; teach LOW).
- **Leader words (unit 12):** `m14-content-leaders.md` — 12 words, Wiktionary
  primary + thai-language.com cross-check where reachable. Same tone-contour
  correction applied. `ให้` deliberately excluded (ห is a pronounced high-class
  initial there — wrong mechanism). ง left uncovered (no common everyday silent-ห
  ง word). `หรือ` on primary source only (secondary unreachable) — flagged.
- **Phrases (unit 14):** `m14-content-phrases.md` — 20 phrases. Boundary indices
  computed via `[...str]` codepoint enumeration AND independently re-verified by
  the orchestrator (20/20: every boundary array reproduces its syllable split
  exactly, all in range 1..len-1, strictly increasing). `ไปตลาด` dropped
  (implicit-vowel boundary with no visible cue — wrong for this unit).

## Special signs (unit 13→12, kind `special-sign`) — verbatim from research doc §8

Four rows. Content is taken directly from the research doc (§8 "Small marks
above and around letters"); no external verification needed.

| id | display | signName (Thai + IPA) | functionKey | functionLabel | example |
|---|---|---|---|---|---|
| `special-sign:garan` | ◌์ | การันต์ /kāː.rān/ | `silencer` | Silences the letter beneath it (and often the one before) | จันทร์ /tɕān/ "moon" (the ทร is silent) |
| `special-sign:maitaikhu` | ◌็ | ไม้ไต่คู้ /máj tàj kʰúː/ | `shortener` | Shortens the vowel (esp. เ, แ in closed syllables) | เด็ก /dèk̚/ "child" |
| `special-sign:maiyamok` | ๆ | ไม้ยมก /máj já.mók̚/ | `repeat` | Repeat — say the preceding word twice | เด็ก ๆ /dèk̚ dèk̚/ "children" |
| `special-sign:paiyannoi` | ฯ | ไปยาลน้อย /pāj.jāːn.nɔ́ːj/ | `abbreviation` | Marks a conventional abbreviation of a longer formal phrase | (e.g. กรุงเทพฯ) |

`functionLabel` above is the option text for the `sign-function` MC drill; the
four `functionKey` values are the four MC options (each sign's own key = correct,
the other three = distractors).

Note on ◌็ example: the shortener example เด็ก overlaps the unit-14 phrase-bank
word; that is fine (different kinds/units, no id collision — `special-sign:*`
vs `phrase:*`/`syllable:*`).

## Leader words (unit 12, kind `leader-word`) — from m14-content-leaders.md

See that file for full per-row derivations + source URLs. Summary (integrate ALL 12):

| display | IPA | tone | leaderChar | baseConsonant | gloss | derivation |
|---|---|---|---|---|---|---|
| อย่า | /jàː/ | low | อ | ย | don't | Mid(via อ)+mai-ek → low |
| อยาก | /jàːk̚/ | low | อ | ย | to want | Mid(via อ)+dead → low |
| อย่าง | /jàːŋ/ | low | อ | ย | kind, type | Mid(via อ)+mai-ek → low |
| อยู่ | /jùː/ | low | อ | ย | to be at | Mid(via อ)+mai-ek → low |
| หมา | /mǎː/ | rising | ห | ม | dog | High(via ห)+live → rising |
| หนา | /nǎː/ | rising | ห | น | thick | High(via ห)+live → rising |
| หนู | /nǔː/ | rising | ห | น | rat/mouse | High(via ห)+live → rising |
| หญิง | /jǐŋ/ | rising | ห | ญ | woman/female | High(via ห)+live → rising |
| หลาย | /lǎːj/ | rising | ห | ล | many | High(via ห)+live → rising |
| หยุด | /jùt̚/ | low | ห | ย | to stop | High(via ห)+dead → low |
| หรือ | /rɯ̌ː/ | rising | ห | ร | or | High(via ห)+live → rising |
| หวาน | /wǎːn/ | rising | ห | ว | sweet | High(via ห)+live → rising |

**Adversarial-distractor note for `leader-tone`:** for each ห-leader word,
include the tone the base sonorant would give WITHOUT the leader (Low+live→mid,
Low+dead→ per length) among the MC options — that is the whole teaching point.

## Numerals (unit 13, kind `numeral`) — from m14-content-numerals.md

| display | value | name (Thai) | nameIpa | tone |
|---|---|---|---|---|
| ๐ | 0 | ศูนย์ | /sǔːn/ | rising |
| ๑ | 1 | หนึ่ง | /nɯ̀ŋ/ | low |
| ๒ | 2 | สอง | /sɔ̌ːŋ/ | rising |
| ๓ | 3 | สาม | /sǎːm/ | rising |
| ๔ | 4 | สี่ | /sìː/ | low |
| ๕ | 5 | ห้า | /hâː/ | falling |
| ๖ | 6 | หก | /hòk̚/ | low |
| ๗ | 7 | เจ็ด | /tɕèt̚/ | low |
| ๘ | 8 | แปด | /pɛ̀ːt̚/ | low |
| ๙ | 9 | เก้า | /kâːw/ | falling |

`audio-numeral` synthesizes `name` (the Thai spelling), NOT the glyph.
Visually-confusable digit groups for `numeral-value`/`value-numeral`
distractors: {๓,๗}, {๖,๙}, {๔,๕}, {๑,๙} (curator suggestion — implementer may
refine, but keep distractors real digits).

## Phrases (unit 14, kind `phrase`) — from m14-content-phrases.md

Integrate ALL 20 (see that file for per-syllable IPA + glosses + sources). The
`boundaries` array and `syllables` list per phrase are authoritative and were
re-verified. Quick index (display → boundaries):

ไปไหน [2] · โรงเรียน [3] · กินข้าว [3] · ไก่ทอด [3] · ปลาทอง [3] · น้ำแข็ง [3] ·
เด็กดี [4] · แมวกินปลา [3,6] · ไปโรงเรียน [2,5] · กินข้าวเช้า [3,7] ·
นักเรียนดี [3,8] · แมวสีดำ [3,5] · ไปทำงาน [2,4] · เด็กกินนม [4,7] ·
ปลาสองตัว [3,6] · หมากินข้าว [3,6] · ไปโรงเรียนไทย [2,5,10] ·
เด็กไปโรงเรียน [4,6,9] · แมวกินปลาทู [3,6,9] · ไปกินข้าวเช้า [2,5,9]

Seed-time assertion (A5): for every phrase, splitting `display` (as `[...display]`)
at `boundaries` must reproduce `syllables[i].thai` concatenation. Verified green
on this content by the orchestrator (`scratchpad/verify-phrases.mjs`, 20/20).
