import type { PatternStat } from '../lib/data.ts'
import { useJson, useOrigins } from '../lib/hooks.ts'
import { originColor, OriginFlags } from './Origins.tsx'
import { BackLink, Loading, PageTitle, SectionHeading, WordChip } from './ui.tsx'

const where = (p: PatternStat) => (p.position === 'start' ? `${p.letters}…` : p.position === 'end' ? `…${p.letters}` : `…${p.letters}…`)

/** Biggest origins first, as [id, count] pairs. */
const ranked = (p: PatternStat) => Object.entries(p.byOrigin).sort((a, b) => b[1] - a[1])

export function PatternsPage() {
  const patterns = useJson<PatternStat[]>('patterns/index.json')
  const origins = useOrigins()
  if (!patterns || !origins) return <Loading />
  const label = (id: string) => origins.groups.find((g) => g.id === id)?.label ?? id
  return (
    <section>
      <PageTitle kicker="Explore" title="Spelling patterns">
        A few letters can tell you where a word came from before you know what it means.
      </PageTitle>
      <ul className="divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
        {patterns.map((p) => {
          const [top, n] = ranked(p)[0] ?? ['', 0]
          return (
            <li key={p.id}>
              <a href={`#/patterns/${p.id}`} className="group flex items-baseline gap-4 py-4">
                <span className="headword w-24 shrink-0 text-2xl text-[var(--color-brand)]">{where(p)}</span>
                <span className="min-w-0">
                  <span className="block group-hover:underline">{p.title}</span>
                  {top && (
                    <span className="block text-sm text-[var(--color-muted)]">
                      Mostly {label(top)} ({Math.round((100 * n) / p.total)}% of {p.total.toLocaleString()} words)
                    </span>
                  )}
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function PatternPage({ id }: { id: string }) {
  const patterns = useJson<PatternStat[]>('patterns/index.json')
  const origins = useOrigins()
  if (!patterns || !origins) return <Loading />
  const p = patterns.find((x) => x.id === id)
  if (!p) return <p>No such pattern. <a className="underline" href="#/patterns">See all patterns</a>.</p>
  const rows = ranked(p)
  const max = rows[0]?.[1] ?? 1
  return (
    <section>
      <BackLink href="#/patterns">All patterns</BackLink>
      <PageTitle title={where(p)}>{p.text}</PageTitle>
      <SectionHeading>
        {p.basis === 'via'
          ? `The language English took these ${p.total.toLocaleString()} words from`
          : `Where these ${p.total.toLocaleString()} words ultimately come from`}
      </SectionHeading>
      <ul className="mt-4 space-y-6">
        {rows.map(([gid, n]) => {
          const g = origins.groups.find((x) => x.id === gid)
          if (!g) return null
          return (
            <li key={gid}>
              <div className="flex items-baseline justify-between gap-3">
                <a href={`#/origins/${gid}`} className="flex items-center gap-2 hover:underline"><OriginFlags id={gid} />{g.label}</a>
                <span className="text-sm tabular-nums text-[var(--color-muted)]">{Math.round((100 * n) / p.total)}% · {n.toLocaleString()}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-[var(--color-rule)]">
                <div className="h-2 rounded-full" style={{ width: `${Math.max(1, (100 * n) / max)}%`, backgroundColor: originColor(g) }} />
              </div>
              <ul className="mt-2 flex flex-wrap gap-2">
                {(p.examples[gid] ?? []).map((w) => <li key={w}><WordChip word={w} /></li>)}
              </ul>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
