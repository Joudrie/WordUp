import data from '../../content/old-english.json'
import { PageTitle, SectionHeading, WordChip } from './ui.tsx'

interface Text {
  id: string
  title: string
  intro: string
  columns: { label: string; date: string; source: string }[]
  lines: string[][]
  notes: { word: string; text: string }[]
}

const TEXTS = (data as { texts: Text[] }).texts

export function OldEnglishPage() {
  return (
    <section>
      <PageTitle kicker="Explore" title="A thousand years of English">
        Old English looks foreign at first. Read it next to later versions and the words start to surface.
      </PageTitle>
      <div className="space-y-16">
        {TEXTS.map((t) => (
          <article key={t.id}>
            <h2 className="headword text-3xl">{t.title}</h2>
            <p className="mt-2 max-w-prose text-[var(--color-muted)]">{t.intro}</p>

            <ol className="mt-6 space-y-5">
              {t.lines.map((line, i) => (
                <li key={i} className={`grid gap-1 border-l-2 border-[var(--color-rule)] pl-4 sm:gap-4 ${t.columns.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                  {line.map((text, c) => (
                    <p key={c} className={c === 0 ? 'headword text-lg' : ''}>
                      <span className="mr-2 text-xs uppercase tracking-wide text-[var(--color-muted)] sm:hidden">{t.columns[c].label}</span>
                      {text}
                    </p>
                  ))}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              {t.columns.map((c) => `${c.label}: ${c.source} (${c.date})`).join(' · ')}
            </p>

            <div className="mt-6">
              <SectionHeading>Look closer</SectionHeading>
              <ul className="mt-3 space-y-3">
                {t.notes.map((n) => (
                  <li key={n.word} className="flex gap-3">
                    <WordChip word={n.word} />
                    <span>{n.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
