# Read-Thai Unit 14 — Tap-Boundary Splitting Phrases (verified)

Continuous (spaceless) Thai phrases for the tap-to-split syllable-boundary widget.
20 phrases, graded easy → harder. Every constituent word verified against
en.wiktionary.org (spelling, IPA, tone, gloss). Character indices computed
programmatically from `[...str]` (each Thai combining vowel/tone mark counts as
its own array element), not by hand.

## Conventions
- **Boundary index** = the char-array position at which a NEW syllable starts (index 0 excluded).
- **Tones** (course convention): macron ā = mid, grave à = low, circumflex â = falling, acute á = high, caron ǎ = rising. `ː` = long. Unreleased finals: `k̚ t̚ p̚`.
- Leading vowels เ แ โ ไ ใ are written BEFORE their consonant and always OPEN a syllable — the primary tap cue this unit teaches. Cue tags below: **[lead]** = boundary marked by a leading vowel; **[final]** = boundary marked by a syllable-closing final consonant.

---

## TIER 1 — Easy (2 syllables)

### 1. ไปไหน — "where are you going?"
- Chars: `[ไ,ป,ไ,ห,น]` (5) — ไ0 ป1 ไ2 ห3 น4
- Syllables: ไป · ไหน
- **Boundaries: [2]**  **[lead]** (second ไ opens syllable 2)
- IPA: ไป /pāj/ "go" · ไหน /nǎj/ "where"
- Gloss: *go where* → "where are you going?"
- Sources: https://en.wiktionary.org/wiki/ไป · https://en.wiktionary.org/wiki/ไหน

### 2. โรงเรียน — "school"
- Chars: `[โ,ร,ง,เ,ร,ี,ย,น]` (8) — โ0 ร1 ง2 เ3 ร4 ี5 ย6 น7
- Syllables: โรง · เรียน
- **Boundaries: [3]**  **[lead]** (เ opens syllable 2) + **[final]** (ง closes โรง)
- IPA: โรง /rōːŋ/ "building" · เรียน /rīan/ "study"
- Gloss: *learning-building* → "school"
- Source: https://en.wiktionary.org/wiki/โรงเรียน

### 3. กินข้าว — "eat a meal"
- Chars: `[ก,ิ,น,ข,้,า,ว]` (7) — ก0 ิ1 น2 ข3 ้4 า5 ว6
- Syllables: กิน · ข้าว
- **Boundaries: [3]**  **[final]** (น closes กิน)
- IPA: กิน /kīn/ "eat" · ข้าว /khâːw/ "rice"
- Gloss: *eat rice* → "eat (a meal)"
- Sources: https://en.wiktionary.org/wiki/กิน · https://en.wiktionary.org/wiki/ข้าว

### 4. ไก่ทอด — "fried chicken"
- Chars: `[ไ,ก,่,ท,อ,ด]` (6) — ไ0 ก1 ่2 ท3 อ4 ด5
- Syllables: ไก่ · ทอด
- **Boundaries: [3]**  (ไก่ = leading vowel ไ + tone mark; ท opens syllable 2)
- IPA: ไก่ /kàj/ "chicken" · ทอด /thɔ̂ːt̚/ "deep-fried"
- Gloss: *chicken fried* → "fried chicken"
- Sources: https://en.wiktionary.org/wiki/ไก่ · https://en.wiktionary.org/wiki/ทอด

### 5. ปลาทอง — "goldfish"
- Chars: `[ป,ล,า,ท,อ,ง]` (6) — ป0 ล1 า2 ท3 อ4 ง5
- Syllables: ปลา · ทอง
- **Boundaries: [3]**  (long vowel า closes ปลา; ท opens ทอง)
- IPA: ปลา /plāː/ "fish" · ทอง /thɔ̄ːŋ/ "gold"
- Gloss: *fish gold* → "goldfish"
- Sources: https://en.wiktionary.org/wiki/ปลา · https://en.wiktionary.org/wiki/ทอง

