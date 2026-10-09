import { useState, type ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'

const BASE = import.meta.env.BASE_URL

/** A small national flag as a sticker: thick black border. Only used where a language maps
 *  to one modern country. */
export function Flag({ code, title, size = 'sm' }: { code: string; title?: string; size?: 'sm' | 'lg' }) {
  const box = size === 'lg' ? 'h-6 w-9 rounded-md border-[2.5px]' : 'h-4 w-6 rounded-[4px] border-2'
  return (
    <img
      src={`${BASE}flags/${code}.svg`}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      className={`inline-block shrink-0 border-[#16161d] object-cover ${box}`}
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
    <header className="mb-5">
      {kicker && <p className="text-sm font-semibold text-[var(--color-muted)]">{kicker}</p>}
      <h1 className="headword text-2xl leading-tight sm:text-3xl" style={color ? { color } : undefined}>{title}</h1>
      {children && <div className="mt-2 max-w-prose text-base">{children}</div>}
    </header>
  )
}

export function WordChip({ word }: { word: string }) {
  return (
    <a href={`#/w/${encodeURIComponent(word)}`} className="inline-block rounded-full border-2 border-[var(--color-ink)] px-3 py-1 font-semibold hover:bg-[var(--sticker-yellow)] hover:text-[#16161d]">
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
        <button type="button" onClick={() => setShown((n) => n + page * 2)} className="sticker bg-yellow mt-6 px-4 py-2 font-bold">
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
  return <h2 className="text-base font-extrabold">{children}</h2>
}
