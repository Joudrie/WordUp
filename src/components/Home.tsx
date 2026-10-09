import { useEffect, useMemo, useState } from 'react'
import { Calendar, Lightbulb, Puzzle } from 'lucide-react'
import curated from '../../content/curated-words.json'
import { liveSearch, normalizeQuery, type LiveView } from '../lib/search.ts'
import { letterOf } from '../lib/shard.ts'
import { loadLetter } from '../lib/data.ts'
import type { Word } from '../data/types.ts'
import { useEntries, useLetterIndex } from '../lib/hooks.ts'
import { pickForToday } from '../lib/today.ts'
import { ExploreList, PLACES } from './Explore.tsx'
import { STORIES } from './Stories.tsx'
import { SectionHeading, WordChip } from './ui.tsx'

// Word of the day: the hand-checked words, one per day, slang excluded.
type CuratedWord = Pick<Word, 'word' | 'hook' | 'sense'> & { labels?: string[] }
const DAILY = (curated as CuratedWord[]).filter((w, i, all) => !w.labels?.length && all.findIndex((x) => x.word === w.word) === i)

function Picker({ entries }: { entries: Word[] }) {
  return (
    <div className="space-y-3">
      <p className="text-[var(--color-muted)]">Two or more unrelated words share this spelling. Pick one:</p>
      {entries.map((e, i) => (
        <a key={i} href={`#/w/${e.word}/${i}`} className="block rounded-xl border border-[var(--color-rule)] bg-[var(--color-card)] p-4 hover:border-[var(--color-brand)]">
          <span className="headword text-2xl">{e.word}</span> <span className="text-[var(--color-muted)]">({e.sense})</span>
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

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('')

/** Every headword, loaded only when someone searches inside words. Each entry keeps its
 *  position in its letter list, which is roughly how common it is. */
function useAllWords(enabled: boolean): [string, number][] | null {
  const [all, setAll] = useState<[string, number][] | null>(null)
  useEffect(() => {
    if (!enabled || all) return
    let live = true
    Promise.all(LETTERS.map((l) => loadLetter(l))).then((lists) => {
      if (!live) return
      setAll(lists.flatMap((idx) => idx.sorted.map((w, i) => [w, i] as [string, number])))
    })
    return () => {
      live = false
    }
  }, [enabled, all])
  return all
}

function ContainsResults({ letters }: { letters: string }) {
  const all = useAllWords(true)
  const matches = useMemo(() => {
    if (!all || letters.length < 2) return null
    return all.filter(([w]) => w.includes(letters)).sort((a, b) => a[1] - b[1] || a[0].length - b[0].length).map(([w]) => w)
  }, [all, letters])
  if (letters.length < 2) return <p className="text-[var(--color-muted)]">Type at least two letters to search inside words.</p>
  if (!matches) return <p className="text-[var(--color-muted)]">Loading every word…</p>
  return (
    <div>
      <p className="text-[var(--color-muted)]">
        {matches.length.toLocaleString()} words contain <span className="headword text-[var(--color-ink)]">{letters}</span>, most common first.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {matches.slice(0, 150).map((w) => (
          <li key={w}><WordChip word={w} /></li>
        ))}
      </ul>
    </div>
  )
}

function Today() {
  const word = pickForToday(DAILY)
  const story = pickForToday(STORIES, 5)
  return (
    <div className="grid gap-6 sm:grid-cols-[3fr_2fr]">
      <a href={`#/w/${word.word}`} className="group block rounded-xl border-2 border-[var(--color-brand)] p-5">
        <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-brand)]">
          <Calendar size={16} aria-hidden /> Word of the day
        </span>
        <span className="headword mt-2 block text-5xl group-hover:underline">{word.word}</span>
        <span className="mt-2 block text-lg">{word.hook}</span>
      </a>
      <div className="space-y-6">
        <a href={`#/stories/${story.id}`} className="group block">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            <Lightbulb size={16} aria-hidden /> Story of the day
          </span>
          <span className="headword mt-1 block text-xl group-hover:underline">{story.title}</span>
          <span className="mt-1 block text-[var(--color-muted)]">{story.body.split('. ')[0]}.</span>
        </a>
        <a href="#/play" className="group block">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            <Puzzle size={16} aria-hidden /> Today's puzzle
          </span>
          <span className="mt-1 block group-hover:underline">Guess a word without knowing its length.</span>
        </a>
      </div>
    </div>
  )
}

export function Home({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  const [mode, setMode] = useState<'starts' | 'contains'>('starts')
  const letters = normalizeQuery(query)
  const letterIndex = useLetterIndex(mode === 'starts' && letters ? letterOf(letters) : null)
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
        placeholder={mode === 'starts' ? 'Type a word' : 'Letters inside a word'}
        className="headword w-full border-b-2 border-[var(--color-rule)] bg-transparent py-2 text-5xl text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)] sm:text-7xl"
      />
      <div role="group" aria-label="Search mode" className="mt-3 inline-flex rounded-full border border-[var(--color-rule)] p-1 text-sm">
        {([['starts', 'Starts with'], ['contains', 'Contains']] as const).map(([m, label]) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1 ${mode === m ? 'bg-[var(--color-brand)] text-[var(--color-brand-ink)]' : 'text-[var(--color-muted)]'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-8 min-h-40" aria-live="polite">
        {!letters ? (
          <div className="space-y-12">
            <Today />
            <div>
              <SectionHeading>Explore</SectionHeading>
              <div className="mt-3"><ExploreList places={PLACES.slice(0, 6)} /></div>
              <a href="#/explore" className="mt-3 inline-block text-[var(--color-brand)] underline">Everything to explore</a>
            </div>
          </div>
        ) : mode === 'contains' ? (
          <ContainsResults letters={letters} />
        ) : !view ? (
          <p className="text-[var(--color-muted)]">Loading…</p>
        ) : view.kind === 'guess' ? (
          <div>
            <p className="headword text-3xl">{view.letters}</p>
            <p className="mt-2 italic text-[var(--color-muted)]">No complete word yet, so the best guess leads.</p>
            {view.guess && <p className="mt-4">Best guess: <WordChip word={view.guess} /></p>}
          </div>
        ) : view.kind === 'exact' ? (
          <ExactCard word={view.letters} />
        ) : null}

        {mode === 'starts' && view && (view.kind === 'exact' || view.kind === 'guess') && view.underneath.length > 0 && (
          <div className="mt-6">
            <p className="text-sm text-[var(--color-muted)]">Longer words that start the same way:</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {view.underneath.map((w) => <li key={w}><WordChip word={w} /></li>)}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