### 6. น้ำแข็ง — "ice"
- Chars: `[น,้,ำ,แ,ข,็,ง]` (7) — น0 ้1 ำ2 แ3 ข4 ็5 ง6
- Syllables: น้ำ · แข็ง
- **Boundaries: [3]**  **[lead]** (แ opens syllable 2)
- IPA: น้ำ /náːm/ "water" · แข็ง /khɛ̌ŋ/ "hard"
- Gloss: *hard water* → "ice"
- Note: Wiktionary transcribes น้ำ with a short vowel /nam˦˥/; in isolation it is conventionally long /náːm/. Length does not affect the boundary.
- Source: https://en.wiktionary.org/wiki/น้ำแข็ง

### 7. เด็กดี — "good child / well-behaved child"
- Chars: `[เ,ด,็,ก,ด,ี]` (6) — เ0 ด1 ็2 ก3 ด4 ี5
- Syllables: เด็ก · ดี
- **Boundaries: [4]**  **[final]** (ก closes เด็ก; note เด็ก spans 4 chars: leading เ + ด + short-vowel mark ็ + final ก)
- IPA: เด็ก /dèk̚/ "child" · ดี /dīː/ "good"
- Gloss: *child good* → "good/well-behaved child"
- Sources: https://en.wiktionary.org/wiki/เด็ก · https://en.wiktionary.org/wiki/ดี

---

## TIER 2 — Medium (3 syllables)

### 8. แมวกินปลา — "the cat eats fish"  *(course worked example)*
- Chars: `[แ,ม,ว,ก,ิ,น,ป,ล,า]` (9) — แ0 ม1 ว2 ก3 ิ4 น5 ป6 ล7 า8
- Syllables: แมว · กิน · ปลา
- **Boundaries: [3, 6]**  **[lead]**+**[final]**
- IPA: แมว /mɛ̄ːw/ "cat" · กิน /kīn/ "eats" · ปลา /plāː/ "fish"
- Gloss: "the cat eats fish"
- Sources: https://en.wiktionary.org/wiki/แมว · https://en.wiktionary.org/wiki/กิน · https://en.wiktionary.org/wiki/ปลา

### 9. ไปโรงเรียน — "go to school"  *(course worked example)*
- Chars: `[ไ,ป,โ,ร,ง,เ,ร,ี,ย,น]` (10) — ไ0 ป1 โ2 ร3 ง4 เ5 ร6 ี7 ย8 น9
- Syllables: ไป · โรง · เรียน
- **Boundaries: [2, 5]**  **[lead]** ×2 (โ opens โรง, เ opens เรียน)
- IPA: ไป /pāj/ "go" · โรง /rōːŋ/ "building" · เรียน /rīan/ "study"
- Gloss: "go to school"
- Sources: https://en.wiktionary.org/wiki/ไป · https://en.wiktionary.org/wiki/โรงเรียน

### 10. กินข้าวเช้า — "eat breakfast"
- Chars: `[ก,ิ,น,ข,้,า,ว,เ,ช,้,า]` (11) — ก0 ิ1 น2 ข3 ้4 า5 ว6 เ7 ช8 ้9 า10
- Syllables: กิน · ข้าว · เช้า
- **Boundaries: [3, 7]**  **[final]** (น closes กิน) + **[lead]** (เ opens เช้า)
- IPA: กิน /kīn/ "eat" · ข้าว /khâːw/ "rice/meal" · เช้า /cháːw/ "morning"
- Gloss: *eat rice morning* → "eat breakfast"
- Sources: https://en.wiktionary.org/wiki/กิน · https://en.wiktionary.org/wiki/ข้าว · https://en.wiktionary.org/wiki/เช้า

### 11. นักเรียนดี — "good student"
- Chars: `[น,ั,ก,เ,ร,ี,ย,น,ด,ี]` (10) — น0 ั1 ก2 เ3 ร4 ี5 ย6 น7 ด8 ี9
- Syllables: นัก · เรียน · ดี
- **Boundaries: [3, 8]**  **[lead]** (เ opens เรียน) + **[final]** (น closes เรียน)
- IPA: นัก /nák̚/ "-er (agent)" · เรียน /rīan/ "study" · ดี /dīː/ "good"
- Gloss: *student good* → "good student" (นักเรียน = "student")
- Sources: https://en.wiktionary.org/wiki/นักเรียน · https://en.wiktionary.org/wiki/ดี

