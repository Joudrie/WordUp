import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const KEY = 'wordup-theme'

/** Light by default. Dark only for people who ask for it; the choice is remembered. */
export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark')
  function toggle() {
    const next = !dark
    setDark(next)
    if (next) document.documentElement.dataset.theme = 'dark'
    else delete document.documentElement.dataset.theme
    try {
      if (next) localStorage.setItem(KEY, 'dark')
      else localStorage.removeItem(KEY)
    } catch {
      // Storage blocked: the switch still works for this visit.
    }
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className="rounded-full p-2 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
    >
      {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  )
}
