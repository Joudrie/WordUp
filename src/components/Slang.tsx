import { useState } from 'react'
import curated from '../../content/curated-words.json'
import { useJson } from '../lib/hooks.ts'
import { Loading, PageTitle, WordList } from './ui.tsx'

type Tab = 'internet' | 'slang' | 'new'
const TABS: [Tab, string, string][] = [
  ['internet', 'Internet', 'Words born or spread online.'],
  ['slang', 'Slang', 'Informal words, old and new.'],
  ['new', 'New words', 'Recent coinages Wiktionary marks as neologisms.'],
]

// Hand-written slang entries, with their origins credited.
const FEATURED = (curated as { word: string; hook: string; labels?: string[] }[]).filter((w) => w.labels?.length)

export function SlangPage() {
  const [tab, setTab] = useState<Tab>('internet')
  const words = useJson<string[]>(`sections/${tab}.json`)
  return (
    <section>
      <PageTitle kicker="Explore" title="Slang and internet words">
        Dictionaries treat new words as real words, and so do we. Many started in African American English, ballroom culture,
        gaming or fan communities before everyone used them, and we say so.
      </PageTitle>

      <ul className="mb-10 divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
        {FEATURED.map((w) => (
          <li key={w.word}>
            <a href={`#/w/${w.word}`} className="group block py-3">
              <span className="headword text-xl text-[var(--color-brand)] group-hover:underline">{w.word}</span>
              <span className="block text-[var(--color-muted)]">{w.hook}</span>
            </a>
          </li>
        ))}
      </ul>

      <div role="group" aria-label="List" className="mb-3 inline-flex flex-wrap rounded-full border border-[var(--color-rule)] p-1 text-sm">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}
            className={`rounded-full px-3 py-1 ${tab === id ? 'bg-[var(--color-brand)] text-[var(--color-brand-ink)]' : 'text-[var(--color-muted)]'}`}>
            {label}
          </button>
        ))}
      </div>
      <p className="mb-4 text-[var(--color-muted)]">
        {TABS.find((t) => t[0] === tab)?.[2]} {words ? `${words.length.toLocaleString()} words, most common first.` : ''}
      </p>
      {words ? <WordList key={tab} words={words} /> : <Loading />}
    </section>
  )
}
