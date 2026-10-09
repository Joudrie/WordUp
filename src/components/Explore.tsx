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
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="headword text-2xl sm:text-3xl">Explore</h1>
        <span className="text-sm font-semibold">9 places to dig</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <a href="#/origins" className="sticker bg-blue col-span-2 flex flex-col gap-2 p-4">
          <span className="headword text-2xl leading-none">Where words come from</span>
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            {['--sticker-yellow', '--sticker-coral', '--sticker-green', '--sticker-pink'].map((c) => (
              <span key={c} className="h-3.5 w-3.5 rounded-full border-2 border-[#16161d]" style={{ background: `var(${c})` }} />
            ))}
            <span className="ml-1">21 languages and families</span>
          </span>
        </a>
        <a href="#/roots" className="sticker bg-green row-span-2 flex flex-col gap-1 p-3.5">
          <span className="text-sm font-semibold">Roots</span>
          <span className="headword text-3xl leading-none">*bʰer-</span>
          <span className="text-sm">to carry</span>
          <span className="mt-auto text-sm leading-snug">born · offer · prefer · birth · fortune · transfer</span>
          <span className="headword text-base">One root, hundreds of words</span>
        </a>
        <a href="#/affixes" className="sticker bg-yellow flex flex-col gap-0.5 p-3">
          <span className="text-sm font-semibold">Prefixes &amp; suffixes</span>
          <span className="headword text-2xl leading-tight">-pter</span>
          <span className="text-sm">wing, as in helicopter</span>
        </a>
        <a href="#/patterns" className="sticker bg-pink flex flex-col gap-0.5 p-3">
          <span className="text-sm font-semibold">Spelling patterns</span>
          <span className="headword text-2xl leading-tight">ph = Greek</span>
          <span className="text-sm">phone, photo, alphabet</span>
        </a>
        <a href="#/slang" className="sticker bg-coral flex flex-col gap-0.5 p-3">
          <span className="text-sm font-semibold">Slang</span>
          <span className="headword text-xl leading-tight">rizz, skibidi, ragebait</span>
        </a>
        <a href="#/old-english" className="sticker bg-purple flex flex-col gap-0.5 p-3">
          <span className="text-sm font-semibold">Old English</span>
          <span className="headword text-lg leading-tight">Fæder ūre þū þe eart</span>
        </a>
        <a href="#/lab" className="sticker col-span-2 flex flex-col gap-1 bg-[var(--color-card)] p-3.5">
          <span className="text-sm font-semibold">Sentence lab</span>
          <span className="headword text-lg leading-snug">
            The <mark className="rounded bg-[#e9deff] px-1 text-[#16161d]">elegant</mark>{' '}
            <mark className="rounded bg-[#e9deff] px-1 text-[#16161d]">chef</mark> served a{' '}
            <mark className="rounded bg-[#e9deff] px-1 text-[#16161d]">dessert</mark> to the{' '}
            <mark className="rounded bg-[#cdede4] px-1 text-[#16161d]">guests</mark>
          </span>
        </a>
        <a href="#/stories" className="sticker col-span-2 flex items-center justify-between bg-[#16161d] p-3.5 text-white">
          <span className="headword text-lg">Word stories</span>
          <span className="text-sm">OK started as a joke →</span>
        </a>
        <a href="#/play" className="sticker col-span-2 flex items-center justify-between bg-yellow p-3.5">
          <span className="headword text-lg">Daily word game</span>
          <span className="text-sm font-semibold">No length given →</span>
        </a>
      </div>
    </section>
  )
}
