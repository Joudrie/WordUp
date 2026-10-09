import { useState } from 'react'
import type { OriginGroup } from '../lib/data.ts'
import { useOrigins, useSection } from '../lib/hooks.ts'
import { BackLink, Flag, Loading, WordList } from './ui.tsx'

// Flags only where a section maps to modern countries. Ancient and multi-country
// sections (Latin, Arabic, Native American ...) have none.
export const ORIGIN_FLAGS: Record<string, string[]> = {
  french: ['fr'], greek: ['gr'], italian: ['it'], 'spanish-portuguese': ['es', 'pt'], 'dutch-german': ['nl', 'de'],
  norse: ['is'], celtic: ['ie'], chinese: ['cn'], japanese: ['jp'], india: ['in'], persian: ['ir'], turkic: ['tr'],
}

export function OriginFlags({ id, size = 'sm' }: { id: string; size?: 'sm' | 'lg' }) {
  const codes = ORIGIN_FLAGS[id]
  if (!codes) return null
  return (
    <span className="inline-flex gap-1 align-middle">
      {codes.map((c) => <Flag key={c} code={c} size={size} />)}
    </span>
  )
}

const FAMILY_COLOR: Record<string, string> = {
  latin: 'var(--color-latin)',
  french: 'var(--color-french)',
  germanic: 'var(--color-germanic)',
  greek: 'var(--color-greek)',
  arabic: 'var(--color-arabic)',
  norse: 'var(--color-norse)',
}
export const originColor = (g: Pick<OriginGroup, 'family'>) => FAMILY_COLOR[g.family] ?? 'var(--color-neutral)'

// Each section keeps one sticker colour everywhere it appears.
const STICKER: Record<string, string> = {
  english: 'bg-green', french: 'bg-purple', latin: 'bg-coral', greek: 'bg-blue', norse: 'bg-yellow', 'dutch-german': 'bg-pink',
}
const stickerOf = (id: string) => STICKER[id] ?? 'bg-pink'

type Scope = 'top1000' | 'common' | 'all'
const SCOPE_TEXT: Record<Scope, string> = {
  top1000: 'of the 1,000 most common words',
  common: 'of the 10,000 most common words',
  all: 'of every word with a known origin',
}

