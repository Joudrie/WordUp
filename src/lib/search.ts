import type { WordIndex } from './data.ts'

export type LiveView =
  | { kind: 'empty' }
  // The letters typed so far spell a complete word. Its entries load separately.
  | { kind: 'exact'; letters: string; underneath: string[] }
  // Nothing complete yet: show the best guess and the words it could become.
  | { kind: 'guess'; letters: string; guess: string | null; underneath: string[] }

export function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z'-]/g, '')
}

/** Every headword starting with `prefix`, excluding `prefix` itself. */
export function prefixMatches(index: WordIndex, prefix: string, limit = 8): string[] {
  if (!prefix) return []
  const out: string[] = []
  for (const w of index.sorted) {
    if (w !== prefix && w.startsWith(prefix)) {
      out.push(w)
      if (out.length === limit) break
    }
  }
  return out
}

/** The view for the current keystrokes. Recomputed on every change. */
export function liveSearch(index: WordIndex, raw: string): LiveView {
  const letters = normalizeQuery(raw)
  if (!letters) return { kind: 'empty' }

  const underneath = prefixMatches(index, letters)
  if (index.set.has(letters)) return { kind: 'exact', letters, underneath }

  return { kind: 'guess', letters, guess: underneath[0] ?? null, underneath }
}
