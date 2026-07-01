This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Adding a language to the seed pipeline

The seed pipeline (`scripts/generate-deck.ts` → `scripts/generate-audio.ts` →
`scripts/seed-db.ts`) is parameterized per language via `seed/languages.ts`. To add a
new language:

1. `mkdir seed/<language>` and add `source.csv` inside it (columns: headword, English
   gloss).
2. Add a `LanguageConfig` entry for `<language>` in `seed/languages.ts` (`systemPrompt`,
   `ttsInstructions`, `sectionTags`, `defaultTag`).
3. Run the pipeline for it with the `SEED_LANG` env var:
   ```bash
   SEED_LANG=<language> npm run seed:generate
   SEED_LANG=<language> npm run seed:audio
   SEED_LANG=<language> npm run seed:db
   ```
   PowerShell:
   ```powershell
   $env:SEED_LANG='<language>'; npm run seed:generate
   ```
4. `seed/<language>/research/` is a private, gitignored scratch area for research notes
   — it is never committed.

**Guardrail:** `scripts/refresh-seed-db.ts` and `scripts/normalize-numbers.ts` are
Mandarin-only (pinned to `seed/mandarin`, not `SEED_LANG`-parameterized). Don't run them
for other languages until the database is split per language — `refresh-seed-db.ts` in
particular is destructive (it deletes any card not present in the selected deck) against
a single shared Mandarin card library.
