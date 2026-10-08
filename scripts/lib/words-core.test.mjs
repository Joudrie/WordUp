import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ancestorOf, compactRecord, confidenceOf, draftHook, familyOf, resolveChain, shardOf,
} from './words-core.mjs'

// A small fixture graph shaped like kaikki records: fork <- forca <- furca.
const records = new Map([
  ['ang:forca', { lang: 'Old English', gloss: 'forked instrument', ancestor: { lang: 'la', term: 'furca', gloss: null } }],
  ['la:furca', { lang: 'Latin', gloss: 'pitchfork', ancestor: null }],
  ['gmw-pro:*furkō', { lang: 'Proto-West Germanic', gloss: 'fork', ancestor: { lang: 'la', term: 'furca', gloss: null } }],
])
const lookup = (key) => records.get(key)

test('familyOf maps known codes and falls back to other', () => {
  assert.equal(familyOf('la'), 'latin')
  assert.equal(familyOf('fro'), 'french')
  assert.equal(familyOf('ine-pro'), 'other')
})

test('ancestorOf takes the first inherited or borrowed link, skipping English', () => {
  const link = ancestorOf([
    { name: 'ety', args: { 2: ':inh', 3: 'enm:x' } },
    { name: 'inh', args: { 1: 'en', 2: 'enm', 3: 'ryver' } },
  ])
  assert.deepEqual(link, { lang: 'enm', term: 'ryver', gloss: null })
  assert.equal(ancestorOf([{ name: 'inh', args: { 1: 'en', 2: 'en', 3: 'x' } }]), null)
})

test('resolveChain walks up to the root and ends at the English spelling, earliest first', () => {
  const chain = resolveChain('fork', { lang: 'ang', term: 'forca', gloss: null }, lookup)
  assert.deepEqual(chain.map((s) => s.form), ['furca', 'forca', 'fork'])
  assert.equal(chain[0].family, 'latin')
  assert.equal(chain[1].language, 'Old English')
})

test('a reconstructed stage is marked and loses its asterisk in the form', () => {
  const chain = resolveChain('fork', { lang: 'gmw-pro', term: '*furkō', gloss: null }, lookup)
  const stage = chain.find((s) => s.form === 'furkō')
  assert.ok(stage)
  assert.equal(stage.reconstructed, true)
})

test('a cycle in the ancestor links stops instead of looping', () => {
  const cyclic = new Map([['la:a', { lang: 'Latin', ancestor: { lang: 'la', term: 'a', gloss: null } }]])
  const chain = resolveChain('x', { lang: 'la', term: 'a', gloss: null }, (k) => cyclic.get(k))
  assert.equal(chain.length, 2)
})

test('confidence follows Wiktionary hedges', () => {
  assert.equal(confidenceOf('From Latin furca.', true), 'known')
  assert.equal(confidenceOf('Possibly from Latin.', true), 'likely')
  assert.equal(confidenceOf('Of unknown origin.', true), 'unknown')
  assert.equal(confidenceOf('', false), 'unknown')
})

test('compactRecord keeps only what the chain walk needs', () => {
  const rec = compactRecord({
    lang: 'Latin',
    senses: [{ glosses: ['pitchfork'] }],
    etymology_templates: [{ name: 'inh', args: { 1: 'la', 2: 'ine-pro', 3: '*bʰer-' } }],
    etymology_text: 'long text we do not keep',
  })
  assert.deepEqual(Object.keys(rec).sort(), ['ancestor', 'gloss', 'lang'])
})

test('shardOf groups by first letter and sends the rest to other', () => {
  assert.equal(shardOf('fork'), 'f')
  assert.equal(shardOf('2nd'), 'other')
})

test('draftHook names the earliest stage, its gloss and the reconstruction mark', () => {
  const chain = resolveChain('fork', { lang: 'ang', term: 'forca', gloss: null }, lookup)
  assert.equal(draftHook(chain), 'From Latin furca, meaning "pitchfork".')
  assert.equal(draftHook([{ family: 'other', language: 'Modern English', form: 'posh' }]),
    'Wiktionary gives no earlier form for this sense.')
})

import { isFormOnly, languageNameFallback, normalizeTerm } from './words-core.mjs'

test('normalizeTerm ignores diacritics and the reconstruction asterisk', () => {
  assert.equal(normalizeTerm('*berō'), normalizeTerm('berô'))
  assert.equal(keyOfTest('gmw-pro', '*berô'), keyOfTest('gmw-pro', 'berō'))
})

function keyOfTest(lang, term) {
  return `${lang}:${normalizeTerm(term)}`
}

test('an alternative-form entry points at its target in the same language', () => {
  const rec = compactRecord({
    lang: 'Old English', lang_code: 'ang', senses: [{ glosses: ['alternative form of forca (found in compounds)'] }], etymology_templates: [],
  })
  assert.deepEqual(rec.ancestor, { lang: 'ang', term: 'forca', gloss: null })
  assert.equal(rec.gloss, undefined)
})

test('form-only senses are recognised', () => {
  assert.equal(isFormOnly({ senses: [{ glosses: ['Alternative spelling of bere'] }] }), true)
  assert.equal(isFormOnly({ senses: [{ glosses: ['A large mammal'] }] }), false)
})

test('a code with no loaded dump gets a readable language name', () => {
  assert.equal(languageNameFallback('itc-pro'), 'Proto-Italic')
  assert.equal(languageNameFallback('xyz'), 'xyz')
})
