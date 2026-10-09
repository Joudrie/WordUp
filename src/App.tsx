import { useEffect, useState, type ComponentType } from 'react'
import { Compass, Globe, Puzzle, Search } from 'lucide-react'
import { WordPage } from './components/WordPage.tsx'
import { OriginsPage, SectionPage } from './components/Origins.tsx'
import { Home } from './components/Home.tsx'
import { ExplorePage } from './components/Explore.tsx'
import { PatternPage, PatternsPage } from './components/Patterns.tsx'
import { AffixPage, AffixesPage, RootPage, RootsPage } from './components/Roots.tsx'
import { SlangPage } from './components/Slang.tsx'
import { LabPage } from './components/Lab.tsx'
import { OldEnglishPage } from './components/OldEnglish.tsx'
import { StoriesPage, StoryPage } from './components/Stories.tsx'
import { PlayPage } from './components/Play.tsx'

// Hash routes keep the app working on any static host with no server rules.
function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

const TABS: { href: string; label: string; Icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>; match: RegExp }[] = [
  { href: '#/', label: 'Search', Icon: Search, match: /^(#\/?)?$|^#\/w\// },
  { href: '#/explore', label: 'Explore', Icon: Compass, match: /^#\/(explore|roots|affixes|patterns|slang|lab|old-english|stories)/ },
  { href: '#/play', label: 'Play', Icon: Puzzle, match: /^#\/play/ },
  { href: '#/origins', label: 'Origins', Icon: Globe, match: /^#\/origins/ },
]

function route(hash: string, query: string, setQuery: (q: string) => void) {
  const m = (re: RegExp) => re.exec(hash)
  let r
  if ((r = m(/^#\/w\/([^/]+)(?:\/(\d+))?$/))) return <WordPage word={decodeURIComponent(r[1])} sense={r[2] ? Number(r[2]) : null} />
  if (hash === '#/origins') return <OriginsPage />
  if ((r = m(/^#\/origins\/([a-z-]+)$/))) return <SectionPage id={r[1]} />
  if (hash === '#/explore') return <ExplorePage />
  if (hash === '#/patterns') return <PatternsPage />
  if ((r = m(/^#\/patterns\/([a-z-]+)$/))) return <PatternPage id={r[1]} />
  if (hash === '#/roots') return <RootsPage />
  if ((r = m(/^#\/roots\/(\d+)$/))) return <RootPage id={r[1]} />
  if (hash === '#/affixes') return <AffixesPage />
  if ((r = m(/^#\/affixes\/(\d+)$/))) return <AffixPage id={r[1]} />
  if (hash === '#/slang') return <SlangPage />
  if (hash === '#/lab') return <LabPage />
  if (hash === '#/old-english') return <OldEnglishPage />
  if (hash === '#/stories') return <StoriesPage />
  if ((r = m(/^#\/stories\/([a-z-]+)$/))) return <StoryPage id={r[1]} />
  if (hash === '#/play') return <PlayPage />
  return <Home query={query} onQuery={setQuery} />
}

export default function App() {
  const hash = useHash()
  const [query, setQuery] = useState('')

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-28 pt-6 sm:pb-10 sm:pt-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <a href="#/" className="headword text-2xl text-[var(--color-brand)]">WordUp</a>
        <nav aria-label="Main" className="hidden gap-6 sm:flex">
          {TABS.map(({ href, label, match }) => (
            <a key={href} href={href} aria-current={match.test(hash) ? 'page' : undefined}
              className={`text-sm ${match.test(hash) ? 'font-semibold text-[var(--color-ink)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main>{route(hash, query, setQuery)}</main>

      <footer className="mt-16 space-y-2 border-t border-[var(--color-rule)] pt-4 text-sm text-[var(--color-muted)]">
        <p>
          Every origin has a confidence label. Found a mistake?{' '}
          <a className="underline" href="mailto:sjoudrie@gmail.com?subject=WordUp%20correction">Suggest a correction</a>.
        </p>
        <p>
          Word data from <a className="underline" href="https://en.wiktionary.org/">Wiktionary</a>, licensed under{' '}
          <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.
        </p>
      </footer>

      <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--color-rule)] bg-[var(--color-page)] sm:hidden">
        <ul className="mx-auto flex max-w-3xl justify-around">
          {TABS.map(({ href, label, Icon, match }) => {
            const active = match.test(hash)
            return (
              <li key={href}>
                <a href={href} aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 px-4 py-2 text-xs ${active ? 'text-[var(--color-brand)]' : 'text-[var(--color-muted)]'}`}>
                  <Icon size={22} aria-hidden />
                  {label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