### 12. แมวสีดำ — "black cat"
- Chars: `[แ,ม,ว,ส,ี,ด,ำ]` (7) — แ0 ม1 ว2 ส3 ี4 ด5 ำ6
- Syllables: แมว · สี · ดำ
- **Boundaries: [3, 5]**  **[lead]** (แ opens แมว)
- IPA: แมว /mɛ̄ːw/ "cat" · สี /sǐː/ "colour" · ดำ /dām/ "black"
- Gloss: *cat colour black* → "black cat"
- Sources: https://en.wiktionary.org/wiki/แมว · https://en.wiktionary.org/wiki/สี · https://en.wiktionary.org/wiki/ดำ

### 13. ไปทำงาน — "go to work"
- Chars: `[ไ,ป,ท,ำ,ง,า,น]` (7) — ไ0 ป1 ท2 ำ3 ง4 า5 น6
- Syllables: ไป · ทำ · งาน
- **Boundaries: [2, 4]**  **[lead]** (ไ opens ไป)
- IPA: ไป /pāj/ "go" · ทำ /thām/ "do" · งาน /ŋāːn/ "work"
- Gloss: *go do work* → "go to work" (ทำงาน = "to work")
- Sources: https://en.wiktionary.org/wiki/ไป · https://en.wiktionary.org/wiki/ทำงาน

### 14. เด็กกินนม — "the child drinks milk"
- Chars: `[เ,ด,็,ก,ก,ิ,น,น,ม]` (9) — เ0 ด1 ็2 ก3 ก4 ิ5 น6 น7 ม8
- Syllables: เด็ก · กิน · นม
- **Boundaries: [4, 7]**  **[final]** ×2 (ก closes เด็ก, น closes กิน). Note the doubled ก at idx 3/4 (final of เด็ก, initial of กิน) and doubled น at idx 6/7.
- IPA: เด็ก /dèk̚/ "child" · กิน /kīn/ "consumes" · นม /nōm/ "milk"
- Gloss: "the child drinks milk"
- Sources: https://en.wiktionary.org/wiki/เด็ก · https://en.wiktionary.org/wiki/กิน · https://en.wiktionary.org/wiki/นม

### 15. ปลาสองตัว — "two fish"
- Chars: `[ป,ล,า,ส,อ,ง,ต,ั,ว]` (9) — ป0 ล1 า2 ส3 อ4 ง5 ต6 ั7 ว8
- Syllables: ปลา · สอง · ตัว
- **Boundaries: [3, 6]**  **[final]** (ง closes สอง)
- IPA: ปลา /plāː/ "fish" · สอง /sɔ̌ːŋ/ "two" · ตัว /tūa/ "(animal classifier)"
- Gloss: *fish two CLF* → "two fish"
- Sources: https://en.wiktionary.org/wiki/ปลา · https://en.wiktionary.org/wiki/สอง · https://en.wiktionary.org/wiki/ตัว

### 16. หมากินข้าว — "the dog eats rice"
- Chars: `[ห,ม,า,ก,ิ,น,ข,้,า,ว]` (10) — ห0 ม1 า2 ก3 ิ4 น5 ข6 ้7 า8 ว9
- Syllables: หมา · กิน · ข้าว
- **Boundaries: [3, 6]**  **[final]** (น closes กิน). Note หมา uses silent leading ห (high-class marker), not a leading vowel — good contrast item.
- IPA: หมา /mǎː/ "dog" · กิน /kīn/ "eats" · ข้าว /khâːw/ "rice"
- Gloss: "the dog eats rice"
- Sources: https://en.wiktionary.org/wiki/หมา · https://en.wiktionary.org/wiki/กิน · https://en.wiktionary.org/wiki/ข้าว

---

## TIER 3 — Harder (4 syllables)

### 17. ไปโรงเรียนไทย — "go to a Thai school"
- Chars: `[ไ,ป,โ,ร,ง,เ,ร,ี,ย,น,ไ,ท,ย]` (13) — ไ0 ป1 โ2 ร3 ง4 เ5 ร6 ี7 ย8 น9 ไ10 ท11 ย12
- Syllables: ไป · โรง · เรียน · ไทย
- **Boundaries: [2, 5, 10]**  **[lead]** ×3 (โ, เ, ไ each open a syllable) — showcase phrase for leading-vowel cues.
- IPA: ไป /pāj/ "go" · โรง /rōːŋ/ "building" · เรียน /rīan/ "study" · ไทย /thāj/ "Thai"
- Gloss: "go to a Thai school"
- Sources: https://en.wiktionary.org/wiki/โรงเรียน · https://en.wiktionary.org/wiki/ไทย

