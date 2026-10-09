import { useState, type ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'

const BASE = import.meta.env.BASE_URL

/** A small national flag. Only used where a language maps to one modern country. */
export function Flag({ code, title }: { code: string; title?: string }) {
  return (
    <img
      src={`${BASE}flags/${code}.svg`}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      className="inline-block h-3 w-[18px] rounded-[2px] object-cover ring-1 ring-[var(--color-rule)]"
      loading="lazy"
    />
  )
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
      <ChevronLeft aria-hidden="true" size={16} />
      {children}
    </a>
  )
}

export function PageTitle({ kicker, title, children, color }: { kicker?: string; title: ReactNode; children?: ReactNode; color?: string }) {
  return (
    <header className="mb-8">
      {kicker && <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">{kicker}</p>}
      <h1 className="headword mt-1 text-4xl sm:text-6xl" style={color ? { color } : undefined}>{title}</h1>
      {children && <div className="mt-3 max-w-prose text-lg">{children}</div>}
    </header>
  )
}

export function WordChip({ word }: { word: string }) {
  return (
    <a href={`#/w/${encodeURIComponent(word)}`} className="inline-block rounded-full border border-[var(--color-rule)] px-3 py-1 hover:border-[var(--color-brand)]">
      {word}
    </a>
  )
}

/** A long list of words, shown a page at a time. */
export function WordList({ words, page = 120 }: { words: string[]; page?: number }) {
  const [shown, setShown] = useState(page)
  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {words.slice(0, shown).map((w) => (
          <li key={w}><WordChip word={w} /></li>
        ))}
      </ul>
      {shown < words.length && (
        <button type="button" onClick={() => setShown((n) => n + page * 2)} className="mt-6 rounded-full border border-[var(--color-rule)] px-4 py-2 hover:border-[var(--color-brand)]">
          Show more ({(words.length - shown).toLocaleString()} left)
        </button>
      )}
    </div>
  )
}

export function Loading() {
  return <p className="text-[var(--color-muted)]">Loading…</p>
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">{children}</h2>
}
