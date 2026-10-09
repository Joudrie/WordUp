import type { ComponentType } from 'react'
import { BookOpen, FlaskConical, Globe, Lightbulb, MessageCircle, Puzzle, ScrollText, Shapes, Sprout, Type } from 'lucide-react'
import { PageTitle } from './ui.tsx'

interface Place {
  href: string
  title: string
  text: string
  example: string
  Icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>
}

export const PLACES: Place[] = [
  { href: '#/origins', title: 'Where words come from', text: 'Greek, French, Norse, Arabic, Native American and 16 more.', example: 'chocolate, moose, raccoon: Native American', Icon: Globe },
  { href: '#/roots', title: 'Roots', text: 'One ancient root, every word it grew into.', example: 'bʰer- to carry: bear, burden, transfer, metaphor', Icon: Sprout },
  { href: '#/affixes', title: 'Prefixes and suffixes', text: 'The building blocks, with what each one means.', example: '-pter wing: helicopter, pterodactyl', Icon: Type },
  { href: '#/patterns', title: 'Spelling patterns', text: 'What ch, ph, eau and -tion give away about a word.', example: 'ch says k in Greek words, sh in French ones', Icon: Shapes },
  { href: '#/slang', title: 'Slang and internet words', text: 'Rizz, skibidi, ragebait, and where they came from.', example: 'rizz is short for charisma', Icon: MessageCircle },
  { href: '#/lab', title: 'Sentence lab', text: 'Paste any sentence and see where every word comes from.', example: 'try a sentence that is mostly French', Icon: FlaskConical },
  { href: '#/old-english', title: 'Old English to modern', text: 'The same text a thousand years apart, side by side.', example: 'Fæder ūre þū þe eart on heofonum', Icon: ScrollText },
  { href: '#/stories', title: 'Word stories', text: 'Real histories, and the myths that are not true.', example: 'OK started as a joke in 1839', Icon: Lightbulb },
  { href: '#/play', title: 'Daily word game', text: 'Guess the word. We never tell you how long it is.', example: 'hints teach you the roots', Icon: Puzzle },
]

export function ExploreList({ places = PLACES }: { places?: Place[] }) {
  return (
    <ul className="divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)]">
      {places.map(({ href, title, text, example, Icon }) => (
        <li key={href}>
          <a href={href} className="group flex items-start gap-4 py-4">
            <span className="mt-1 text-[var(--color-brand)]"><Icon size={22} aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-medium group-hover:underline">{title}</span>
              <span className="block text-[var(--color-muted)]">{text}</span>
              <span className="headword mt-1 block text-sm italic text-[var(--color-muted)]">{example}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

export function ExplorePage() {
  return (
    <section>
      <PageTitle kicker="Explore" title="Every way into a word">
        Pick a door. Every page leads somewhere else.
      </PageTitle>
      <ExploreList />
      <p className="mt-6 flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <BookOpen size={16} aria-hidden /> Built from Wiktionary, with the most-looked-up words checked by hand.
      </p>
    </section>
  )
}
