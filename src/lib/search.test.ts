import { test } from 'node:test'
import assert from 'node:assert/strict'
import { WORDS } from '../data/words.ts'
import { buildIndex, liveSearch, normalizeQuery, prefixMatches } from './search.ts'

const index = buildIndex(WORDS)

test('normalizeQuery lowercases and strips stray characters', () => {
  assert.equal(normalizeQuery('  Fork! '), 'fork')
  assert.equal(normalizeQuery('12'), '')
})

test('empty input shows nothing', () => {
  assert.deepEqual(liveSearch(index, '   '), { kind: 'empty' })
})

test('a letter with no complete word shows a guess, not a card', () => {
  const view = liveSearch(index, 'f')
  assert.equal(view.kind, 'guess')
})

test('"fo" has no complete word and the best guess is the shortest match', () => {
  const view = liveSearch(index, 'fo')
  assert.equal(view.kind, 'guess')
  if (view.kind !== 'guess') return
  assert.equal(view.guess, 'fork')
  assert.ok(view.underneath.includes('fork'))
})

test('a complete word shows its entries and lookalike links underneath', () => {
  const view = liveSearch(index, 'fork')
  assert.equal(view.kind, 'exact')
  if (view.kind !== 'exact') return
  assert.equal(view.entries.length, 1)
  assert.equal(view.entries[0].word, 'fork')
})

test('homographs come back together so the card can show a picker', () => {
  const view = liveSearch(index, 'bear')
  assert.equal(view.kind, 'exact')
  if (view.kind !== 'exact') return
  assert.equal(view.entries.length, 2)
  const senses = view.entries.map((e) => e.sense).sort()
  assert.deepEqual(senses, ['the animal', 'to carry'])
})

test('prefix matches exclude the typed word and respect the limit', () => {
  assert.deepEqual(prefixMatches(index, 'bear'), [])
  assert.equal(prefixMatches(index, 'b', 2).length, 2)
})
