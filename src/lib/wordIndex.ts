import { WORDS } from '../data/words.ts'
import { buildIndex } from './search.ts'

// Built once at startup and shared by search and word pages.
export const index = buildIndex(WORDS)
