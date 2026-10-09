import { useMemo, useState } from 'react'
import type { AffixSummary, RootSummary } from '../lib/data.ts'
import { useJson, useOrigins } from '../lib/hooks.ts'
import { OriginFlags } from './Origins.tsx'
import { BackLink, Loading, PageTitle, WordList } from './ui.tsx'

function Filter({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={label}
      aria-label={label}
      className="mb-6 w-full rounded-full border border-[var(--color-rule)] bg-transparent px-4 py-2 outline-none focus:border-[var(--color-brand)]"
    />
  )
}

export function RootsPage() {
  const roots = useJson<RootSummary[]>('roots/index.json')
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (roots ?? []).filter((r) => !t || r.root.includes(t) || r.gloss?.toLowerCase().includes(t) || r.sample.some((w) => w.includes(t))).slice(0, 200)
  }, [roots, q])
  if (!roots) return <Loading />
  return (
    <section>
      <PageTitle kicker="Explore" title="Roots">
        Words that look nothing alike can grow from one ancient root. These are Proto-Indo-European roots: never written down,
        rebuilt by comparing the languages that came from them, so each is marked with an asterisk.
      </PageTitle>
      <Filter value={q} onChange={setQ} label="Filter by root, meaning or word" />
      <ul className="divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
        {shown.map((r) => (
          <li key={r.id}>
            <a href={`#/roots/${r.id}`} className="group block py-3">
              <span className="headword text-xl text-[var(--color-brand)] group-hover:underline">*{r.root}</span>
              {r.gloss && <span className="ml-2 text-[var(--color-muted)]">{r.gloss}</span>}
              <span className="block text-sm text-[var(--color-muted)]">{r.n} words: {r.sample.slice(0, 6).join(', ')}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function RootPage({ id }: { id: string }) {
  const r = useJson<RootSummary & { words: string[] }>(`roots/${id}.json`)
  if (!r) return <Loading />
  return (
    <section>
      <BackLink href="#/roots">All roots</BackLink>
      <PageTitle title={`*${r.root}`}>
        {r.gloss ? <>Meant “{r.gloss}”. </> : null}
        {r.words.length.toLocaleString()} English words grew from it, most common first.
      </PageTitle>
      <WordList words={r.words} />
    </section>
  )
}

export function AffixesPage() {
  const affixes = useJson<AffixSummary[]>('affixes/index.json')
  const origins = useOrigins()
  const [kind, setKind] = useState<'prefix' | 'suffix'>('prefix')
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/-/g, '')
    return (affixes ?? [])
      // A typed filter searches prefixes and suffixes together.
      .filter((a) => t || (kind === 'prefix' ? a.affix.endsWith('-') : a.affix.startsWith('-')))
      .filter((a) => !t || a.affix.includes(t) || a.gloss?.toLowerCase().includes(t))
      .slice(0, 200)
  }, [affixes, kind, q])
  if (!affixes || !origins) return <Loading />
  const label = (id: string) => origins.groups.find((g) => g.id === id)?.label
  return (
    <section>
      <PageTitle kicker="Explore" title="Prefixes and suffixes">
        The pieces English builds words from. Learn a few and you can read words you have never seen.
      </PageTitle>
      <div role="group" aria-label="Kind" className="mb-4 inline-flex rounded-full border border-[var(--color-rule)] p-1 text-sm">
        {(['prefix', 'suffix'] as const).map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
            className={`rounded-full px-3 py-1 ${kind === k ? 'bg-[var(--color-brand)] text-[var(--color-brand-ink)]' : 'text-[var(--color-muted)]'}`}>
            {k === 'prefix' ? 'Prefixes' : 'Suffixes'}
          </button>
        ))}
      </div>
      <Filter value={q} onChange={setQ} label="Filter by letters or meaning" />
      <ul className="divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
        {shown.map((a) => (
          <li key={a.id}>
            <a href={`#/affixes/${a.id}`} className="group block py-3">
              <span className="headword text-xl text-[var(--color-brand)] group-hover:underline">{a.affix}</span>
              {a.gloss && <span className="ml-2 text-[var(--color-muted)]">{a.gloss}</span>}
              <span className="block text-sm text-[var(--color-muted)]">
                {a.origin !== 'unknown' && label(a.origin) ? `${label(a.origin)} · ` : ''}
                {a.n.toLocaleString()} words: {a.sample.slice(0, 5).join(', ')}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function AffixPage({ id }: { id: string }) {
  const a = useJson<AffixSummary & { words: string[] }>(`affixes/${id}.json`)
  const origins = useOrigins()
  if (!a) return <Loading />
  const origin = a.origin !== 'unknown' ? origins?.groups.find((g) => g.id === a.origin) : undefined
  return (
    <section>
      <BackLink href="#/affixes">All prefixes and suffixes</BackLink>
      <PageTitle title={a.affix}>
        {a.gloss ? <>Means “{a.gloss}”. </> : null}
        {origin && (
          <a href={`#/origins/${origin.id}`} className="inline-flex items-center gap-2 underline"><OriginFlags id={origin.id} />From {origin.label}.</a>
        )}{' '}
        Used in {a.words.length.toLocaleString()} words, most common first.
      </PageTitle>
      <WordList words={a.words} />
    </section>
  )
}
