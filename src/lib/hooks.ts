import { useEffect, useState } from 'react'
import type { Word } from '../data/types.ts'
import { loadEntries, loadIndex, type WordIndex } from './data.ts'

export function useIndex(): WordIndex | null {
  const [index, setIndex] = useState<WordIndex | null>(null)
  useEffect(() => {
    let live = true
    loadIndex().then((i) => live && setIndex(i)).catch(() => live && setIndex(null))
    return () => {
      live = false
    }
  }, [])
  return index
}

export interface Entries {
  /** null while loading. */
  entries: Word[] | null
}

export function useEntries(word: string | null): Entries {
  const [state, setState] = useState<{ word: string; entries: Word[] } | null>(null)
  useEffect(() => {
    if (!word) return
    let live = true
    loadEntries(word).then((entries) => live && setState({ word, entries }))
    return () => {
      live = false
    }
  }, [word])
  if (!word || !state || state.word !== word) return { entries: null }
  return { entries: state.entries }
}
