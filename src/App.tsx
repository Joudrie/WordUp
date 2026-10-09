import { useEffect, useState } from 'react'
import { WordPage } from './components/WordPage.tsx'
import { Home } from './components/Home.tsx'

// Hash routes keep the app working on any static host with no server rules:
//   #/              search
//   #/w/<word>      the word page (first sense)
//   #/w/<word>/<n>  a specific sense of a homograph
function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

export default function App() {
  const hash = useHash()
  const [query, setQuery] = useState('')

  const match = /^#\/w\/([^/]+)(?:\/(\d+))?$/.exec(hash)

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:py-10">
      <header className="mb-8 flex items-baseline justify-between">
        <a href="#/" className="headword text-2xl text-[var(--color-brand)]">WordUp</a>
        <span className="text-sm text-[var(--color-muted)]">Working name</span>
      </header>

      {match ? (
        <WordPage word={decodeURIComponent(match[1])} sense={match[2] ? Number(match[2]) : null} />
      ) : (
        <Home query={query} onQuery={setQuery} />
      )}

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
    </div>
  )
}
