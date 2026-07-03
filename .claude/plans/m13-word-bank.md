# M13 vetted word bank — content source of truth (A1)

Curated + web-verified 2026-07-03 by the orchestrator per the M13 Validation
Contract (`active-plan.md` A1). Every NEW word below was independently verified
against Wiktionary (4 parallel verification agents; spelling, IPA segments,
vowel length, tone, gloss). **Source convention: unless noted, the citation is
`https://en.wiktionary.org/wiki/<word>` (the word's own English-Wiktionary Thai
entry).** Exception: เก๋ has no en.wiktionary entry — verified via
`https://th.wiktionary.org/wiki/เก๋` (thai-language.com id 149090 unreachable,
TLS error). The EXISTING 30 words are doc-sourced (M11, verbatim from
`seed/thai/research/reading-thai-script.html`) — their derivation columns below
are computed from the doc's own tone grid and are new M13 metadata.

The implementer integrates this table VERBATIM — no words added, dropped, or
re-glossed without coming back to the orchestrator.

IPA conventions (match existing seed): ā/à/â/á/ǎ tone diacritics; k̚ t̚ p̚
unreleased finals; ʔ final glottal stop of short open vowels; tɕ for จ.

Column meanings for tone-derivation metadata (unit 10/11):
- **class** = class of the tone-determining initial consonant (first letter of
  a cluster).
- **live** = live/dead per the doc §2/§6 (live = long open vowel or final
  m/n/ŋ/j/w).
