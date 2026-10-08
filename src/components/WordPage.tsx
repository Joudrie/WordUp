import type { Confidence, Word } from '../data/types.ts'
import type { WordIndex } from '../lib/data.ts'
import { useEntries } from '../lib/hooks.ts'
import { FamilyLine } from './FamilyLine.tsx'

const CONFIDENCE_TEXT: Record<Confidence, string> = {
  known: 'Known origin',
  likely: 'Likely origin',
  disputed: 'Disputed origin',
  unknown: 'Origin unknown',
}

function Picker({ word, entries }: { word: string; entries: Word[] }) {
  return (
    <div className="space-y-3">
      <p className="text-[var(--color-muted)]">
        "{word}" is two unrelated words. The two stories are completely different:
      </p>
      {entries.map((e, i) => (
        <a key={i} href={`#/w/${word}/${i}`} className="block rounded-xl border border-[var(--color-rule)] bg-[var(--color-card)] p-4 hover:border-[var(--color-brand)]">
          <span className="headword text-2xl">{e.word}</span>{' '}
          <span className="text-[var(--color-muted)]">({e.sense})</span>
          <p className="mt-1">{e.hook}</p>
        </a>
      ))}
    </div>
  )
}

export function WordPage({ index, word, sense }: { index: WordIndex; word: string; sense: number | null }) {
  const { entries } = useEntries(word)

  if (entries === null) {
    return <p className="text-[var(--color-muted)]">Loading…</p>
  }

  if (entries.length === 0) {
    return (
      <section>
        <h1 className="headword text-4xl">{word}</h1>
        <p className="mt-4">WordUp doesn't have this word yet.</p>
        <a className="mt-4 inline-block underline" href="#/">Search for another word</a>
      </section>
    )
  }

  // Homographs: show the picker before any story, as the brief asks.
  if (entries.length > 1 && sense === null) {
    return (
      <section>
        <h1 className="headword text-6xl sm:text-7xl">{word}</h1>
        <div className="mt-8"><Picker word={word} entries={entries} /></div>
      </section>
    )
  }

  const entry = entries[sense ?? 0]
  if (!entry) {
    return (
      <section>
        <p>That sense of "{word}" doesn't exist.</p>
        <a className="underline" href={`#/w/${word}`}>See all senses</a>
      </section>
    )
  }

  const hasReconstructed = entry.chain.some((s) => s.reconstructed)

  return (
    <article className="space-y-10">
      <header>
        <h1 className="headword text-6xl sm:text-8xl">{entry.word}</h1>
        <p className="mt-2 text-[var(--color-muted)]">{entry.sense}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-[var(--color-card)] px-3 py-1 ring-1 ring-[var(--color-rule)]">
            {CONFIDENCE_TEXT[entry.confidence]}
          </span>
          {entry.myth && (
            <span className="rounded-full bg-[var(--color-card)] px-3 py-1 font-medium text-[var(--color-latin)] ring-1 ring-[var(--color-rule)]">
              Myth: a popular origin that is false or oversimplified
            </span>
          )}
        </div>
      </header>

      <div>
        <p className="text-xl leading-relaxed">{entry.hook}</p>
        {entry.draft && (
          <p className="mt-2 text-sm text-[var(--color-muted)]">Drafted from Wiktionary; not yet checked by a person.</p>
        )}
      </div>

      <section aria-labelledby="family-line">
        <h2 id="family-line" className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">The family line</h2>
        <div className="mt-4"><FamilyLine chain={entry.chain} /></div>
        {hasReconstructed && (
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            Words marked * were never written down. Linguists rebuilt them by comparing the languages that descended from them.
          </p>
        )}
      </section>

      <section aria-labelledby="first-use">
        <h2 id="first-use" className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">First recorded use</h2>
        {entry.firstUse ? (
          <p className="mt-2">
            {entry.firstUse.year}, the earliest example we know of
            {entry.firstUse.quote && <>: <q>{entry.firstUse.quote}</q></>}
          </p>
        ) : (
          <p className="mt-2 text-[var(--color-muted)]">Not checked yet.</p>
        )}
      </section>

      {entry.pattern && (
        <aside className="rounded-xl border border-[var(--color-rule)] p-4">
          <p className="font-medium">Pattern: <span className="headword">{entry.pattern.affix}</span></p>
          <p className="mt-1">{entry.pattern.text}</p>
        </aside>
      )}

      {entry.relatives.length > 0 && (
        <section aria-labelledby="relatives">
          <h2 id="relatives" className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Relatives</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {entry.relatives.map((r) => (
              <li key={r.word}>
                {index.set.has(r.word) ? (
                  <a href={`#/w/${r.word}`} className="inline-block rounded-full border border-[var(--color-rule)] px-3 py-1 hover:border-[var(--color-brand)]">{r.word}</a>
                ) : (
                  <span className="inline-block rounded-full border border-[var(--color-rule)] px-3 py-1">{r.word}</span>
                )}
                {r.note && <span className="ml-1 text-sm text-[var(--color-muted)]">{r.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {entry.lookalikes && entry.lookalikes.length > 0 && (
        <section aria-labelledby="lookalikes">
          <h2 id="lookalikes" className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Look alike, not related</h2>
          <ul className="mt-3 space-y-2">
            {entry.lookalikes.map((l) => (
              <li key={l.word}><span className="headword">{l.word}</span>: {l.note}</li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t border-[var(--color-rule)] pt-4 text-sm text-[var(--color-muted)]">
        <h2 className="font-semibold">Sources</h2>
        <ul className="mt-2 list-disc pl-5">
          {entry.sources.map((s) => <li key={s}>{s}</li>)}
        </ul>
        <p className="mt-4">
          <a className="underline" href="#/">Search again</a>
        </p>
      </footer>
    </article>
  )
}
