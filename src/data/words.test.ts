import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Word } from './types.ts'

// Checks the generated data in public/data (see scripts/build-words.mjs).
const DATA = join(process.cwd(), 'public', 'data')
const index = JSON.parse(readFileSync(join(DATA, 'index.json'), 'utf8')) as { words: string[]; count: number }
const shards = readdirSync(join(DATA, 'w')).map((f) => JSON.parse(readFileSync(join(DATA, 'w', f), 'utf8')) as Record<string, Word[]>)
const all: Word[] = shards.flatMap((bucket) => Object.values(bucket).flat())

test('the index lists exactly the headwords that have entries', () => {
  const inShards = new Set(all.map((w) => w.word))
  assert.equal(index.count, index.words.length)
  assert.equal(new Set(index.words).size, index.words.length)
  for (const w of index.words) assert.ok(inShards.has(w), `${w} is indexed but has no entry`)
})

test('every entry has a sense, a hook, a chain and a source', () => {
  for (const w of all) {
    assert.ok(w.sense.length > 0, `${w.word} needs a sense`)
    assert.ok(w.hook.length > 0, `${w.word} needs a hook`)
    assert.ok(w.chain.length > 0, `${w.word} needs a chain`)
    assert.ok(w.sources.length > 0, `${w.word} needs a source`)
  }
})

test('every chain ends at the English spelling', () => {
  for (const w of all) {
    assert.equal(w.chain.at(-1)?.form, w.word, `${w.word} chain should end in its own spelling`)
  }
})

test('a reconstructed stage has no leftover asterisk in its form', () => {
  for (const w of all) {
    for (const step of w.chain) {
      if (step.reconstructed) assert.ok(!step.form.startsWith('*'), `${w.word}: ${step.form}`)
    }
  }
})

test('relatives only point at words we actually have', () => {
  const have = new Set(index.words)
  for (const w of all) {
    for (const r of w.relatives) assert.ok(have.has(r.word), `${w.word} links to missing ${r.word}`)
  }
})

test('generated entries are marked as drafts; hand-checked entries are not', () => {
  for (const w of all) {
    assert.ok(w.draft === true || w.draft === undefined, `${w.word} has an unexpected draft flag`)
  }
  const curated = JSON.parse(readFileSync(join(process.cwd(), 'content', 'curated-words.json'), 'utf8')) as { word: string }[]
  for (const c of curated) {
    const reviewed = all.filter((w) => w.word === c.word)
    assert.ok(reviewed.length > 0, `${c.word} is curated but missing from the data`)
    for (const w of reviewed) assert.notEqual(w.draft, true, `${c.word} is curated and must not be a draft`)
  }
})
