import type { Confidence, Word } from '../data/types.ts'
import { useEntries } from '../lib/hooks.ts'
import { FamilyLine } from './FamilyLine.tsx'
import { OriginChips } from './Origins.tsx'

// Quotation references are long; end them at a word boundary rather than mid-word.
function shortSource(source: string, max = 110): string {
  if (source.length <= max) return source
  const cut = source.slice(0, max)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(', '), cut.lastIndexOf(' '))).replace(/[,;:\s]+$/, '')}…`
}

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
        <a key={i} href={`#/w/${word}/${i}`} className="sticker block bg-[var(--color-card)] p-4">
          <span className="headword text-2xl">{e.word}</span>{' '}
          <span className="text-[var(--color-muted)]">({e.sense})</span>
          <p className="mt-1">{e.hook}</p>
        </a>
      ))}
    </div>
  )
}

export function WordPage({ word, sense }: { word: string; sense: number | null }) {
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
        <h1 className="headword text-5xl sm:text-6xl">{word}</h1>
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
    <article className="space-y-8">
      <header>
        <h1 className="headword text-5xl sm:text-6xl">{entry.word}</h1>
        <p className="mt-2 text-[var(--color-muted)]">{entry.sense}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border-2 border-[var(--color-ink)] px-3 py-1 font-bold">
            {CONFIDENCE_TEXT[entry.confidence]}
          </span>
          <OriginChips origin={entry.origin} via={entry.via} />
          {entry.labels?.map((l) => (
            <a key={l} href="#/slang" className="bg-pink rounded-full border-2 border-[#16161d] px-3 py-1 font-bold">
              {l === 'internet' ? 'Internet word' : l === 'slang' ? 'Slang' : 'New word'}
            </a>
          ))}
          {entry.myth && (
            <span className="bg-coral rounded-full border-2 border-[#16161d] px-3 py-1 font-bold">
              Myth: a popular origin that is false or oversimplified
            </span>
          )}
        </div>
      </header>

      <div>
        <p className="sticker bg-yellow p-4 text-lg leading-snug">{entry.hook}</p>
        {entry.draft && (
          <p className="mt-2 text-sm text-[var(--color-muted)]">Drafted from Wiktionary; not yet checked by a person.</p>
        )}
      </div>

      {entry.parts && entry.parts.length > 0 && (
        <section aria-labelledby="parts">
          <h2 id="parts" className="headword text-lg">Built from</h2>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-lg">
            {entry.parts.map((p, i) => (
              <span key={`${p.form}-${i}`} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true" className="text-[var(--color-muted)]">+</span>}
                {p.link || p.id !== undefined ? (
                  <a href={p.id !== undefined ? `#/affixes/${p.id}` : `#/w/${p.form}`} className="headword rounded-full border border-[var(--color-rule)] px-3 py-1 hover:border-[var(--color-brand)]">{p.form}</a>
                ) : (
                  <span className={`headword rounded-full px-3 py-1 ${p.affix ? 'bg-[var(--color-card)] ring-1 ring-[var(--color-rule)]' : 'border border-[var(--color-rule)]'}`}>{p.form}</span>
                )}
              </span>
            ))}
          </p>
        </section>
      )}

      {entry.roots && entry.roots.length > 0 && (
        <section aria-labelledby="roots">
          <h2 id="roots" className="headword text-lg">Ancient root</h2>
          <p className="mt-3 flex flex-wrap gap-2">
            {entry.roots.map((r) => (
              <a key={r.id} href={`#/roots/${r.id}`} className="headword rounded-full border border-[var(--color-rule)] px-3 py-1 text-lg hover:border-[var(--color-brand)]">
                *{r.root}
              </a>
            ))}
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">See every English word that grew from the same root.</p>
        </section>
      )}

      <section aria-labelledby="family-line">
        <h2 id="family-line" className="headword text-lg">The family line</h2>
        <div className="mt-4"><FamilyLine chain={entry.chain} /></div>
        {hasReconstructed && (
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            Words marked * were never written down. Linguists rebuilt them by comparing the languages that descended from them.
          </p>
        )}
      </section>

      <section aria-labelledby="first-use">
        <h2 id="first-use" className="headword text-lg">First recorded use</h2>
        {entry.firstUse ? (
          <div className="mt-2 space-y-1">
            <p>
              <span className="headword text-2xl">{entry.firstUse.year}</span>{' '}
              <span className="text-[var(--color-muted)]">is the earliest example we know of.</span>
            </p>
            {entry.firstUse.quote && <p className="italic">"{entry.firstUse.quote}"</p>}
            {entry.firstUse.source && <p className="text-sm text-[var(--color-muted)]">{shortSource(entry.firstUse.source)}</p>}
            <p className="text-sm">
              <a className="underline" href={`https://en.wiktionary.org/wiki/${encodeURIComponent(entry.word)}`}>More quotations on Wiktionary</a>
            </p>
          </div>
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
          <h2 id="relatives" className="headword text-lg">Relatives</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {entry.relatives.map((r) => (
              <li key={r.word}>
                <a href={`#/w/${r.word}`} className="inline-block rounded-full border border-[var(--color-rule)] px-3 py-1 hover:border-[var(--color-brand)]">{r.word}</a>
                {r.note && <span className="ml-1 text-sm text-[var(--color-muted)]">{r.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {entry.lookalikes && entry.lookalikes.length > 0 && (
        <section aria-labelledby="lookalikes">
          <h2 id="lookalikes" className="headword text-lg">Look alike, not related</h2>
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
          {entry.sources.map((s) => (
            <li key={s}>
              {s === 'Wiktionary' ? (
                <a className="underline" href={`https://en.wiktionary.org/wiki/${encodeURIComponent(entry.word)}`}>Wiktionary: {entry.word}</a>
              ) : (
                s
              )}
            </li>
          ))}
        </ul>
        <p className="mt-4">
          <a className="underline" href="#/">Search again</a>
        </p>
      </footer>
    </article>
  )
}
