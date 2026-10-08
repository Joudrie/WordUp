import { test } from 'node:test'
import assert from 'node:assert/strict'
import { WORDS } from './words.ts'

test('every entry has a hook, a chain and at least one source', () => {
  for (const w of WORDS) {
    assert.ok(w.hook.length > 0, `${w.word} needs a hook`)
    assert.ok(w.chain.length > 0, `${w.word} needs a chain`)
    assert.ok(w.sources.length > 0, `${w.word} needs a source`)
  }
})

test('the chain ends at the modern English spelling', () => {
  for (const w of WORDS) {
    assert.equal(w.chain.at(-1)?.form, w.word, `${w.word} chain should end in its own spelling`)
  }
})

test('reconstructed forms are marked as such', () => {
  for (const w of WORDS) {
    for (const step of w.chain) {
      if (step.reconstructed) assert.ok(step.gloss, `${w.word}: a reconstructed form should explain its meaning`)
    }
  }
})

test('a myth is never presented as a confident known origin', () => {
  for (const w of WORDS.filter((x) => x.myth)) {
    assert.notEqual(w.confidence, 'known', `${w.word} is flagged as a myth so it cannot be "known"`)
  }
})
