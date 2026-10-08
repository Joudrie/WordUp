// Mirrors scripts/lib/words-core.mjs: one data file per first letter.
export function shardOf(word: string): string {
  return /^[a-z]$/.test(word[0] ?? '') ? word[0] : 'other'
}
