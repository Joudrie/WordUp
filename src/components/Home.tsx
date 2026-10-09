import { useMemo } from 'react'
import { liveSearch, normalizeQuery, type LiveView } from '../lib/search.ts'
import { letterOf } from '../lib/shard.ts'
import type { Word } from '../data/types.ts'
import { useEntries, useLetterIndex } from '../lib/hooks.ts'

const STARTERS = ['fork', 'bear', 'algorithm', 'beef', 'posh']

function WordLink({ word, className = '' }: { word: string; className?: string }) {
  return (
    <a href={`#/w/${encodeURIComponent(word)}`} className={`rounded-full border border-[var(--color-rule)] px-3 py-1 hover:border-[var(--color-brand)] ${className}`}>
      {word}
    </a>
  )
}

function Picker({ entries }: { entries: Word[] }) {
  return (
    <div className="space-y-3">
      <p className="text-[var(--color-muted)]">Two or more unrelated words share this spelling. Pick one:</p>
      {entries.map((e, i) => (
        <a key={i} href={`#/w/${e.word}/${i}`} className="block rounded-xl border border-[var(--color-rule)] bg-[var(--color-card)] p-4 hover:border-[var(--color-brand)]">
          <span className="headword text-2xl">{e.word}</span>{' '}
          <span className="text-[var(--color-muted)]">({e.sense})</span>
          <p className="mt-1">{e.hook}</p>
        </a>
      ))}
    </div>
  )
}

function ExactCard({ word }: { word: string }) {
  const { entries } = useEntries(word)
  if (!entries) return <p className="text-[var(--color-muted)]">Loading…</p>
  if (entries.length > 1) return <Picker entries={entries} />
  return (
    <a href={`#/w/${word}`} className="block rounded-xl border border-[var(--color-rule)] bg-[var(--color-card)] p-5 hover:border-[var(--color-brand)]">
      <span className="headword text-4xl">{word}</span>
      <p className="mt-2 text-lg">{entries[0].hook}</p>
      <p className="mt-3 text-sm text-[var(--color-brand)]">Read the story →</p>
    </a>
  )
}

export function Home({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  const letters = normalizeQuery(query)
  const letterIndex = useLetterIndex(letters ? letterOf(letters) : null)
  const view: LiveView | null = useMemo(
    () => (!letters ? { kind: 'empty' } : letterIndex ? liveSearch(letterIndex, letters) : null),
    [letters, letterIndex],
  )
  return (
    <section>
      <label htmlFor="word" className="sr-only">Type a word</label>
      <input
        id="word"
        autoFocus
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Type a word"
        className="headword w-full border-b-2 border-[var(--color-rule)] bg-transparent py-2 text-5xl text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)] sm:text-7xl"
      />

      <div className="mt-8 min-h-40" aria-live="polite">
        {!view && <p className="text-[var(--color-muted)]">Loading…</p>}

        {view?.kind === 'empty' && (
          <div>
            <p className="text-lg">Type any English word. Its story appears as you type.</p>
            <p className="mt-4 text-sm text-[var(--color-muted)]">Try:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {STARTERS.map((w) => <WordLink key={w} word={w} />)}
            </div>
          </div>
        )}

        {view?.kind === 'guess' && (
          <div>
            <p className="headword text-3xl">{view.letters}</p>
            <p className="mt-2 italic text-[var(--color-muted)]">No complete word yet, so the best guess leads.</p>
            {view.guess && (
              <p className="mt-4">
                Best guess: <WordLink word={view.guess} className="font-medium" />
              </p>
            )}
          </div>
        )}

        {view?.kind === 'exact' && <ExactCard word={view.letters} />}

        {(view?.kind === 'exact' || view?.kind === 'guess') && view.underneath.length > 0 && (
          <div className="mt-6">
            <p className="text-sm text-[var(--color-muted)]">Longer words that start the same way:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {view.underneath.map((w) => <WordLink key={w} word={w} />)}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
