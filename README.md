# WordUp

Type any English word and see where it came from: its family line, how far back it goes,
its first recorded use, and the words it is related to. Working name, see "Open decisions".

Built with the same stack as Global: React 19, Vite, Tailwind v4, prerendered static pages.

## Status

Phase 1 ("Look it up"), in progress.

Done:

- Live search: results change on every keystroke, with no search button.
- Word pages: hook, family line, first recorded use (or "not checked yet"), relatives, pattern
  callout, lookalikes, sources, confidence label, myth badge.
- Homograph picker: a spelling with several unrelated origins shows the picker before any story.
- Hash routing (`#/w/bear/1`), so the app works on any static host with no server rules.
- Light and dark color tokens, reduced-motion support, phone-width layout.
- Data pipeline: `scripts/build-words.mjs` builds about 21,700 entries for the 20,000 most common
  English headwords from the kaikki.org Wiktionary dumps, with ancestor chains through Latin,
  Old/Middle English, Old French, Old Norse, Ancient Greek, Arabic and the proto-languages.
- Data is split into one file per first letter (`public/data/w/`) plus `public/data/index.json`.

Not done yet:

- Human review. Every entry is a draft (`draft: true`): the hook is generated from the chain, and
  the chain comes straight from Wiktionary, so some are wrong. Known examples: *algorithm* goes
  through Anglo-Norman and never reaches Arabic, and *fork* starts with a stray "la *furcō" stage.
  The brief requires review of the top ~1,000 most-visited words before shipping.
- First recorded use. Left empty until verified against dated quotations.
- About 50 hand-written stories and the rabbit-hole pages.
- Word of the Day pages and the phase 2 and 3 features.
- Reddit feedback before public launch.

## Data

Rebuild the data:

    scripts/fetch-wiktionary.sh data        # about 3 GB of dumps, into ./data (git-ignored)
    node --max-old-space-size=8192 scripts/build-words.mjs \
      --dump data/English.jsonl --dump data/Latin.jsonl ... \
      --freq data/en_50k.txt --count 20000 --out public/data

Headwords come from the English dump. Ancestor stages come from the other-language dumps.
Frequency ranks come from hermitdave/FrequencyWords (2018, en_50k).

Wiktionary text is CC BY-SA 4.0. Everything under `public/data/` is derived from it, so it must
stay under that license and keep the credit shown in the footer. The app's code is not covered.
Etymonline and the OED must not be copied or scraped.

## Open decisions

- **Name.** "WordUp" is the repo name and a working name only.
- **Brand color** and **domain**. Neither is chosen yet.
- **Cross-links** to Global and REIGN are not built.
- **Contact address.** The correction link uses sjoudrie@gmail.com, which is the public address
  Global uses. Confirm that WordUp should use it too.

## Commands

    npm install
    npm run dev        # local dev server
    npm test           # search logic and data invariants
    npm run build      # style check, typecheck, production build into dist/
    npm run preview    # serve dist/ locally
