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
- Data pipeline: `scripts/build-words.mjs --all` builds an entry for every plain English word in
  the kaikki.org Wiktionary dump, with ancestor chains through Latin, Old/Middle English, Old
  French, Old Norse, Ancient Greek, Arabic and the proto-languages.
- First recorded use: the earliest dated quotation Wiktionary has for the word, shown as "the
  earliest example we know of" with the quote and its source.
- Data layout: `public/data/i/<letter>.json` lists every headword for a first letter, most common
  first (search loads one on the first keystroke); `public/data/w/<two letters>.json` holds the
  entries; `public/data/index.json` has the count and license.
- Hand-checked entries live in `content/curated-words.json` and replace the generated drafts.

Not done yet:

- Human review. Every entry is a draft (`draft: true`): the hook is generated from the chain, and
  the chain comes straight from Wiktionary, so some are wrong. Known examples: *algorithm* goes
  through Anglo-Norman and never reaches Arabic, and *fork* starts with a stray "la *furcō" stage.
  The brief requires review of the top ~1,000 most-visited words before shipping.
- First recorded use only covers words Wiktionary quotes with a date. Etymonline and the OED have
  better dates, but their terms do not allow copying.
- About 50 hand-written stories and the rabbit-hole pages.
- Word of the Day pages and the phase 2 and 3 features.
- Reddit feedback before public launch.

## What is on the site

- **Search** by start of word, or **contains** any letters (eau finds beautiful).
- **Word pages**: hook, parts, ancient root, family line, first recorded use, origin chips, slang label.
- **Explore**: origins (21 sections), roots (Proto-Indo-European), prefixes and suffixes, spelling
  patterns, slang and internet words, sentence lab, Old English to modern, word stories.
- **Play**: a daily word game with no length shown; hints teach the word's language and roots.
- **Today**: word of the day and story of the day, one per calendar day.

Hand-written content lives in `content/`: `curated-words.json` (checked entries, featured slang),
`stories.json`, `patterns.json`, `old-english.json` (public-domain texts) and `game.json`.
Flags in `public/flags/` are copied from Global and used only for sections that map to modern
countries.

## Data

Rebuild the data:

    scripts/fetch-wiktionary.sh data        # about 3 GB of dumps, into ./data (git-ignored)
    node --max-old-space-size=12288 scripts/build-words.mjs \
      --dump data/English.jsonl --dump data/Latin.jsonl ... \
      --freq data/en_50k.txt --all --out public/data

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
