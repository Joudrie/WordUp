import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Word } from './types.ts'
import { letterOf, shardOf } from '../lib/shard.ts'

// Checks the generated data in public/data (see scripts/build-words.mjs).
const DATA = join(process.cwd(), 'public', 'data')
const meta = JSON.parse(readFileSync(join(DATA, 'index.json'), 'utf8')) as { count: number; letters: string[] }
const indexed: string[] = meta.letters.flatMap((l) => JSON.parse(readFileSync(join(DATA, 'i', `${l}.json`), 'utf8')) as string[])

const all: Word[] = []
const shardOfWord = new Map<string, string>()
for (const f of readdirSync(join(DATA, 'w'))) {
  const bucket = JSON.parse(readFileSync(join(DATA, 'w', f), 'utf8')) as Record<string, Word[]>
  for (const [word, entries] of Object.entries(bucket)) {
    shardOfWord.set(word, f.replace(/\.json$/, ''))
    all.push(...entries)
  }
}

test('the search index lists exactly the headwords that have entries, once each', () => {
  assert.equal(new Set(indexed).size, indexed.length)
  assert.equal(indexed.length, meta.count)
  assert.equal(shardOfWord.size, meta.count)
  for (const w of indexed) assert.ok(shardOfWord.has(w), `${w} is indexed but has no entry`)
})

test('every headword sits in the shard and letter file the app will look in', () => {
  for (const [word, shard] of shardOfWord) assert.equal(shard, shardOf(word), word)
  for (const l of meta.letters) {
    const words = JSON.parse(readFileSync(join(DATA, 'i', `${l}.json`), 'utf8')) as string[]
    for (const w of words) assert.equal(letterOf(w), l, w)
  }
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

test('first-use dates are plausible years', () => {
  const thisYear = new Date().getFullYear()
  for (const w of all) {
    if (!w.firstUse) continue
    assert.ok(w.firstUse.year >= 100 && w.firstUse.year <= thisYear, `${w.word}: ${w.firstUse.year}`)
  }
})

test('relatives only point at words we actually have', () => {
  for (const w of all) {
    for (const r of w.relatives) assert.ok(shardOfWord.has(r.word), `${w.word} links to missing ${r.word}`)
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