### 18. เด็กไปโรงเรียน — "the child goes to school"
- Chars: `[เ,ด,็,ก,ไ,ป,โ,ร,ง,เ,ร,ี,ย,น]` (14) — เ0 ด1 ็2 ก3 ไ4 ป5 โ6 ร7 ง8 เ9 ร10 ี11 ย12 น13
- Syllables: เด็ก · ไป · โรง · เรียน
- **Boundaries: [4, 6, 9]**  **[lead]** (ไ, โ, เ) + **[final]** (ก closes เด็ก)
- IPA: เด็ก /dèk̚/ "child" · ไป /pāj/ "go" · โรง /rōːŋ/ "building" · เรียน /rīan/ "study"
- Gloss: "the child goes to school"
- Sources: https://en.wiktionary.org/wiki/เด็ก · https://en.wiktionary.org/wiki/ไป · https://en.wiktionary.org/wiki/โรงเรียน

### 19. แมวกินปลาทู — "the cat eats mackerel"
- Chars: `[แ,ม,ว,ก,ิ,น,ป,ล,า,ท,ู]` (11) — แ0 ม1 ว2 ก3 ิ4 น5 ป6 ล7 า8 ท9 ู10
- Syllables: แมว · กิน · ปลา · ทู
- **Boundaries: [3, 6, 9]**  **[lead]** (แ) + **[final]** (น) + long-vowel closure (า closes ปลา)
- IPA: แมว /mɛ̄ːw/ "cat" · กิน /kīn/ "eats" · ปลา /plāː/ "fish" · ทู /thūː/ "mackerel"
- Gloss: *cat eats mackerel* → "the cat eats mackerel" (ปลาทู = "short mackerel")
- Sources: https://en.wiktionary.org/wiki/แมว · https://en.wiktionary.org/wiki/ปลาทู

### 20. ไปกินข้าวเช้า — "go eat breakfast"
- Chars: `[ไ,ป,ก,ิ,น,ข,้,า,ว,เ,ช,้,า]` (13) — ไ0 ป1 ก2 ิ3 น4 ข5 ้6 า7 ว8 เ9 ช10 ้11 า12
- Syllables: ไป · กิน · ข้าว · เช้า
- **Boundaries: [2, 5, 9]**  **[lead]** (ไ, เ) + **[final]** (น closes กิน)
- IPA: ไป /pāj/ "go" · กิน /kīn/ "eat" · ข้าว /khâːw/ "rice" · เช้า /cháːw/ "morning"
- Gloss: *go eat rice morning* → "go eat breakfast"
- Sources: https://en.wiktionary.org/wiki/ไป · https://en.wiktionary.org/wiki/กิน · https://en.wiktionary.org/wiki/ข้าว · https://en.wiktionary.org/wiki/เช้า

---

## Notes on splits & drops
- **No debatable splits included.** Every boundary above falls at a clear word/syllable seam cued by a leading vowel (เ แ โ ไ) and/or an explicit final consonant — no implicit-vowel guesswork.
- **Dropped: ไปตลาด "go to market."** ตลาด is ta-làːt with an *unwritten* implicit vowel in the first syllable (ต|ลาด), so the internal boundary is not cued by any visible character — wrong difficulty and ambiguous for this unit. Excluded.
- **หมา / นัก contrast (phrases 16, 11):** these use the silent high-class leading ห and a short-vowel dead syllable rather than a leading vowel — useful "not every syllable starts with a leading vowel" counter-examples, still fully unambiguous.
- **น้ำ length (phrase 6):** transcribed /náːm/ (conventional isolation length); Wiktionary lists /nam/. Does not affect the boundary array.
- All indices were generated with `[...str]` codepoint enumeration (Thai combining vowels ◌ิ ◌ี ◌ึ ◌ุ ◌ู, the ◌ั/◌็ marks, ◌ำ, and tone marks ◌่ ◌้ each count as one element). The two course worked examples reproduce exactly: ไปโรงเรียน → [2,5], แมวกินปลา → [3,6].
