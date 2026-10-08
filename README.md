# WordUp

Type any English word and see where it came from: its family line, how far back it goes,
its first recorded use, and the words it is related to. Working name, see "Open decisions".

Built with the same stack as Global: React 19, Vite, Tailwind v4, prerendered static pages.

## Status: phase 1 ("Look it up")

Done in this phase:

- Live search: results change on every keystroke, with no search button.
- Word pages: hook, family line, first recorded use (or "not checked yet"), relatives,
  pattern callout, lookalikes that aren't related, sources, confidence label, myth badge.
- Homograph picker: a spelling with several unrelated origins shows the picker before any story.
- Hash routing (`#/w/bear/1`), so the app works on any static host with no server rules.
- Light and dark color tokens, reduced-motion support, phone-width layout.

Not done yet (from the brief's phase 1 list):

- The data pipeline (kaikki.org Wiktionary dump to chains, relatives and homograph splits).
- The search index split into small files. Today the seed words are bundled directly.
- Roughly 20,000 words and about 50 hand-written stories. Only 6 seed entries exist.
- Word of the Day pages.
- Reddit feedback before public launch.

## Data

`src/data/words.ts` holds hand-checked seed entries. Each `firstUse` is `null` until it has been
checked against Wiktionary's dated quotations, and the UI says so rather than inventing a date.
Every entry lists its sources. Myth entries can never carry the `known` confidence label; the
tests enforce this.

Wiktionary text is CC BY-SA. Published data must stay under that license and carry credit. The
app's code does not. Etymonline and the OED must not be copied or scraped.

## Look

- Colors are tokens in `src/index.css`. The brand color (`#0e6b73`) and language-family colors
  are provisional. Check contrast in both themes before launch.
- Headwords use Literata (Google Fonts). The brief's type procedure has not been run yet, so this
  choice is provisional too.
- `npm run style-check` fails the build on the brief's banned patterns: em dashes in source files, Inter
  and other default fonts, gradient text, purple-to-blue gradients, `transition: all`, raw scroll
  listeners, and cream backgrounds. It is a small stand-in for slopscan, which is not on npm
  under that name.

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
