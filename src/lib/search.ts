import type { Word } from '../data/types.ts'

export type LiveView =
  | { kind: 'empty' }
  // The letters typed so far spell one or more complete words (homographs).
  | { kind: 'exact'; letters: string; entries: Word[]; underneath: string[] }
  // Nothing complete yet: show the best guess and the words it could become.
  | { kind: 'guess'; letters: string; guess: string | null; underneath: string[] }

export function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z'-]/g, '')
}

export function buildIndex(words: Word[]) {
  const byWord = new Map<string, Word[]>()
  for (const w of words) {
    const list = byWord.get(w.word) ?? []
    list.push(w)
    byWord.set(w.word, list)
  }
  // Shorter words first, then alphabetical, so "fo" lists "for" before "forest".
  const sorted = [...byWord.keys()].sort((a, b) => a.length - b.length || a.localeCompare(b))
  return { byWord, sorted }
}

export type WordIndex = ReturnType<typeof buildIndex>

/** Every indexed word starting with `prefix`, excluding `prefix` itself. */
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

  const exact = index.byWord.get(letters)
  const underneath = prefixMatches(index, letters)
  if (exact) return { kind: 'exact', letters, entries: exact, underneath }

  return { kind: 'guess', letters, guess: underneath[0] ?? null, underneath }
}
