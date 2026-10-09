import { useEffect, useMemo, useState } from 'react'
import { cachedJson, type OriginGroup } from '../lib/data.ts'
import { useOrigins } from '../lib/hooks.ts'
import { letterOf } from '../lib/shard.ts'
import { originColor, OriginFlags } from './Origins.tsx'
import { PageTitle, SectionHeading } from './ui.tsx'

// Sentences written to lean hard on one source. Check them yourself: every word is
// coloured from the same data as the rest of the site.
// Even a sentence packed with French words is held together by English ones (the, a,
// and), which is the lesson.
const EXAMPLES: { label: string; text: string }[] = [
  { label: 'French-heavy', text: 'The elegant chef served a delicious dessert at the grand restaurant, and the generous guests gave a round of applause.' },
  { label: 'Latin-heavy', text: 'The administration announced an immediate investigation into the financial situation of the university.' },
  { label: 'Greek-heavy', text: 'The philosopher used logic and rhetoric to analyze the theory of democracy in his academic thesis.' },
  { label: 'Old English', text: 'The old man and his wife walked home through the wet green fields, and the children sang a little song.' },
  { label: 'Norse-heavy', text: 'They took their skinny kid to the window, but the ugly sky made him scared and he wanted to leave.' },
]

// Irregular forms the suffix rules cannot undo.
const IRREGULAR: Record<string, string> = {
  children: 'child', men: 'man', women: 'woman', people: 'person', mice: 'mouse', feet: 'foot', teeth: 'tooth', geese: 'goose',
  was: 'be', were: 'be', is: 'be', are: 'be', am: 'be', been: 'be', has: 'have', had: 'have', did: 'do', does: 'do',
  went: 'go', gone: 'go', took: 'take', taken: 'take', gave: 'give', given: 'give', came: 'come', saw: 'see', seen: 'see',
  sang: 'sing', sung: 'sing', ran: 'run', ate: 'eat', eaten: 'eat', drank: 'drink', swam: 'swim', sat: 'sit', stood: 'stand',
  said: 'say', made: 'make', knew: 'know', known: 'know', thought: 'think', brought: 'bring', bought: 'buy', caught: 'catch',
  taught: 'teach', wrote: 'write', written: 'write', spoke: 'speak', spoken: 'speak', told: 'tell', found: 'find', felt: 'feel',
  fell: 'fall', began: 'begin', begun: 'begin', got: 'get', left: 'leave', kept: 'keep', slept: 'sleep', met: 'meet',
  held: 'hold', led: 'lead', paid: 'pay', sold: 'sell', sent: 'send', built: 'build', lost: 'lose', won: 'win', his: 'he',
  him: 'he', her: 'she', them: 'they', their: 'they', its: 'it', our: 'we', us: 'we', my: 'I', me: 'I',
}

/** Plausible headwords for an inflected form: "walked" -> walk, "children" stays. */
function candidates(word: string): string[] {
  const out = [word]
  if (IRREGULAR[word]) out.push(IRREGULAR[word])
  const add = (w: string) => w.length > 1 && out.push(w)
  if (word.endsWith("'s")) add(word.slice(0, -2))
  if (word.endsWith('ies')) add(`${word.slice(0, -3)}y`)
  if (word.endsWith('es')) add(word.slice(0, -2))
  if (word.endsWith('s') && !word.endsWith('ss')) add(word.slice(0, -1))
  for (const end of ['ed', 'ing']) {
    if (!word.endsWith(end)) continue
    const stem = word.slice(0, -end.length)
    add(stem)
    add(`${stem}e`)
    if (/(.)\1$/.test(stem)) add(stem.slice(0, -1))
  }
  if (word.endsWith('ied')) add(`${word.slice(0, -3)}y`)
  if (word.endsWith('ly')) add(word.slice(0, -2))
  return out
}

