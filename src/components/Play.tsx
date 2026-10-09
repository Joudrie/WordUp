import { useEffect, useMemo, useState } from 'react'
import { Lightbulb, RotateCcw, Share2 } from 'lucide-react'
import answers from '../../content/game.json'
import { loadLetter } from '../lib/data.ts'
import { letterOf } from '../lib/shard.ts'
import { dayNumber } from '../lib/today.ts'

interface Answer {
  word: string
  language: string
  parts: string
  meaning: string
}
const ANSWERS = answers as Answer[]

// The daily puzzle is the same for everyone; "another word" picks a random one.
const dailyIndex = () => ((dayNumber() % ANSWERS.length) + ANSWERS.length) % ANSWERS.length
const STORE = 'wordup-play'

interface State {
  key: string // "day-<n>" for the daily puzzle, "free-<i>" for extra rounds
  index: number
  guesses: string[]
  hints: number
  solved: boolean
  gaveUp?: boolean
}

function load(): State | null {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? 'null') as State | null
    return s && s.key === `day-${dayNumber()}` ? s : null
  } catch {
    return null
  }
}
function save(s: State) {
  try {
    if (s.key.startsWith('day-')) localStorage.setItem(STORE, JSON.stringify(s))
  } catch {
    // Private mode or blocked storage: the round still works, it just is not remembered.
  }
}

const fresh = (): State => ({ key: `day-${dayNumber()}`, index: dailyIndex(), guesses: [], hints: 0, solved: false })

function hintText(a: Answer, n: number): string {
  return [
    `It comes from ${a.language}.`,
    `Its parts: ${a.parts}.`,
    `It has ${a.word.length} letters.`,
    `It means ${a.meaning}.`,
  ][n]
}
const HINTS = 4

