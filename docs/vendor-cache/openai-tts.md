---
source: https://platform.openai.com/docs/guides/text-to-speech (page is auth-walled; summary built from OpenAI model docs + web search May 2026)
fetched: 2026-05-21
last_updated_upstream: model gpt-4o-mini-tts released 2025-03
why_cached: Choosing the TTS model + voice for pre-generated pronunciation clips
---

# OpenAI Text-to-Speech (cached summary)

## Model choice: `gpt-4o-mini-tts`

- Cost-efficient TTS model (announced Mar 2025). Speech endpoint: `/v1/audio/speech`.
- **Steerable**: an `instructions` field controls tone, emotion, speed, accent
  (e.g. "Speak slowly and clearly in standard Mandarin, neutral teaching tone").
- **Strong in Mandarin Chinese**; supports 50+ languages.
- Pricing: ~$0.60 / 1M text-input tokens, $12 / 1M audio-output tokens ≈ **$0.015 /
  minute** of audio. Our deck is small and generated once → cost is trivial.
- Older alternatives: `tts-1` (fast) and `tts-1-hd` (higher quality) — NOT steerable,
  no `instructions`. We prefer `gpt-4o-mini-tts`.

## Voices (13)

Alloy, Ash, Ballad, Coral, Echo, Fable, Nova, Onyx, Sage, Shimmer, Verse, plus
Marin and Cedar. Each voice keeps its character but adapts to the instructed style.

## Output formats

mp3 (default), opus, aac, flac, wav, pcm. We use **mp3** for broad browser support
and small size.

## Key implications for this project

- Voice is chosen ONCE for the whole deck. Changing the voice later means
  **regenerating every clip** (cheap, but a deliberate re-seed step).
- The seed pipeline calls `audio.speech.create({ model: 'gpt-4o-mini-tts', voice,
  input, instructions, response_format: 'mp3' })`, then uploads the buffer to Blob.
- This API key is needed ONLY at seed/dev time, never in production (audio is
  pre-generated — see ADR 0001).
