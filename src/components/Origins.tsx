import { useState } from 'react'
import type { OriginGroup } from '../lib/data.ts'
import { useOrigins, useSection } from '../lib/hooks.ts'

const FAMILY_COLOR: Record<string, string> = {
  latin: 'var(--color-latin)',
  french: 'var(--color-french)',
  germanic: 'var(--color-germanic)',
  greek: 'var(--color-greek)',
  arabic: 'var(--color-arabic)',
  norse: 'var(--color-norse)',
}
export const originColor = (g: Pick<OriginGroup, 'family'>) => FAMILY_COLOR[g.family] ?? 'var(--color-neutral)'

function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full border border-[var(--color-rule)] p-1 text-sm">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1 ${value === v ? 'bg-[var(--color-brand)] text-[var(--color-brand-ink)]' : 'text-[var(--color-muted)]'}`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

/** The "where English words come from" page: one bar per origin section. */
export function OriginsPage() {
  const data = useOrigins()
  const [mode, setMode] = useState<'origin' | 'via'>('origin')
  const [scope, setScope] = useState<'common' | 'all'>('common')
  if (!data) return <p className="text-[var(--color-muted)]">Loading…</p>

  const counts = data.counts[mode][scope]
  const known = data.groups.reduce((n, g) => n + (counts[g.id] ?? 0), 0)
  const rows = data.groups
    .map((g) => ({ ...g, n: counts[g.id] ?? 0 }))
    .filter((g) => g.n > 0)
    .sort((a, b) => b.n - a.n)
  const max = rows[0]?.n ?? 1

  return (
    <section>
      <h1 className="headword text-4xl sm:text-5xl">Where English words come from</h1>
      <p className="mt-3 text-lg">
        {scope === 'common'
          ? 'Most everyday words are native English, even though most dictionary words are borrowed.'
          : 'Across the whole dictionary, borrowed words outnumber native ones.'}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Toggle label="Which words" value={scope} onChange={setScope} options={[['common', '10,000 most common'], ['all', 'All words']]} />
        <Toggle label="Count by" value={mode} onChange={setMode} options={[['origin', 'Comes from'], ['via', 'Came in through']]} />
      </div>

      <ul className="mt-8 space-y-3">
        {rows.map((g) => {
          const pct = (100 * g.n) / known
          return (
            <li key={g.id}>
              <a href={`#/origins/${g.id}`} className="group block">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="group-hover:underline">{g.label}</span>
                  <span className="text-sm tabular-nums text-[var(--color-muted)]">
                    {pct < 0.1 ? '<0.1' : pct < 1 ? pct.toFixed(1) : Math.round(pct)}% · {g.n.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-[var(--color-rule)]">
                  <div className="h-2 rounded-full" style={{ width: `${Math.max(1, (100 * g.n) / max)}%`, backgroundColor: originColor(g) }} />
                </div>
              </a>
            </li>
          )
        })}
      </ul>
      <p className="mt-8 text-sm text-[var(--color-muted)]">
        Loose groupings from Wiktionary's etymologies. Percentages are of the {known.toLocaleString()} words with a known origin;{' '}
        {(counts.unknown ?? 0).toLocaleString()} more have no recorded history yet. "Comes from" is the oldest written-down
        language in a word's family line; "came in through" is the language English took it from.
      </p>
    </section>
  )
}

const PAGE = 150

/** One origin section: every word from that source, most common first. */
export function SectionPage({ id }: { id: string }) {
  const data = useOrigins()
  const words = useSection(id)
  const [shown, setShown] = useState(PAGE)
  const group = data?.groups.find((g) => g.id === id)
  if (data && !group) return <p>There is no "{id}" section. <a className="underline" href="#/origins">See all origins</a>.</p>
  if (!group || !words) return <p className="text-[var(--color-muted)]">Loading…</p>

  return (
    <section>
      <a href="#/origins" className="text-sm text-[var(--color-muted)] underline">All origins</a>
      <h1 className="headword mt-2 text-4xl sm:text-5xl" style={{ color: originColor(group) }}>{group.label}</h1>
      <p className="mt-3 text-[var(--color-muted)]">
        {words.length.toLocaleString()} English words with {group.label} in their history, most common first.
      </p>
      <ul className="mt-6 flex flex-wrap gap-2">
        {words.slice(0, shown).map((w) => (
          <li key={w}>
            <a href={`#/w/${encodeURIComponent(w)}`} className="inline-block rounded-full border border-[var(--color-rule)] px-3 py-1 hover:border-[var(--color-brand)]">{w}</a>
          </li>
        ))}
      </ul>
      {shown < words.length && (
        <button type="button" onClick={() => setShown((n) => n + PAGE * 2)} className="mt-6 rounded-full border border-[var(--color-rule)] px-4 py-2 hover:border-[var(--color-brand)]">
          Show more ({(words.length - shown).toLocaleString()} left)
        </button>
      )}
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
        <a href={`#/origins/${from.id}`} className="rounded-full bg-[var(--color-card)] px-3 py-1 ring-1 ring-[var(--color-rule)] hover:ring-[var(--color-brand)]">
          From <span style={{ color: originColor(from) }}>{from.label}</span>
        </a>
      )}
      {through && (
        <a href={`#/origins/${through.id}`} className="rounded-full bg-[var(--color-card)] px-3 py-1 ring-1 ring-[var(--color-rule)] hover:ring-[var(--color-brand)]">
          Came in through <span style={{ color: originColor(through) }}>{through.label}</span>
        </a>
      )}
    </>
  )
}