export function PlayPage() {
  const [state, setState] = useState<State>(() => load() ?? fresh())
  const [input, setInput] = useState('')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const answer = ANSWERS[state.index]
  const target = answer.word

  useEffect(() => save(state), [state])

  // What the guesses so far have proved.
  const known = useMemo(() => {
    const inWord = new Set<string>()
    const notIn = new Set<string>()
    let first: string | null = null
    let last: string | null = null
    for (const g of state.guesses) {
      for (const ch of g) (target.includes(ch) ? inWord : notIn).add(ch)
      if (g[0] === target[0]) first = target[0]
      if (g.at(-1) === target.at(-1)) last = target.at(-1) ?? null
    }
    return { inWord: [...inWord].sort(), notIn: [...notIn].sort(), first, last }
  }, [state.guesses, target])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const guess = input.trim().toLowerCase()
    if (!/^[a-z]{2,}$/.test(guess)) return setMessage('Letters only, at least two.')
    if (state.guesses.includes(guess)) return setMessage('You already tried that one.')
    const index = await loadLetter(letterOf(guess))
    if (guess !== target && !index.set.has(guess)) return setMessage(`"${guess}" is not in WordUp's dictionary.`)
    setMessage('')
    setInput('')
    setState((s) => ({ ...s, guesses: [...s.guesses, guess], solved: guess === target }))
  }

  function another() {
    let i = Math.floor(Math.random() * ANSWERS.length)
    if (i === state.index) i = (i + 1) % ANSWERS.length
    setState({ key: `free-${Date.now()}`, index: i, guesses: [], hints: 0, solved: false })
    setMessage('')
  }

  async function share() {
    const text = `WordUp ${state.key.startsWith('day-') ? `#${dayNumber()}` : ''}: solved in ${state.guesses.length} guesses with ${state.hints} hints.`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setMessage(text)
    }
  }

  const HINT_COLORS = ['bg-blue', 'bg-green', 'bg-yellow', 'bg-coral']
  const tile = 'flex h-10 w-10 items-center justify-center rounded-xl border-2 text-lg font-extrabold'

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="headword text-2xl sm:text-3xl">{state.key.startsWith('day-') ? `Puzzle #${dayNumber()}` : 'Practice round'}</h1>
        <span className="text-sm font-semibold">
          {state.guesses.length} {state.guesses.length === 1 ? 'guess' : 'guesses'} · {state.hints} {state.hints === 1 ? 'hint' : 'hints'}
        </span>
      </div>

      {/* The hidden word: first and last letters once found, a squiggle for the secret length. */}
      <div className="sticker bg-purple flex items-center gap-3 p-3.5">
        <span className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border-[2.5px] border-[#16161d] text-3xl font-extrabold ${known.first || state.solved ? 'bg-[var(--sticker-yellow)] text-[#16161d]' : 'border-dashed border-white'}`}>
          {(state.solved ? target[0] : known.first ?? '?').toUpperCase()}
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-center text-center text-sm font-semibold">
          <svg width="120" height="16" viewBox="0 0 120 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
            <path d="M2 8c8-8 12 8 20 0s12 8 20 0 12 8 20 0 12 8 20 0 12 8 20 0 12 8 16 0" />
          </svg>
          {state.solved ? target : 'how long? that is the secret'}
        </span>
        <span className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border-[2.5px] text-3xl font-extrabold ${known.last || state.solved ? 'border-[#16161d] bg-[var(--sticker-yellow)] text-[#16161d]' : 'border-dashed border-white'}`}>
          {(state.solved ? target.at(-1) ?? '' : known.last ?? '?').toUpperCase()}
        </span>
      </div>

      {!state.solved && (
        <form onSubmit={submit} className="mt-4 flex gap-2">
          <label htmlFor="guess" className="sr-only">Your guess</label>
          <input
            id="guess"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Type any word"
            className="sticker h-13 min-w-0 flex-1 bg-[var(--color-card)] px-4 text-lg font-semibold outline-none"
          />
          <button type="submit" className="sticker bg-yellow h-13 px-5 font-extrabold">Guess</button>
        </form>
      )}
      {message && <p className="mt-3 font-semibold" role="status">{message}</p>}

      {state.solved && (
        <div className="sticker bg-yellow mt-4 p-4">
          <p className="text-sm font-semibold">{state.gaveUp ? 'The word was' : `Solved in ${state.guesses.length} guesses`}</p>
          <p className="headword text-5xl leading-none">{target}</p>
          <p className="mt-2 text-lg">From {answer.language}: {answer.parts}.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`#/w/${target}`} className="sticker bg-purple px-4 py-2 font-bold">Read its story</a>
            {!state.gaveUp && (
              <button type="button" onClick={share} className="sticker inline-flex items-center gap-2 bg-[var(--color-card)] px-4 py-2 font-bold text-[var(--color-ink)]">
                <Share2 size={16} aria-hidden /> {copied ? 'Copied' : 'Share'}
              </button>
            )}
            <button type="button" onClick={another} className="sticker inline-flex items-center gap-2 bg-[var(--color-card)] px-4 py-2 font-bold text-[var(--color-ink)]">
              <RotateCcw size={16} aria-hidden /> Another word
            </button>
          </div>
        </div>
      )}

      {/* Letters the guesses have proved, as stickers. Your own keyboard does the typing. */}
      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-sm font-semibold">In the word</span>
        {known.inWord.length ? known.inWord.map((ch) => (
          <span key={ch} className={`${tile} border-[#16161d] bg-[var(--sticker-yellow)] text-[#16161d]`}>{ch.toUpperCase()}</span>
        )) : <span className="text-sm text-[var(--color-muted)]">none yet</span>}
      </div>
      {known.notIn.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-sm font-semibold">Not in it</span>
          {known.notIn.map((ch) => (
            <span key={ch} className={`${tile} border-transparent bg-[var(--color-soft)] text-[var(--color-muted)] line-through`}>{ch.toUpperCase()}</span>
          ))}
        </div>
      )}

      <h2 className="headword mt-6 text-lg">Hint stickers</h2>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {Array.from({ length: HINTS }, (_, i) => {
          const shown = state.solved || i < state.hints
          const next = !state.solved && i === state.hints
          const label = ['Language', 'Its parts', 'Letter count', 'Meaning'][i]
          if (shown) {
            return (
              <div key={i} className={`sticker-flat ${HINT_COLORS[i]} p-3 ${i % 2 ? 'rotate-1' : '-rotate-1'}`}>
                <span className="text-xs font-semibold">{i + 1} · {label}</span>
                <p className="font-extrabold leading-snug">{hintText(answer, i)}</p>
              </div>
            )
          }
          return next ? (
            <button key={i} type="button" onClick={() => setState((s) => ({ ...s, hints: s.hints + 1 }))}
              className="sticker bg-pink flex min-h-16 flex-col justify-center border-dashed p-3 text-left">
              <span className="text-xs font-semibold">{i + 1} · {label}</span>
              <span className="inline-flex items-center gap-1 font-extrabold"><Lightbulb size={16} aria-hidden /> Peel to reveal</span>
            </button>
          ) : (
            <div key={i} className="flex min-h-14 items-center rounded-[18px] border-[2.5px] border-dashed border-[var(--color-muted)] p-3 text-xs font-semibold text-[var(--color-muted)]">
              {i + 1} · {label}
            </div>
          )
        })}
      </div>

      {state.guesses.length > 0 && (
        <div className="mt-6">
          <h2 className="headword text-lg">Your guesses</h2>
          <ol className="mt-2 space-y-2">
            {[...state.guesses].reverse().map((g) => (
              <li key={g} className="flex flex-wrap gap-1">
                {[...g].map((ch, i) => {
                  const hit = target.includes(ch)
                  const edge = (i === 0 && ch === target[0]) || (i === g.length - 1 && ch === target.at(-1))
                  return (
                    <span key={i} className={`${tile} ${edge ? 'border-[#16161d] bg-[var(--sticker-purple)] text-white' : hit ? 'border-[#16161d] bg-[var(--sticker-yellow)] text-[#16161d]' : 'border-transparent bg-[var(--color-soft)] text-[var(--color-muted)]'}`}>
                      {ch.toUpperCase()}
                    </span>
                  )
                })}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Yellow: somewhere in the word. Purple: the first or last letter.</p>
        </div>
      )}

      {!state.solved && state.guesses.length >= 3 && (
        <button type="button" onClick={() => setState((s) => ({ ...s, solved: true, gaveUp: true, hints: HINTS }))}
          className="mt-6 text-sm font-semibold text-[var(--color-muted)] underline">
          Give up and show the word
        </button>
      )}
    </section>
  )
}
