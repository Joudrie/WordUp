import { useEffect, useMemo, useState } from 'react'
import { Dices, Search } from 'lucide-react'
import curated from '../../content/curated-words.json'
import { liveSearch, normalizeQuery, type LiveView } from '../lib/search.ts'
import { letterOf } from '../lib/shard.ts'
import { loadLetter } from '../lib/data.ts'
import type { ChainStep, Word } from '../data/types.ts'
import { useEntries, useLetterIndex } from '../lib/hooks.ts'
import { dayNumber, pickForToday } from '../lib/today.ts'
import { STORIES } from './Stories.tsx'
import { WordChip } from './ui.tsx'

type CuratedWord = Pick<Word, 'word' | 'hook' | 'sense'> & { labels?: string[]; chain: ChainStep[] }
const CURATED = curated as CuratedWord[]
// Word of the day: the hand-checked words, one per day, slang excluded.
const DAILY = CURATED.filter((w, i, all) => !w.labels?.length && all.findIndex((x) => x.word === w.word) === i)
const SLANG = CURATED.filter((w) => w.labels?.length)

function Picker({ entries }: { entries: Word[] }) {
  return (
    <div className="space-y-3">
      <p className="font-semibold">Two or more unrelated words share this spelling. Pick one:</p>
      {entries.map((e, i) => (
        <a key={i} href={`#/w/${e.word}/${i}`} className="sticker block bg-[var(--color-card)] p-4">
          <span className="headword text-2xl">{e.word}</span> <span className="text-[var(--color-muted)]">({e.sense})</span>
          <p className="mt-1">{e.hook}</p>
        </a>
      ))}
    </div>
  )
}

function ExactCard({ word }: { word: string }) {
  const { entries } = useEntries(word)
  if (!entries) return <p className="font-semibold text-[var(--color-muted)]">Loading…</p>
  if (entries.length > 1) return <Picker entries={entries} />
  return (
    <a href={`#/w/${word}`} className="sticker bg-yellow block p-5">
      <span className="headword text-4xl">{word}</span>
      <p className="mt-2 text-lg">{entries[0].hook}</p>
      <p className="mt-3 font-bold">Read the story →</p>
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
      if (live) setAll(lists.flatMap((idx) => idx.sorted.map((w, i) => [w, i] as [string, number])))
    })
    return () => {
      live = false
    }
  }, [enabled, all])
  return all
}

function ContainsResults({ letters, mode }: { letters: string; mode: 'contains' | 'ends' }) {
  const all = useAllWords(true)
  const matches = useMemo(() => {
    if (!all || letters.length < 2) return null
    const hit = mode === 'ends' ? (w: string) => w.endsWith(letters) && w !== letters : (w: string) => w.includes(letters)
    return all.filter(([w]) => hit(w)).sort((a, b) => a[1] - b[1] || a[0].length - b[0].length).map(([w]) => w)
  }, [all, letters, mode])
  if (letters.length < 2) return <p className="font-semibold text-[var(--color-muted)]">Type at least two letters.</p>
  if (!matches) return <p className="font-semibold text-[var(--color-muted)]">Loading every word…</p>
  return (
    <div>
      <p className="font-semibold">
        {matches.length.toLocaleString()} words {mode === 'ends' ? 'end with' : 'contain'}{' '}
        <span className="rounded-md bg-[var(--sticker-yellow)] px-1 text-[#16161d]">{letters}</span>, most common first.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {matches.slice(0, 150).map((w) => (
          <li key={w}><WordChip word={w} /></li>
        ))}
      </ul>
    </div>
  )
}

async function surprise() {
  // A random fairly common word: pick a letter, then one of its 400 most common words.
  const letter = 'abcdefghilmnoprstw'[Math.floor(Math.random() * 18)]
  const index = await loadLetter(letter)
  const pool = index.sorted.slice(0, 400)
  if (pool.length) window.location.hash = `#/w/${encodeURIComponent(pool[Math.floor(Math.random() * pool.length)])}`
}

