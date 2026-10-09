import { useEffect, useMemo, useState } from 'react'
import { Lightbulb, RotateCcw, Share2 } from 'lucide-react'
import answers from '../../content/game.json'
import { loadLetter } from '../lib/data.ts'
import { letterOf } from '../lib/shard.ts'
import { dayNumber } from '../lib/today.ts'
import { PageTitle, SectionHeading } from './ui.tsx'

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

  return (
    <section>
      <PageTitle kicker={state.key.startsWith('day-') ? "Today's word" : 'Practice round'} title="Guess the word">
        Type any word. We tell you which of its letters are in the hidden word, and whether you have the first or last letter.
        We never tell you how long it is, unless you ask for that hint.
      </PageTitle>

      {!state.solved && (
        <form onSubmit={submit} className="flex gap-2">
          <label htmlFor="guess" className="sr-only">Your guess</label>
          <input
            id="guess"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Type a word"
            className="headword min-w-0 flex-1 border-b-2 border-[var(--color-rule)] bg-transparent py-2 text-3xl outline-none focus:border-[var(--color-brand)]"
          />
          <button type="submit" className="rounded-full bg-[var(--color-brand)] px-5 text-[var(--color-brand-ink)]">Guess</button>
        </form>
      )}
      {message && <p className="mt-3 text-[var(--color-muted)]" role="status">{message}</p>}

      {state.solved && (
        <div className="rounded-xl border-2 border-[var(--color-brand)] p-5">
          <p className="text-sm uppercase tracking-wide text-[var(--color-muted)]">
            {state.gaveUp ? 'The word was' : `Solved in ${state.guesses.length} guesses`}
          </p>
          <p className="headword mt-1 text-5xl">{target}</p>
          <p className="mt-3 text-lg">From {answer.language}: {answer.parts}.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={`#/w/${target}`} className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-[var(--color-brand-ink)]">Read its story</a>
            {!state.gaveUp && (
              <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-rule)] px-4 py-2">
                <Share2 size={16} aria-hidden /> {copied ? 'Copied' : 'Share'}
              </button>
            )}
            <button type="button" onClick={another} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-rule)] px-4 py-2">
              <RotateCcw size={16} aria-hidden /> Another word
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <SectionHeading>What you know</SectionHeading>
          <ul className="mt-3 space-y-2">
            <li>Starts with: <strong className="headword text-xl">{known.first ? known.first.toUpperCase() : '?'}</strong></li>
            <li>Ends with: <strong className="headword text-xl">{known.last ? known.last.toUpperCase() : '?'}</strong></li>
            <li>
              In the word:{' '}
              <span className="headword text-xl tracking-widest text-[var(--color-brand)]">{known.inWord.join(' ').toUpperCase() || '?'}</span>
            </li>
            <li>
              Not in the word:{' '}
              <span className="headword text-xl tracking-widest text-[var(--color-muted)] line-through">{known.notIn.join(' ').toUpperCase() || '-'}</span>
            </li>
          </ul>
        </div>
        <div>
          <SectionHeading>Hints</SectionHeading>
          <ol className="mt-3 space-y-2">
            {Array.from({ length: state.solved ? HINTS : state.hints }, (_, i) => <li key={i}>{hintText(answer, i)}</li>)}
          </ol>
          {!state.solved && state.hints < HINTS && (
            <button type="button" onClick={() => setState((s) => ({ ...s, hints: s.hints + 1 }))}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-rule)] px-4 py-2 hover:border-[var(--color-brand)]">
              <Lightbulb size={16} aria-hidden /> {state.hints === 0 ? 'Give me a hint' : 'Another hint'}
            </button>
          )}
        </div>
      </div>

      {state.guesses.length > 0 && (
        <div className="mt-8">
          <SectionHeading>Your guesses</SectionHeading>
          <ol className="mt-3 space-y-2">
            {[...state.guesses].reverse().map((g) => (
              <li key={g} className="headword flex flex-wrap gap-1 text-2xl">
                {[...g].map((ch, i) => {
                  const hit = target.includes(ch)
                  const edge = (i === 0 && ch === target[0]) || (i === g.length - 1 && ch === target.at(-1))
                  return (
                    <span key={i}
                      className={`inline-flex h-10 w-9 items-center justify-center rounded-md ${edge ? 'bg-[var(--color-brand)] text-[var(--color-brand-ink)]' : hit ? 'ring-2 ring-[var(--color-brand)]' : 'text-[var(--color-muted)]'}`}>
                      {ch.toUpperCase()}
                    </span>
                  )
                })}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Outlined: the letter is somewhere in the word. Filled: it is the word's first or last letter.
          </p>
        </div>
      )}

      {!state.solved && state.guesses.length >= 3 && (
        <button type="button" onClick={() => setState((s) => ({ ...s, solved: true, gaveUp: true, hints: HINTS }))}
          className="mt-8 text-sm text-[var(--color-muted)] underline">
          Give up and show the word
        </button>
      )}
    </section>
  )
}
