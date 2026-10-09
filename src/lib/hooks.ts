import { useEffect, useState } from 'react'
import type { Word } from '../data/types.ts'
import { loadEntries, loadLetter, type WordIndex } from './data.ts'

/** The search index for one first letter; null while it loads. */
export function useLetterIndex(letter: string | null): WordIndex | null {
  const [state, setState] = useState<{ letter: string; index: WordIndex } | null>(null)
  useEffect(() => {
    if (!letter) return
    let live = true
    loadLetter(letter).then((index) => live && setState({ letter, index }))
    return () => {
      live = false
    }
  }, [letter])
  if (!letter || !state || state.letter !== letter) return null
  return state.index
}

/** All senses of a headword; null while they load. */
export function useEntries(word: string | null): { entries: Word[] | null } {
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
