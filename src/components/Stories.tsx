import stories from '../../content/stories.json'
import { BackLink, PageTitle, WordChip } from './ui.tsx'

export interface Story {
  id: string
  title: string
  words: string[]
  body: string
}
export const STORIES = stories as Story[]

export function StoriesPage() {
  return (
    <section>
      <PageTitle kicker="Explore" title="Word stories">
        The real histories behind words, including the popular ones that are not true.
      </PageTitle>
      <ul className="divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
        {STORIES.map((s) => (
          <li key={s.id}>
            <a href={`#/stories/${s.id}`} className="group block py-4">
              <span className="headword block text-xl group-hover:underline">{s.title}</span>
              <span className="mt-1 block text-[var(--color-muted)]">{s.body.split('. ')[0]}.</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function StoryPage({ id }: { id: string }) {
  const s = STORIES.find((x) => x.id === id)
  if (!s) return <p>No such story. <a className="underline" href="#/stories">See all stories</a>.</p>
  return (
    <article>
      <BackLink href="#/stories">All stories</BackLink>
      <PageTitle title={s.title} />
      <p className="max-w-prose text-lg leading-relaxed">{s.body}</p>
      <ul className="mt-8 flex flex-wrap gap-2">
        {s.words.map((w) => <li key={w}><WordChip word={w} /></li>)}
      </ul>
    </article>
  )
}