function useOriginMaps(letters: string[]): Map<string, Record<string, number>> | null {
  const key = letters.join('')
  const [state, setState] = useState<{ key: string; maps: Map<string, Record<string, number>> } | null>(null)
  useEffect(() => {
    let live = true
    Promise.all(letters.map((l) => cachedJson<Record<string, number>>(`om/${l}.json`).catch(() => ({}))))
      .then((list) => live && setState({ key, maps: new Map(letters.map((l, i) => [l, list[i]])) }))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state && state.key === key ? state.maps : null
}

export function LabPage() {
  const [text, setText] = useState(EXAMPLES[0].text)
  const [mode, setMode] = useState<'via' | 'origin'>('via')
  const origins = useOrigins()
  const tokens = useMemo(() => text.split(/([A-Za-zÀ-ÿ']+)/), [text])
  const letters = useMemo(
    () => [...new Set(tokens.filter((_, i) => i % 2 === 1).map((t) => letterOf(t.toLowerCase())))].sort(),
    [tokens],
  )
  const maps = useOriginMaps(letters)

  const groupOf = (word: string): OriginGroup | undefined => {
    if (!maps || !origins) return undefined
    const w = word.toLowerCase()
    const map = maps.get(letterOf(w)) ?? {}
    for (const c of candidates(w)) {
      // Each value is origin * 100 + via.
      const v = Object.hasOwn(map, c) ? map[c] : undefined
      if (v !== undefined) return origins.groups[mode === 'origin' ? Math.floor(v / 100) : v % 100]
    }
    return undefined
  }

  const counts = new Map<string, { group: OriginGroup; n: number }>()
  let known = 0
  let total = 0
  if (maps && origins) {
    tokens.forEach((t, i) => {
      if (i % 2 === 0) return
      total++
      const g = groupOf(t)
      if (!g) return
      known++
      const c = counts.get(g.id) ?? { group: g, n: 0 }
      c.n++
      counts.set(g.id, c)
    })
  }

  return (
    <section>
      <PageTitle kicker="Explore" title="Sentence lab">
        Type or paste any English. Every word is coloured by the language English took it from, or switch to where it
        ultimately comes from.
      </PageTitle>
      <div role="group" aria-label="Colour by" className="mb-4 inline-flex rounded-full border border-[var(--color-rule)] p-1 text-sm">
        {([['via', 'Came in through'], ['origin', 'Comes from']] as const).map(([m, label]) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1 ${mode === m ? 'bg-[var(--color-brand)] text-[var(--color-brand-ink)]' : 'text-[var(--color-muted)]'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button key={e.label} type="button" onClick={() => setText(e.text)}
            className="rounded-full border border-[var(--color-rule)] px-3 py-1 text-sm hover:border-[var(--color-brand)]">
            {e.label}
          </button>
        ))}
      </div>
      <label htmlFor="lab-text" className="sr-only">Your sentence</label>
      <textarea
        id="lab-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full rounded-xl border border-[var(--color-rule)] bg-[var(--color-card)] p-3 text-lg outline-none focus:border-[var(--color-brand)]"
      />

      <p className="headword mt-6 text-2xl leading-relaxed" aria-live="polite">
        {tokens.map((t, i) => {
          if (i % 2 === 0) return <span key={i}>{t}</span>
          const g = groupOf(t)
          return g ? (
            <a key={i} href={`#/w/${encodeURIComponent(t.toLowerCase())}`} title={g.label}
              className="underline decoration-2 underline-offset-4" style={{ color: originColor(g), textDecorationColor: originColor(g) }}>
              {t}
            </a>
          ) : (
            <span key={i} className="text-[var(--color-muted)]">{t}</span>
          )
        })}
      </p>

      {maps && origins && total > 0 && (
        <div className="mt-8">
          <SectionHeading>This sentence</SectionHeading>
          <ul className="mt-3 space-y-2">
            {[...counts.values()].sort((a, b) => b.n - a.n).map(({ group, n }) => (
              <li key={group.id} className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: originColor(group) }} />
                <a href={`#/origins/${group.id}`} className="flex items-center gap-2 hover:underline"><OriginFlags id={group.id} />{group.label}</a>
                <span className="text-sm tabular-nums text-[var(--color-muted)]">{n} of {known} ({Math.round((100 * n) / known)}%)</span>
              </li>
            ))}
          </ul>
          {known < total && <p className="mt-3 text-sm text-[var(--color-muted)]">{total - known} words in grey have no recorded origin yet.</p>}
        </div>
      )}
    </section>
  )
}
