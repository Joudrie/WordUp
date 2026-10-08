// Builds WordUp's word data from the kaikki.org English Wiktionary dump.
//
//   node --max-old-space-size=8192 scripts/build-words.mjs \
//     --dump English.jsonl --dump Latin.jsonl --dump OldEnglish.jsonl ... \
//     --freq en_50k.txt --count 20000 --out public/data
//
// The English dump supplies the headwords. The other-language dumps supply the
// ancestor stages (Latin furca, Old English forca, ...) that the chains walk through.
//
// Output: <out>/index.json (every headword, sorted) and <out>/w/<letter>.json
// (the Word entries for that letter, keyed by headword).
// Data is derived from Wiktionary and is licensed CC BY-SA 4.0.
import { createReadStream, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { parseArgs } from 'node:util'
import {
  ancestorOf, compactRecord, confidenceOf, draftHook, isFormOnly, keyOf, resolveChain, shardOf, sourceLinks,
} from './lib/words-core.mjs'

const { values } = parseArgs({
  options: {
    dump: { type: 'string', multiple: true },
    freq: { type: 'string' },
    count: { type: 'string', default: '20000' },
    out: { type: 'string', default: 'public/data' },
  },
})
if (!values.dump?.length || !values.freq) {
  console.error('usage: build-words.mjs --dump <jsonl> --freq <wordlist> [--count N] [--out dir]')
  process.exit(1)
}

// 1. Target headwords: the most frequent plain-letter words in the list.
const targets = new Set()
for (const line of readFileSync(values.freq, 'utf8').split('\n')) {
  const word = line.trim().split(/\s+/)[0]?.toLowerCase()
  if (!word || !/^[a-z]+$/.test(word)) continue
  if (word.length < 2 && word !== 'a' && word !== 'i') continue
  targets.add(word)
  if (targets.size >= Number(values.count)) break
}
console.log(`targets: ${targets.size}`)

// 2. One pass over the dump. Keep English sections for targets and a compact
//    record of every non-English entry (the ancestors we may need to walk).
const englishSections = new Map() // word -> raw English sections
const ancestors = new Map() // "lang:term" -> compact record
let lines = 0
for (const file of values.dump) {
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity })
  let fileLines = 0
  for await (const line of rl) {
    if (!line) continue
    fileLines++
    const raw = JSON.parse(line)
    if (raw.lang_code === 'en') {
      if (!targets.has(raw.word)) continue
      const list = englishSections.get(raw.word) ?? []
      list.push(raw)
      englishSections.set(raw.word, list)
      continue
    }
    const key = keyOf(raw.lang_code, raw.word)
    const existing = ancestors.get(key)
    const record = compactRecord(raw)
    // Keep the first entry, but let a later one fill in a missing ancestor.
    if (!existing || (!existing.ancestor && record.ancestor)) ancestors.set(key, record)
  }
  lines += fileLines
  console.log(`read ${file}: ${fileLines} lines`)
}
console.log(`lines: ${lines}, English targets found: ${englishSections.size}, ancestors: ${ancestors.size}`)

// 3. Group sections into Word entries. Homographs are separate etymology sections.
const lookup = (key) => ancestors.get(key)
const parentIndex = new Map() // immediate ancestor key -> headwords that share it
let built = []

for (const [word, sections] of englishSections) {
  // Drop form-only senses when a real sense exists for the same spelling.
  const real = sections.filter((s) => !isFormOnly(s))
  const byNumber = new Map()
  for (const s of real.length ? real : sections) {
    const n = s.etymology_number ?? '1'
    const group = byNumber.get(n) ?? []
    group.push(s)
    byNumber.set(n, group)
  }
  for (const [, group] of [...byNumber].sort((a, b) => a[0].localeCompare(b[0]))) {
    const first = group[0]
    const ancestor = ancestorOf(first.etymology_templates)
    const chain = ancestor
      ? resolveChain(word, ancestor, lookup)
      : [{ family: 'other', language: 'Modern English', form: word }]
    const gloss = (first.senses?.[0]?.glosses?.[0] ?? '').trim()
    const sense = gloss ? `${first.pos}: ${gloss.length > 60 ? `${gloss.slice(0, 57).trimEnd()}…` : gloss}` : first.pos
    if (ancestor) {
      const pk = keyOf(ancestor.lang, ancestor.term)
      const set = parentIndex.get(pk) ?? new Set()
      set.add(word)
      parentIndex.set(pk, set)
    }
    built.push({
      word,
      sense,
      hook: draftHook(chain),
      draft: true,
      chain,
      confidence: confidenceOf(first.etymology_text, chain.length > 1),
      firstUse: null,
      relatives: [],
      sources: sourceLinks(word),
      _parent: ancestor ? keyOf(ancestor.lang, ancestor.term) : null,
    })
  }
}

// 3b. Hand-checked entries (content/curated-words.json) replace the generated drafts
//     for the same headword. They are not marked as drafts.
const curated = JSON.parse(readFileSync('content/curated-words.json', 'utf8'))
const curatedWords = new Set(curated.map((w) => w.word))
built = [
  ...built.filter((w) => !curatedWords.has(w.word)),
  ...curated.map((w) => ({ ...w, draft: undefined, _parent: null })),
]
console.log(`curated entries applied: ${curated.length}`)

// 4. Relatives: other headwords in the set that share the same immediate ancestor.
for (const w of built) {
  if (w._parent) {
    const others = [...(parentIndex.get(w._parent) ?? [])].filter((x) => x !== w.word).slice(0, 6)
    w.relatives = others.map((x) => ({ word: x }))
  }
  delete w._parent
}

// 4b. Relatives must point at words we publish. Drop the rest.
const present = new Set(built.map((w) => w.word))
for (const w of built) w.relatives = w.relatives.filter((r) => present.has(r.word))

// 5. Write shards and the index.
const byShard = new Map()
for (const w of built) {
  const s = shardOf(w.word)
  const bucket = byShard.get(s) ?? {}
  bucket[w.word] = [...(bucket[w.word] ?? []), w]
  byShard.set(s, bucket)
}
mkdirSync(`${values.out}/w`, { recursive: true })
for (const [shard, bucket] of byShard) {
  writeFileSync(`${values.out}/w/${shard}.json`, JSON.stringify(bucket))
}
const words = [...new Set(built.map((w) => w.word))].sort()
writeFileSync(
  `${values.out}/index.json`,
  JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    license: 'Derived from Wiktionary, CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)',
    count: words.length,
    words,
  }),
)

const withChain = built.filter((w) => w.chain.length > 1).length
console.log(`wrote ${built.length} entries for ${words.length} headwords (${withChain} with an ancestor chain)`)
