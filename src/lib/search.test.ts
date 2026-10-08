import { test } from 'node:test'
import assert from 'node:assert/strict'
import { liveSearch, normalizeQuery, prefixMatches } from './search.ts'

const words = ['fork', 'for', 'forest', 'form', 'bear', 'beef', 'algorithm']
const index = {
  sorted: [...words].sort((a, b) => a.length - b.length || a.localeCompare(b)),
  set: new Set(words),
  license: 'test',
}

test('normalizeQuery lowercases and strips stray characters', () => {
  assert.equal(normalizeQuery('  Fork! '), 'fork')
  assert.equal(normalizeQuery('12'), '')
})

test('empty input shows nothing', () => {
  assert.deepEqual(liveSearch(index, '   '), { kind: 'empty' })
})

test('a letter with no complete word shows a guess, not a card', () => {
  assert.equal(liveSearch(index, 'x').kind, 'guess')
})

test('"fo" has no complete word and the best guess is the shortest match', () => {
  const view = liveSearch(index, 'fo')
  assert.equal(view.kind, 'guess')
  if (view.kind !== 'guess') return
  assert.equal(view.guess, 'for')
  assert.ok(view.underneath.includes('fork'))
})

test('a complete word is exact and lists longer words underneath', () => {
  const view = liveSearch(index, 'for')
  assert.equal(view.kind, 'exact')
  if (view.kind !== 'exact') return
  assert.ok(view.underneath.includes('forest'))
  assert.ok(!view.underneath.includes('for'))
})

test('prefix matches respect the limit', () => {
  assert.equal(prefixMatches(index, 'f', 2).length, 2)
})
