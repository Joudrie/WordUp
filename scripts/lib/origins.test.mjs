import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classify, groupOfLanguage, ORIGIN_GROUPS } from './origins.mjs'

const S = (language, form, reconstructed = false) => ({ family: 'other', language, form, ...(reconstructed ? { reconstructed } : {}) })
const ME = (w) => S('Modern English', w)

test('language names map to the sections readers expect', () => {
  assert.equal(groupOfLanguage('Old English'), 'english')
  assert.equal(groupOfLanguage('Medieval Latin'), 'latin')
  assert.equal(groupOfLanguage('Anglo-Norman'), 'french')
  assert.equal(groupOfLanguage('Ancient Greek'), 'greek')
  assert.equal(groupOfLanguage('Old Norse'), 'norse')
  assert.equal(groupOfLanguage('Middle Low German'), 'dutch-german')
  assert.equal(groupOfLanguage('Classical Nahuatl'), 'americas')
  assert.equal(groupOfLanguage('Mandarin'), 'chinese')
  assert.equal(groupOfLanguage('Sanskrit'), 'india')
  assert.equal(groupOfLanguage('Basque'), 'other')
  assert.equal(groupOfLanguage('Modern English'), null)
  assert.equal(groupOfLanguage('ja'), null)
})

test('philosophy: ultimately Greek, came in through French', () => {
  const r = classify([S('Ancient Greek', 'philosophía'), S('Old French', 'philosophie'), ME('philosophy')])
  assert.equal(r.origin, 'greek')
  assert.equal(r.via, 'french')
  assert.deepEqual(r.groups.sort(), ['french', 'greek'])
})

test('a native word is Old & Middle English, and reconstructed stages are skipped', () => {
  const r = classify([S('Proto-Germanic', 'beraną', true), S('Old English', 'beran'), ME('bear')])
  assert.deepEqual(r, { origin: 'english', via: 'english', groups: ['english'] })
})

test('fork: Latin, borrowed early into Old English', () => {
  const r = classify([S('Latin', 'furca'), S('Proto-West Germanic', 'furkō', true), S('Old English', 'forca'), ME('fork')])
  assert.equal(r.origin, 'latin')
  assert.equal(r.via, 'latin')
  assert.ok(!r.groups.includes('english'), 'a borrowed word is not listed as native English')
})

test('a word with no recorded history is unknown', () => {
  assert.deepEqual(classify([ME('posh')]), { origin: 'unknown', via: 'unknown', groups: [] })
})

test('group ids are unique', () => {
  assert.equal(new Set(ORIGIN_GROUPS.map((g) => g.id)).size, ORIGIN_GROUPS.length)
})