- **len** = vowel length (phonetic, not orthographic — see ได้/ใต้ notes).
- **mark** = tone mark, or —.
- **tone** = resulting tone (all 100 rows consistent with the doc's grid).
- **asm** = eligible as a `tone-assembly` drill subject (no = see note).

## Tone-grid coverage (all 17 cells ≥3 — contract A1)

| Situation | Low | Mid | High |
|---|---|---|---|
| no mark, live → | mid ×14 | mid ×10 | rising ×8 |
| no mark, dead short → | high ×6 | low ×5 | low ×4 |
| no mark, dead long → | falling ×6 | low ×7 | low ×4 |
| ◌่ → | falling ×5 | low ×5 | low ×5 |
| ◌้ → | high ×5 | falling ×4 | falling ×4 |
| ◌๊ → | — | high ×3 | — |
| ◌๋ → | — | rising ×3 | — |

Final /t/ words: 10 (was 1: รถ) — รถ มด ตัด ติด เจ็ด มีด เลือด พูด บาท ขาด.
Total bank: 100 words (30 existing + 70 new; contract range 80–120).

## Existing 30 words (doc-sourced; derivation columns are NEW metadata to backfill)

| Thai | IPA | gloss | class | mark | live | len | final | tone | asm | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| ปลา | plāː | fish | mid | — | live | long | — | mid | yes | cluster ปล |
| ปาก | pàːk̚ | mouth | mid | — | dead | long | k | low | yes | |
| รถ | rót̚ | car | low | — | dead | short | t | high | yes | hidden o |
| บาป | bàːp̚ | sin | mid | — | dead | long | p | low | yes | |
| ยาม | jāːm | guard | low | — | live | long | m | mid | yes | |
| กิน | kīn | to eat | mid | — | live | short | n | mid | yes | |
| ยาง | jāːŋ | rubber | low | — | live | long | ŋ | mid | yes | |
| สาย | sǎːj | line, late | high | — | live | long | j | rising | yes | |
| ดาว | dāːw | star | mid | — | live | long | w | mid | yes | |
| พร | pʰɔ̄ːn | blessing | low | — | live | long | n | mid | no | irregular spelling: ร supplies ɔːn |
| รัก | rák̚ | to love | low | — | dead | short | k | high | yes | ◌ั shape-changer |
| ภาพ | pʰâːp̚ | picture | low | — | dead | long | p | falling | yes | |
| ดี | dīː | good | mid | — | live | long | — | mid | yes | |
| มือ | mɯ̄ː | hand | low | — | live | long | — | mid | yes | |
| คา | kʰāː | to be stuck | low | — | live | long | — | mid | yes | |
| ขา | kʰǎː | leg | high | — | live | long | — | rising | yes | |
| ข่า | kʰàː | galangal | high | ◌่ | — | long | — | low | yes | |
| คน | kʰōn | person | low | — | live | short | n | mid | yes | hidden o |
| เด็ก | dèk̚ | child | mid | — | dead | short | k | low | yes | ◌็ shortener |
| นา | nāː | rice field | low | — | live | long | — | mid | yes | |
| กรง | krōŋ | cage | mid | — | live | short | ŋ | mid | yes | cluster กร, hidden o |
| ทราย | sāːj | sand | low | — | live | long | j | mid | no | irregular: ทร reads s; class still from ท |
| สบาย | sà.bāːj | comfortable, well | — | — | — | — | j | — | no | multi-syllable; unit-6/11 only |
| มา | māː | to come | low | — | live | long | — | mid | yes | |
| ไป | pāj | to go | mid | — | live | short | j | mid | yes | ไ◌ |
| แมว | mɛ̄ːw | cat | low | — | live | long | w | mid | yes | |
| น้ำ | náːm | water | low | ◌้ | — | long | m | high | yes | written short ◌ำ, spoken long |
| โรง | rōːŋ | building, hall | low | — | live | long | ŋ | mid | yes | |
| เรียน | rīan | to study | low | — | live | long | n | mid | yes | เ◌ีย |
| ดอก | dɔ̀ːk̚ | flower | mid | — | dead | long | k | low | yes | |

## New 70 words (Wiktionary-verified, 2026-07-03; all 4 agents' verdicts CONFIRMED except the 2 noted corrections, already applied)

| Thai | IPA | gloss | class | mark | live | len | final | tone | asm | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| งู | ŋūː | snake | low | — | live | long | — | mid | yes | |
| ควาย | kʰwāːj | water buffalo | low | — | live | long | j | mid | yes | cluster คว |
| ตา | tāː | eye | mid | — | live | long | — | mid | yes | |
| ปี | pīː | year | mid | — | live | long | — | mid | yes | |
| จาน | tɕāːn | plate | mid | — | live | long | n | mid | yes | |
| เอา | ʔāw | to take | mid | — | live | short | w | mid | yes | เ◌า |
| ใจ | tɕāj | heart | mid | — | live | short | j | mid | yes | ใ◌ |
| สอง | sɔ̌ːŋ | two | high | — | live | long | ŋ | rising | yes | |
| หู | hǔː | ear | high | — | live | long | — | rising | yes | ห as real initial, not leader |
| ผม | pʰǒm | hair; I (male) | high | — | live | short | m | rising | yes | hidden o |
| สาม | sǎːm | three | high | — | live | long | m | rising | yes | |
| เขา | kʰǎw | he/she | high | — | live | short | w | rising | yes | เ◌า |
| ฝา | fǎː | lid | high | — | live | long | — | rising | yes | |
| นก | nók̚ | bird | low | — | dead | short | k | high | yes | hidden o |
| มด | mót̚ | ant | low | — | dead | short | t | high | yes | hidden o |
| ทุก | tʰúk̚ | every | low | — | dead | short | k | high | yes | |
| รับ | ráp̚ | to receive | low | — | dead | short | p | high | yes | |
| เจ็ด | tɕèt̚ | seven | mid | — | dead | short | t | low | yes | ◌็ shortener |
| จับ | tɕàp̚ | to catch | mid | — | dead | short | p | low | yes | |
| ตัด | tàt̚ | to cut | mid | — | dead | short | t | low | yes | |
| ติด | tìt̚ | to stick | mid | — | dead | short | t | low | yes | |
| ผัก | pʰàk̚ | vegetable | high | — | dead | short | k | low | yes | |
| หก | hòk̚ | six | high | — | dead | short | k | low | yes | hidden o |
| สุข | sùk̚ | happiness | high | — | dead | short | k | low | yes | final ข |
| ขับ | kʰàp̚ | to drive | high | — | dead | short | p | low | yes | |
| มาก | mâːk̚ | very, much | low | — | dead | long | k | falling | yes | |
| ลูก | lûːk̚ | child, offspring | low | — | dead | long | k | falling | yes | |
| มีด | mîːt̚ | knife | low | — | dead | long | t | falling | yes | |
| เลือด | lɯ̂at̚ | blood | low | — | dead | long | t | falling | yes | เ◌ือ |
| พูด | pʰûːt̚ | to speak | low | — | dead | long | t | falling | yes | |
| ตอบ | tɔ̀ːp̚ | to answer | mid | — | dead | long | p | low | yes | |
| ปีก | pìːk̚ | wing | mid | — | dead | long | k | low | yes | |
| บาท | bàːt̚ | baht | mid | — | dead | long | t | low | yes | |
| ออก | ʔɔ̀ːk̚ | to go out | mid | — | dead | long | k | low | yes | อ initial |
| ขาด | kʰàːt̚ | torn, missing | high | — | dead | long | t | low | yes | |
| สอบ | sɔ̀ːp̚ | to take an exam | high | — | dead | long | p | low | yes | |
| ฝาก | fàːk̚ | to deposit, entrust | high | — | dead | long | k | low | yes | |
| ถูก | tʰùːk̚ | cheap; correct | high | — | dead | long | k | low | yes | |
| แม่ | mɛ̂ː | mother | low | ◌่ | — | long | — | falling | yes | |
| พ่อ | pʰɔ̂ː | father | low | ◌่ | — | long | — | falling | yes | |
| ที่ | tʰîː | at; place | low | ◌่ | — | long | — | falling | yes | |
| ช่าง | tɕʰâːŋ | craftsman | low | ◌่ | — | long | ŋ | falling | yes | |
| ว่า | wâː | to say; that | low | ◌่ | — | long | — | falling | yes | |
| ไก่ | kàj | chicken | mid | ◌่ | — | short | j | low | yes | ไ◌ |
| อ่าน | ʔàːn | to read | mid | ◌่ | — | long | n | low | yes | |
| ต่อ | tɔ̀ː | to connect | mid | ◌่ | — | long | — | low | yes | |
| เก่า | kàw | old (things) | mid | ◌่ | — | short | w | low | yes | เ◌า |
| ปู่ | pùː | paternal grandfather | mid | ◌่ | — | long | — | low | yes | |
| ใส่ | sàj | to put on, wear | high | ◌่ | — | short | j | low | yes | ใ◌ |
| สี่ | sìː | four | high | ◌่ | — | long | — | low | yes | |
| ผ่าน | pʰàːn | to pass | high | ◌่ | — | long | n | low | yes | |
| ข่าว | kʰàːw | news | high | ◌่ | — | long | w | low | yes | |
| ม้า | máː | horse | low | ◌้ | — | long | — | high | yes | |
| น้อง | nɔ́ːŋ | younger sibling | low | ◌้ | — | long | ŋ | high | yes | |
| ร้าน | ráːn | shop | low | ◌้ | — | long | n | high | yes | |
| ช้าง | tɕʰáːŋ | elephant | low | ◌้ | — | long | ŋ | high | yes | |
| บ้าน | bâːn | house | mid | ◌้ | — | long | n | falling | yes | |
| ได้ | dâːj | can; to get | mid | ◌้ | — | long | j | falling | yes | CORRECTED: long aː despite ไ◌ (irregular) |
| ต้ม | tôm | to boil | mid | ◌้ | — | short | m | falling | yes | hidden o |
| ใต้ | tâːj | under; south | mid | ◌้ | — | long | j | falling | yes | CORRECTED: long aː despite ใ◌ (irregular) |
| ห้า | hâː | five | high | ◌้ | — | long | — | falling | yes | |
| ข้าว | kʰâːw | rice | high | ◌้ | — | long | w | falling | yes | |
| เสื้อ | sɯ̂a | shirt | high | ◌้ | — | long | — | falling | yes | เ◌ือ |
| ห้อง | hɔ̂ŋ | room | high | ◌้ | — | short | ŋ | falling | yes | spoken short ɔ |
| โต๊ะ | tóʔ | table | mid | ◌๊ | — | short | ʔ | high | yes | โ◌ะ |
| โจ๊ก | tɕóːk̚ | rice porridge | mid | ◌๊ | — | long | k | high | yes | |
| เก๊ | kéː | fake, counterfeit | mid | ◌๊ | — | long | — | high | yes | |
| ตั๋ว | tǔa | ticket | mid | ◌๋ | — | — | — | rising | yes | ◌ัว |
| เก๋ | kěː | chic, stylish | mid | ◌๋ | — | long | — | rising | yes | source: th.wiktionary.org/wiki/เก๋ |
| เดี๋ยว | dǐaw | a moment, soon | mid | ◌๋ | — | — | w | rising | yes | เ◌ียว |

## Implementer notes (binding)

- `asm: no` rows are NOT `tone-assembly` subjects (multi-syllable or
  irregular-spelling words where the flowchart steps would mislead); they remain
  eligible for `word-ipa` (and `word-final`/`audio-word` where applicable).
- For marked syllables the live/dead and length steps are skipped by the
  branching drill (mark wins — doc §6); `live`/`len` columns for marked rows are
  informational only (len shown where phonetically clear).
- No new ห-leader or อ-leader words were added (silent leaders are unit 12
  scope); the only leader word in the course stays หนา (unit 9 tone-word).
- Duplicates with unit-9 tone-words (คา ขา ข่า นา already in both) are fine —
  different item kinds/ids; do NOT re-add ค่า/ค้า/อา-family to the word bank.
- Existing rows keep their current ids/units; new metadata fields are added to
  all 100 rows per contract A1.
