// Mirrors scripts/lib/words-core.mjs.

/** Data shard for a headword: its first two letters ("fo"), or "f_" for one-letter words. */
export function shardOf(word: string): string {
  if (/^[a-z]{2}/.test(word)) return word.slice(0, 2)
  if (/^[a-z]/.test(word)) return `${word[0]}_`
  return 'other'
}

/** Search-index file for a headword: its first letter. */
export function letterOf(word: string): string {
  return /^[a-z]/.test(word) ? word[0] : 'other'
}