function Today() {
  const word = pickForToday(DAILY)
  const story = pickForToday(STORIES, 5)
  const slang = pickForToday(SLANG, 2)
  const from = word.chain.find((s) => s.language !== 'Modern English')?.language.replace(/^(Ancient|Old|Middle|Medieval|Late|Classical) /, '')
  return (
    <div className="grid grid-cols-2 gap-3">
      <a href={`#/w/${word.word}`} className="sticker bg-yellow col-span-2 flex flex-col gap-1 p-4">
        <span className="flex items-center justify-between text-sm font-semibold">
          <span>Word of the day</span>
          {from && <span className="rounded-full bg-[#16161d] px-2.5 py-0.5 text-white">{from}</span>}
        </span>
        <span className="headword text-4xl leading-none">{word.word}</span>
        <span className="text-base">{word.hook}</span>
      </a>
      <a href="#/play" className="sticker bg-purple flex min-h-32 flex-col gap-1 p-3.5">
        <span className="text-sm font-semibold">Puzzle #{dayNumber()}</span>
        <span className="headword text-xl leading-tight">Guess the word</span>
        <span className="mt-auto text-sm font-semibold">No length given. Go →</span>
      </a>
      <a href={`#/stories/${story.id}`} className="sticker bg-coral flex min-h-32 flex-col gap-1 p-3.5">
        <span className="text-sm font-semibold">Story</span>
        <span className="headword text-lg leading-tight">{story.title}</span>
      </a>
      <button type="button" onClick={surprise} className="sticker bg-green flex min-h-28 flex-col items-start gap-1 p-3.5 text-left">
        <Dices size={28} aria-hidden />
        <span className="headword mt-auto text-lg">Surprise me</span>
      </button>
      <a href={`#/w/${slang.word}`} className="sticker bg-pink flex min-h-28 flex-col gap-0.5 p-3.5">
        <span className="text-sm font-semibold">Slang check</span>
        <span className="headword text-xl">{slang.word}</span>
        <span className="line-clamp-2 text-sm">{slang.hook.split('. ')[0]}</span>
      </a>
    </div>
  )
}

type Mode = 'starts' | 'contains' | 'ends'

export function Home({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  const [mode, setMode] = useState<Mode>('starts')
  const letters = normalizeQuery(query)
  const letterIndex = useLetterIndex(mode === 'starts' && letters ? letterOf(letters) : null)
  const view: LiveView | null = useMemo(
    () => (!letters ? { kind: 'empty' } : letterIndex ? liveSearch(letterIndex, letters) : null),
    [letters, letterIndex],
  )

  return (
    <section>
      <label className="sticker flex h-14 items-center gap-3 bg-[var(--color-card)] px-4">
        <Search size={22} aria-hidden strokeWidth={2.6} />
        <span className="sr-only">Search</span>
        <input
          id="word"
          type="search"
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={mode === 'starts' ? 'Search any word' : mode === 'contains' ? 'Letters inside a word' : 'How a word ends'}
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-[var(--color-muted)]"
        />
      </label>
      <div role="group" aria-label="Search mode" className="mt-3 flex gap-2 text-sm font-semibold">
        {([['starts', 'Starts with'], ['contains', 'Contains'], ['ends', 'Ends with']] as const).map(([m, label]) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1.5 ${mode === m ? 'bg-[var(--color-ink)] text-[var(--color-page)]' : 'border-2 border-[var(--color-ink)]'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 min-h-40" aria-live="polite">
        {!letters ? (
          <Today />
        ) : mode !== 'starts' ? (
          <ContainsResults letters={letters} mode={mode} />
        ) : !view ? (
          <p className="font-semibold text-[var(--color-muted)]">Loading…</p>
        ) : view.kind === 'guess' ? (
          <div className="sticker-flat p-4">
            <p className="headword text-3xl">{view.letters}</p>
            <p className="mt-1 text-[var(--color-muted)]">No complete word yet, so the best guess leads.</p>
            {view.guess && <p className="mt-3">Best guess: <WordChip word={view.guess} /></p>}
          </div>
        ) : view.kind === 'exact' ? (
          <ExactCard word={view.letters} />
        ) : null}

        {mode === 'starts' && view && (view.kind === 'exact' || view.kind === 'guess') && view.underneath.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-semibold">Longer words that start the same way</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {view.underneath.map((w) => <li key={w}><WordChip word={w} /></li>)}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
