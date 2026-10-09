// Builds WordUp's word data from the kaikki.org Wiktionary dumps.
//
//   node --max-old-space-size=12288 scripts/build-words.mjs \
//     --dump English.jsonl --dump Latin.jsonl --dump OldEnglish.jsonl ... \
//     --freq en_50k.txt --all --out public/data
//
// The English dump supplies the headwords. The other-language dumps supply the
// ancestor stages (Latin furca, Old English forca, ...) that the chains walk through.
// --all takes every plain English word; otherwise the top --count words by frequency.
//
// Output:
//   <out>/index.json         word count, license, build date
//   <out>/i/<letter>.json    every headword for a first letter, most common first
//   <out>/w/<two>.json       Word entries for headwords starting with those two letters
// Data is derived from Wiktionary and is licensed CC BY-SA 4.0.
import { createReadStream, readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { parseArgs } from 'node:util'
import {
  ancestorOf, ancestorsOf, baseOf, compactRecord, confidenceOf, draftHook, earliestQuote, isFormOnly, keyOf,
  affixGloss, cleanGloss, cleanTerm, labelsOf, learnLanguageName, letterOf, nameFromExpansion, partsHook,
  partsOf, resolveChain, rootsOf, shardOf,
} from './lib/words-core.mjs'
import { classify, ORIGIN_GROUPS } from './lib/origins.mjs'

const { values } = parseArgs({
  options: {
    dump: { type: 'string', multiple: true },
    freq: { type: 'string' },
    count: { type: 'string', default: '20000' },
    all: { type: 'boolean', default: false },
    out: { type: 'string', default: 'public/data' },
  },
})
if (!values.dump?.length || !values.freq) {
  console.error('usage: build-words.mjs --dump <jsonl>... --freq <wordlist> [--all | --count N] [--out dir]')
  process.exit(1)
}

const PLAIN = /^[a-z]+$/

// 1. Frequency ranks, used to order search suggestions and (without --all) to pick words.
const rank = new Map()
for (const line of readFileSync(values.freq, 'utf8').split('\n')) {
  const word = line.trim().split(/\s+/)[0]?.toLowerCase()
  if (!word || !PLAIN.test(word) || rank.has(word)) continue
  rank.set(word, rank.size)
}
const topN = Number(values.count)
const isTarget = values.all
  ? (word) => PLAIN.test(word)
  : (word) => (rank.get(word) ?? Infinity) < topN
console.log(values.all ? 'targets: every plain English word' : `targets: top ${topN} by frequency`)

// 2. One pass over the dumps. English sections are compacted as they are read so the
//    whole language fits in memory; other languages become ancestor records.
const sectionsByWord = new Map() // word -> compact English sections
const ancestors = new Map() // "lang:term" -> compact record
const affixInfo = new Map() // "-pter" -> { gloss, ancestor }
let lines = 0
for (const file of values.dump) {
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity })
  let fileLines = 0
  for await (const line of rl) {
    if (!line) continue
    fileLines++
    const raw = JSON.parse(line)
    if (raw.lang_code === 'en') {
      // Learn language names for codes whose dump we do not load ("nci" -> Classical Nahuatl).
      for (const t of raw.etymology_templates ?? []) {
        const code = t.args?.['2']
        if (code && code !== 'en' && t.expansion) learnLanguageName(code, nameFromExpansion(t.expansion, t.args?.['3']))
      }
      // Prefix and suffix entries ("helico-", "-pter") give each affix page its meaning.
      if (/^-?[a-z]+-?$/.test(raw.word) && raw.word.includes('-') && !affixInfo.has(raw.word)) {
        affixInfo.set(raw.word, { gloss: affixGloss(raw.senses?.[0]?.glosses?.[0]), ancestor: ancestorOf(raw.etymology_templates) })
      }
      if (!isTarget(raw.word)) continue
      const gloss = (raw.senses?.[0]?.glosses?.[0] ?? '').trim()
      const list = sectionsByWord.get(raw.word) ?? []
      list.push({
        pos: raw.pos,
        n: raw.etymology_number ?? '1',
        gloss,
        formOnly: isFormOnly(raw),
        links: ancestorsOf(raw.etymology_templates),
        parts: partsOf(raw.etymology_templates),
        hedge: confidenceOf(raw.etymology_text, true),
        quote: earliestQuote(raw),
        labels: labelsOf(raw),
        roots: rootsOf(raw.etymology_templates),
      })
      sectionsByWord.set(raw.word, list)
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
console.log(`lines: ${lines}, English headwords: ${sectionsByWord.size}, ancestors: ${ancestors.size}`)

// 3. Group sections into Word entries. Homographs are separate etymology sections.
const lookup = (key) => ancestors.get(key)
const parentIndex = new Map() // immediate ancestor key -> headwords that share it
const earliestByWord = new Map() // word -> earliest quotation across its sections
let built = []

const earlier = (a, b) => (!a ? b : !b ? a : b.year < a.year ? b : a)

for (const [word, sections] of sectionsByWord) {
  // Words that are only plurals, inflections or spellings of other words get no page.
  const real = sections.filter((s) => !s.formOnly)
  if (!real.length) continue

  const byNumber = new Map()
  for (const s of real) {
    const group = byNumber.get(s.n) ?? []
    group.push(s)
    byNumber.set(s.n, group)
  }
  for (const [, group] of [...byNumber].sort((a, b) => a[0].localeCompare(b[0]))) {
    const first = group[0]
    const ancestor = first.links[0] ?? null
    const chain = ancestor
      ? resolveChain(word, first.links, lookup)
      : [{ family: 'other', language: 'Modern English', form: word }]
    const quote = group.reduce((acc, s) => earlier(acc, s.quote), null)
    earliestByWord.set(word, earlier(earliestByWord.get(word), quote))
    const gloss = first.gloss
    const sense = gloss ? `${first.pos}: ${gloss.length > 60 ? `${gloss.slice(0, 57).trimEnd()}…` : gloss}` : first.pos
    const parent = ancestor ? keyOf(ancestor.lang, ancestor.term) : null
    if (parent) {
      const set = parentIndex.get(parent) ?? new Set()
      set.add(word)
      parentIndex.set(parent, set)
    }
    built.push({
      word,
      sense,
      hook: draftHook(chain),
      draft: true,
      chain,
      confidence: chain.length > 1 ? first.hedge : 'unknown',
      firstUse: quote,
      relatives: [],
      sources: ['Wiktionary'],
      _parent: parent,
      _parts: first.parts,
      _labels: first.labels,
      _roots: first.roots,
    })
  }
}
sectionsByWord.clear()

// 3b. Hand-checked entries (content/curated-words.json) replace the generated drafts
//     for the same headword. They keep their own text but borrow the quotation date
//     when they have none.
const curated = JSON.parse(readFileSync('content/curated-words.json', 'utf8'))
const curatedWords = new Set(curated.map((w) => w.word))
built = [
  ...built.filter((w) => !curatedWords.has(w.word)),
  ...curated.map((w) => ({
    ...w,
    firstUse: w.firstUse ?? earliestByWord.get(w.word) ?? null,
    draft: undefined,
    _parent: null,
  })),
]
console.log(`curated entries applied: ${curated.length}`)

// 3c. Words built from parts (un- + happy, sun + flower). Show the parts, and when the
//     word's own history is shorter than its base's, borrow the base's family line:
//     unhappy -> happy -> Middle English happy -> Old Norse happ.
const firstEntry = new Map()
for (const w of built) if (!firstEntry.has(w.word)) firstEntry.set(w.word, w)
let borrowed = 0
function chainOf(entry, depth = 0) {
  if (!entry._parts || entry._done) return entry.chain
  entry._done = true // set before recursing, so a cycle stops here
  const base = baseOf(entry._parts)
  const baseEntry = base && base !== entry.word ? firstEntry.get(base) : null
  if (baseEntry && depth < 6) {
    const baseChain = chainOf(baseEntry, depth + 1)
    entry._baseChain = baseChain
    if (baseChain.length > 1 && baseChain.length + 1 > entry.chain.length) {
      entry.chain = [...baseChain, { family: 'other', language: 'Modern English', form: entry.word }]
      entry.confidence = baseEntry.confidence
      borrowed++
    }
  }
  return entry.chain
}
let withParts = 0
for (const w of built) {
  if (!w._parts) continue
  withParts++
  chainOf(w)
  w.parts = w._parts.map((p) => ({
    form: p.form,
    ...(p.affix ? { affix: true } : {}),
    ...(!p.affix && p.form !== w.word && firstEntry.has(p.form) ? { link: true } : {}),
  }))
  if (w.draft) {
    w.hook = partsHook(w._parts, w._baseChain ?? null)
    if (w.confidence === 'unknown') w.confidence = 'known' // the parts themselves are not in doubt
  }
}
for (const w of built) {
  delete w._parts
  delete w._done
  delete w._baseChain
}
console.log(`words built from parts: ${withParts} (${borrowed} borrowed a base's family line)`)

// 4. Relatives: other headwords that share the same immediate ancestor, then keep
//    only links to words we publish.
for (const w of built) {
  if (w._parent) {
    const others = [...(parentIndex.get(w._parent) ?? [])].filter((x) => x !== w.word).slice(0, 6)
    w.relatives = others.map((x) => ({ word: x }))
  }
  delete w._parent
}
const present = new Set(built.map((w) => w.word))
for (const w of built) w.relatives = w.relatives.filter((r) => present.has(r.word))

// 4c. Sort every word into origin sections (Greek, French, Native American ...) from
//     its family line. Rebuilt on every run, so new words are always filed.
for (const w of built) {
  const { origin, via, groups } = classify(w.chain)
  w.origin = origin
  w.via = via
  w._groups = groups
}

// 4d. Compounds have no single ancestor (bookshelf = book + shelf), so file them by
//     their parts: the head (last part) decides where the word comes from, and the
//     word appears in every section its parts belong to. Two passes so a compound of
//     compounds is filed too.
const classOf = new Map()
for (const w of built) if (!classOf.has(w.word)) classOf.set(w.word, w)
let filedByParts = 0
for (let pass = 0; pass < 2; pass++) {
  for (const w of built) {
    if (w.origin !== 'unknown' || !w.parts) continue
    const known = w.parts
      .filter((p) => !p.affix && p.form !== w.word)
      .map((p) => classOf.get(p.form))
      .filter((c) => c && c.origin !== 'unknown')
    if (!known.length) continue
    const head = known[known.length - 1]
    w.origin = head.origin
    w.via = head.via
    w._groups = [...new Set(known.flatMap((c) => c._groups))]
    filedByParts++
  }
}
console.log(`compounds filed by their parts: ${filedByParts}`)

// 4e. Explore data. Most common words first everywhere.
const byPopularity = (a, b) =>
  (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity) || a.length - b.length || a.localeCompare(b)
const firstOf = new Map()
for (const w of built) if (!firstOf.has(w.word)) firstOf.set(w.word, w)

// Roots: Proto-Indo-European stages in a word's family line, plus Wiktionary's root
// templates. bʰer- -> bear, burden, transfer, metaphor.
const rootWords = new Map()
const rootGloss = new Map()
for (const [word, w] of firstOf) {
  const forms = new Set()
  for (const s of w.chain) {
    if (s.reconstructed && s.language === 'Proto-Indo-European') {
      forms.add(s.form)
      if (s.gloss && !rootGloss.has(s.form)) rootGloss.set(s.form, s.gloss)
    }
  }
  for (const r of w._roots ?? []) forms.add(r)
  for (const f of forms) (rootWords.get(f) ?? rootWords.set(f, new Set()).get(f)).add(word)
}
for (const f of rootWords.keys()) {
  if (!rootGloss.has(f)) {
    const g = cleanGloss(ancestors.get(keyOf('ine-pro', `*${f}`))?.gloss)
    if (g) rootGloss.set(f, g)
  }
}
const roots = [...rootWords]
  .filter(([, set]) => set.size >= 2)
  .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
  .map(([root, set], id) => ({ id, root, gloss: rootGloss.get(root) ?? null, words: [...set].sort(byPopularity) }))
for (const r of roots) {
  for (const word of r.words) {
    const w = firstOf.get(word)
    if ((w.roots ??= []).length < 3) w.roots.push({ root: r.root, id: r.id })
  }
}

// Prefixes and suffixes: every affix used to build at least three words.
const affixWords = new Map()
for (const [word, w] of firstOf) {
  for (const p of w.parts ?? []) if (p.affix) (affixWords.get(p.form) ?? affixWords.set(p.form, new Set()).get(p.form)).add(word)
}
const affixes = [...affixWords]
  .filter(([, set]) => set.size >= 3)
  .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
  .map(([affix, set], id) => {
    const info = affixInfo.get(affix)
    const chain = info?.ancestor ? resolveChain(affix, info.ancestor, lookup) : null
    return { id, affix, gloss: info?.gloss ?? null, origin: chain ? classify(chain).origin : 'unknown', words: [...set].sort(byPopularity) }
  })
const affixId = new Map(affixes.map((a) => [a.affix, a.id]))
for (const w of built) for (const p of w.parts ?? []) if (p.affix && affixId.has(p.form)) p.id = affixId.get(p.form)

// Slang, internet words and new words, from Wiktionary's own labels.
const labelLists = { internet: [], slang: [], new: [] }
for (const [word, w] of firstOf) {
  const labels = w._labels?.length ? w._labels : w.labels ?? []
  if (labels.length) w.labels = labels
  // Very common words whose first sense happens to be slang (whatever, dogs, john) would
  // bury the real slang, so the lists skip the 5,000 most common words unless featured.
  const tooCommon = (rank.get(word) ?? Infinity) < 5000 && !curatedWords.has(word)
  if (!tooCommon) for (const l of labels) labelLists[l]?.push(word)
}
for (const w of built) {
  delete w._labels
  delete w._roots
}
console.log(`roots: ${roots.length}, affixes: ${affixes.length}, internet: ${labelLists.internet.length}, slang: ${labelLists.slang.length}, new: ${labelLists.new.length}`)

// 5. Write data shards, per-letter search files and the index.
rmSync(values.out, { recursive: true, force: true })
mkdirSync(`${values.out}/w`, { recursive: true })
mkdirSync(`${values.out}/i`, { recursive: true })

const byShard = new Map()
for (const w of built) {
  const s = shardOf(w.word)
  // No prototype: headwords such as "constructor" must not collide with Object's own keys.
  const bucket = byShard.get(s) ?? Object.create(null)
  ;(bucket[w.word] ??= []).push(w)
  byShard.set(s, bucket)
}
// A word is filed under its main (first) sense only. Otherwise a rare homograph puts
// "tell" in Arabic (an archaeological mound) or "fan" in Chinese.
const groupsByWord = new Map() // word -> sections of its first sense
const originByWord = new Map() // word -> { origin, via } of its first sense
for (const w of built) {
  if (!originByWord.has(w.word)) {
    groupsByWord.set(w.word, new Set(w._groups))
    originByWord.set(w.word, { origin: w.origin, via: w.via })
  }
  delete w._groups
}
for (const [shard, bucket] of byShard) {
  writeFileSync(`${values.out}/w/${shard}.json`, JSON.stringify(bucket))
}

// Most common words first, then shorter before longer, then alphabetical.
const order = (a, b) =>
  (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity) || a.length - b.length || a.localeCompare(b)
const byLetter = new Map()
for (const word of present) {
  const l = letterOf(word)
  ;(byLetter.get(l) ?? byLetter.set(l, []).get(l)).push(word)
}
for (const [letter, words] of byLetter) {
  writeFileSync(`${values.out}/i/${letter}.json`, JSON.stringify(words.sort(order)))
}

// Origin sections: one word list per section, most common first, plus the counts
// behind the "where English words come from" page (all words and the 10,000 most common).
mkdirSync(`${values.out}/origins`, { recursive: true })
const sectionWords = new Map(ORIGIN_GROUPS.map((g) => [g.id, []]))
for (const [word, set] of groupsByWord) for (const g of set) sectionWords.get(g)?.push(word)
for (const [id, words] of sectionWords) {
  writeFileSync(`${values.out}/origins/${id}.json`, JSON.stringify(words.sort(order)))
}
const byRank = [...present].sort(order)
const common = new Set(byRank.slice(0, 10000))
const top1000 = new Set(byRank.slice(0, 1000))
const tally = (key, only) => {
  const counts = Object.fromEntries([...ORIGIN_GROUPS.map((g) => [g.id, 0]), ['unknown', 0]])
  for (const [word, o] of originByWord) if (!only || only.has(word)) counts[o[key]]++
  return counts
}
writeFileSync(
  `${values.out}/origins/index.json`,
  JSON.stringify({
    groups: ORIGIN_GROUPS.map((g) => ({ id: g.id, label: g.label, family: g.family, words: sectionWords.get(g.id).length })),
    counts: {
      origin: { all: tally('origin'), common: tally('origin', common), top1000: tally('origin', top1000) },
      via: { all: tally('via'), common: tally('via', common), top1000: tally('via', top1000) },
    },
  }),
)
const top = Object.entries(tally('origin')).sort((a, b) => b[1] - a[1]).slice(0, 6)
console.log(`origins (ultimate, all words): ${top.map(([k, n]) => `${k} ${n}`).join(', ')}`)

// Explore files: roots, affixes, slang lists, letter patterns, and a compact
// word -> origin map the sentence lab uses.
for (const dir of ['roots', 'affixes', 'sections', 'patterns', 'om']) mkdirSync(`${values.out}/${dir}`, { recursive: true })
const summary = (list) => list.map((x) => ({ ...Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'words')), n: x.words.length, sample: x.words.slice(0, 8) }))
writeFileSync(`${values.out}/roots/index.json`, JSON.stringify(summary(roots.filter((r) => r.words.length >= 3))))
for (const r of roots) writeFileSync(`${values.out}/roots/${r.id}.json`, JSON.stringify(r))
writeFileSync(`${values.out}/affixes/index.json`, JSON.stringify(summary(affixes)))
for (const a of affixes) writeFileSync(`${values.out}/affixes/${a.id}.json`, JSON.stringify(a))
const featured = new Set(curated.filter((w) => w.labels?.length).map((w) => w.word))
for (const [label, words] of Object.entries(labelLists)) {
  const sorted = words.sort((a, b) => (featured.has(b) ? 1 : 0) - (featured.has(a) ? 1 : 0) || byPopularity(a, b))
  writeFileSync(`${values.out}/sections/${label}.json`, JSON.stringify(sorted))
}