function Pills<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2 text-sm font-semibold">
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1.5 ${value === v ? 'bg-[var(--color-ink)] text-[var(--color-page)]' : 'border-2 border-[var(--color-ink)]'}`}>
          {text}
        </button>
      ))}
    </div>
  )
}

const pct = (n: number, total: number) => {
  const p = (100 * n) / total
  return p < 0.1 ? '<0.1' : p < 1 ? p.toFixed(1) : String(Math.round(p))
}

/** Where English words come from: blocks sized by share, then every section. */
export function OriginsPage() {
  const data = useOrigins()
  const [scope, setScope] = useState<Scope>('top1000')
  const [mode, setMode] = useState<'via' | 'origin'>('via')
  if (!data) return <Loading />

  const counts = data.counts[mode][scope] ?? data.counts[mode].common
  const known = data.groups.reduce((n, g) => n + (counts[g.id] ?? 0), 0)
  const rows = data.groups.map((g) => ({ ...g, n: counts[g.id] ?? 0 })).filter((g) => g.n > 0).sort((a, b) => b.n - a.n)
  const [first, second, third, fourth] = rows
  const rest = rows.length - 4

  // The twist: whatever leads the whole dictionary by original source.
  const all = data.counts.origin.all
  const allKnown = data.groups.reduce((n, g) => n + (all[g.id] ?? 0), 0)
  const allTop = data.groups.map((g) => ({ ...g, n: all[g.id] ?? 0 })).sort((a, b) => b.n - a.n)[0]

  return (
    <section>
      <h1 className="headword text-2xl sm:text-3xl">Where words come from</h1>
      <p className="mt-1 text-base">
        {first ? <><b>{first.label}</b> leads with <b>{pct(first.n, known)}%</b> {SCOPE_TEXT[scope]}, counted by {mode === 'via' ? 'the language English borrowed them from' : 'their original source'}.</> : null}
      </p>
      <div className="mt-3 space-y-2">
        <Pills label="Which words" value={scope} onChange={setScope} options={[['top1000', 'Top 1,000'], ['common', 'Top 10,000'], ['all', 'All words']]} />
        <Pills label="Count by" value={mode} onChange={setMode} options={[['via', 'Borrowed from'], ['origin', 'Original source']]} />
      </div>

      {first && second && (
        <div className="mt-5 flex flex-col gap-3">
          <a href={`#/origins/${first.id}`} className={`sticker ${stickerOf(first.id)} flex min-h-48 flex-col p-4`}>
            <span className="flex items-start justify-between">
              <span className="headword text-6xl leading-none">{pct(first.n, known)}%</span>
              <OriginFlags id={first.id} size="lg" />
            </span>
            <span className="headword text-2xl">{first.label}</span>
            <span className="mt-auto text-sm font-semibold">{first.n.toLocaleString()} words · see them all →</span>
          </a>
          <div className="flex min-h-44 gap-3">
            <a href={`#/origins/${second.id}`} className={`sticker ${stickerOf(second.id)} flex basis-[62%] flex-col p-3.5`}>
              <span className="flex items-start justify-between gap-2">
                <span className="headword text-4xl leading-none">{pct(second.n, known)}%</span>
                <OriginFlags id={second.id} size="lg" />
              </span>
              <span className="headword text-lg leading-tight">{second.label}</span>
              <span className="mt-auto text-sm font-semibold">{second.n.toLocaleString()} words →</span>
            </a>
            <div className="flex flex-1 flex-col gap-3">
              {[third, fourth].filter(Boolean).map((g) => (
                <a key={g.id} href={`#/origins/${g.id}`} className={`sticker ${stickerOf(g.id)} flex flex-1 flex-col p-2.5`}>
                  <span className="headword text-xl leading-none">{pct(g.n, known)}%</span>
                  <span className="text-xs font-bold leading-tight">{g.label}</span>
                </a>
              ))}
              {rest > 0 && (
                <a href="#every-source" className="sticker-flat bg-pink px-2.5 py-1 text-sm font-extrabold">+{rest} more</a>
              )}
            </div>
          </div>
        </div>
      )}

      {allTop && first && allTop.id !== first.id && (
        <p className="mt-5 -rotate-1 rounded-[18px] border-[2.5px] border-dashed border-[var(--color-ink)] p-3.5 text-base">
          <b>Plot twist:</b> across every word, by original source, <b>{allTop.label}</b> leads with <b>{pct(allTop.n, allKnown)}%</b>.
          What we say most is not what the dictionary is made of.
        </p>
      )}

      <h2 id="every-source" className="headword mt-8 text-lg">Every source</h2>
      <ul className="mt-2 space-y-2">
        {rows.map((g) => (
          <li key={g.id}>
            <a href={`#/origins/${g.id}`} className="sticker-flat flex items-center gap-3 px-3 py-2 hover:bg-[var(--sticker-yellow)] hover:text-[#16161d]">
              <span className={`h-4 w-4 shrink-0 rounded-full border-2 border-[#16161d] ${stickerOf(g.id)}`} />
              <span className="flex min-w-0 flex-1 items-center gap-2 font-semibold"><OriginFlags id={g.id} />{g.label}</span>
              <span className="text-sm font-bold tabular-nums">{pct(g.n, known)}%</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-[var(--color-muted)]">
        Loose groupings from Wiktionary's etymologies. Percentages are of words with a known origin;{' '}
        {(counts.unknown ?? 0).toLocaleString()} more have no recorded history yet.
      </p>
    </section>
  )
}

/** One origin section: every word from that source, most common first. */
export function SectionPage({ id }: { id: string }) {
  const data = useOrigins()
  const words = useSection(id)
  const group = data?.groups.find((g) => g.id === id)
  if (data && !group) return <p>There is no "{id}" section. <a className="underline" href="#/origins">See all origins</a>.</p>
  if (!group || !words) return <Loading />
  return (
    <section>
      <BackLink href="#/origins">All origins</BackLink>
      <div className={`sticker ${stickerOf(id)} mt-2 mb-5 flex items-center justify-between gap-3 p-4`}>
        <div>
          <h1 className="headword text-2xl sm:text-3xl">{group.label}</h1>
          <p className="text-sm font-semibold">{words.length.toLocaleString()} words with {group.label} in their history, most common first</p>
        </div>
        <OriginFlags id={id} size="lg" />
      </div>
      <WordList words={words} />
    </section>
  )
}

/** Small chips on a word page linking to its origin sections. */
export function OriginChips({ origin, via }: { origin?: string; via?: string }) {
  const data = useOrigins()
  if (!data || !origin || origin === 'unknown') return null
  const label = (id: string) => data.groups.find((g) => g.id === id)
  const from = label(origin)
  const through = via && via !== origin ? label(via) : undefined
  return (
    <>
      {from && (
        <a href={`#/origins/${from.id}`} className={`inline-flex items-center gap-1.5 rounded-full border-2 border-[#16161d] px-3 py-1 font-bold ${stickerOf(from.id)}`}>
          <OriginFlags id={from.id} /> From {from.label}
        </a>
      )}
      {through && (
        <a href={`#/origins/${through.id}`} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--color-ink)] px-3 py-1 font-bold">
          <OriginFlags id={through.id} /> Came in through {through.label}
        </a>
      )}
    </>
  )
}