const patterns = JSON.parse(readFileSync('content/patterns.json', 'utf8'))
const popular = [...present].sort(byPopularity)
writeFileSync(
  `${values.out}/patterns/index.json`,
  JSON.stringify(
    patterns.map((p) => {
      const match =
        p.position === 'start' ? (w) => w.startsWith(p.letters) && w !== p.letters
        : p.position === 'end' ? (w) => w.endsWith(p.letters) && w !== p.letters
        : (w) => w.includes(p.letters)
      const byOrigin = {}
      const examples = {}
      let total = 0
      for (const word of popular) {
        if (!match(word)) continue
        // Sound patterns follow the language English borrowed from (chef came through
        // French); spelling clues like ph follow where the word ultimately comes from.
        const o = originByWord.get(word)?.[p.basis === 'via' ? 'via' : 'origin']
        if (!o || o === 'unknown') continue
        total++
        byOrigin[o] = (byOrigin[o] ?? 0) + 1
        if ((examples[o] ??= []).length < 12) examples[o].push(word)
      }
      return { ...p, total, byOrigin, examples }
    }),
  ),
)

const groupIndex = new Map(ORIGIN_GROUPS.map((g, i) => [g.id, i]))
const originMap = new Map()
for (const [word, o] of originByWord) {
  if (o.origin === 'unknown') continue
  const l = letterOf(word)
  // origin * 100 + via: one small number carries both labels.
  ;(originMap.get(l) ?? originMap.set(l, {}).get(l))[word] = groupIndex.get(o.origin) * 100 + (groupIndex.get(o.via) ?? groupIndex.get(o.origin))
}
for (const [l, map] of originMap) writeFileSync(`${values.out}/om/${l}.json`, JSON.stringify(map))

writeFileSync(
  `${values.out}/index.json`,
  JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    license: 'Derived from Wiktionary, CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)',
    count: present.size,
    letters: [...byLetter.keys()].sort(),
  }),
)

const withChain = built.filter((w) => w.chain.length > 1 || w.parts).length
const withDate = built.filter((w) => w.firstUse).length
console.log(`wrote ${built.length} entries for ${present.size} headwords (${withChain} with a family line or parts, ${withDate} with a dated quotation) in ${byShard.size} shards`)
