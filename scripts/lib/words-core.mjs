// Pure logic for turning Wiktionary (kaikki.org) entries into WordUp words.
// No I/O here, so it can be tested with small hand-written fixtures.

// Language code -> family. Anything not listed is "other" and is shown neutral.
const FAMILY_BY_CODE = {
  la: 'latin', 'la-eme': 'latin', 'la-lat': 'latin', 'la-new': 'latin', 'la-med': 'latin',
  fr: 'french', fro: 'french', frm: 'french', xno: 'french', 'fro-nor': 'french', nrf: 'french',
  ang: 'germanic', enm: 'germanic', 'gmw-pro': 'germanic', 'gem-pro': 'germanic', goh: 'germanic', de: 'germanic', nl: 'germanic',
  grc: 'greek', el: 'greek', 'gre-pro': 'greek',
  ar: 'arabic', 'ar-cla': 'arabic',
  non: 'norse', odn: 'norse', is: 'norse', sv: 'norse', da: 'norse', no: 'norse',
}

// Templates that point at an ancestor word.
const ANCESTOR_TEMPLATES = new Set(['inh', 'der', 'bor', 'lbor', 'slb'])

export const MAX_DEPTH = 6

export function familyOf(code) {
  return FAMILY_BY_CODE[code] ?? 'other'
}

// Language names for codes whose dump is not loaded, so chains never show a raw code.
const LANGUAGE_NAMES = {
  'itc-pro': 'Proto-Italic', 'gem-pro': 'Proto-Germanic', 'gmw-pro': 'Proto-Germanic', 'ine-pro': 'Proto-Indo-European',
  'la-new': 'New Latin', 'la-lat': 'Latin', 'la-eme': 'Early Medieval Latin', 'la-med': 'Medieval Latin',
  xno: 'Anglo-Norman', 'fro-nor': 'Old Norman', 'gre-pro': 'Proto-Hellenic', 'ar-cla': 'Classical Arabic',
}

// Names learned from Wiktionary's own template text while reading the dump.
const LEARNED_NAMES = new Map()

// "Classical Nahuatl āhuacatl" -> "Classical Nahuatl". Rejects expansions that are
// not a clean language name ("Anglo-Norman noun, non,", "Old Dutch *klokka").
export function nameFromExpansion(expansion, term) {
  if (!expansion) return null
  const bare = (term ?? '').replace(/^\*/, '')
  const i = bare ? expansion.indexOf(bare) : -1
  const name = (i > 0 ? expansion.slice(0, i) : expansion).replace(/[\s*]+$/, '').trim()
  return /^[A-Z][A-Za-zÀ-ÿāēīōū'’ -]{1,40}$/.test(name) && name.split(' ').length <= 4 ? name : null
}

export function learnLanguageName(code, name) {
  if (code && name && !LEARNED_NAMES.has(code)) LEARNED_NAMES.set(code, name)
}

export function languageNameFallback(code) {
  return LANGUAGE_NAMES[code] ?? LEARNED_NAMES.get(code) ?? code
}

// Lookup key for a term. Diacritics and the reconstruction asterisk are ignored, because
// English templates and the ancestor entries do not always spell a proto-form the same way.
export function normalizeTerm(term) {
  return term.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\*/g, '').trim()
}

export function keyOf(langCode, term) {
  return `${langCode}:${normalizeTerm(term)}`
}

export function isReconstructed(term) {
  return term.startsWith('*')
}

export function cleanTerm(term) {
  return term.replace(/^\*/, '').trim()
}

// Senses that only point at another spelling or an inflection. Shown as a picker
// option they add noise, so they are dropped when a real sense exists.
const FORM_ONLY = /^(alternative (form|spelling)|misspelling|obsolete (form|spelling)|archaic (form|spelling)|dated (form|spelling)|plural of|inflection of|(simple )?past (tense|participle) of|present participle of|third-person singular|abbreviation of|initialism of|synonym of)/i

export function isFormOnly(section) {
  const gloss = section.senses?.[0]?.glosses?.[0] ?? ''
  return FORM_ONLY.test(gloss.trim())
}

/** First ancestor link in a section: { lang, term, gloss } or null. */
export function ancestorOf(templates = []) {
  for (const t of templates) {
    if (!ANCESTOR_TEMPLATES.has(t.name)) continue
    const lang = t.args?.['2']
    const term = t.args?.['3']
    if (!lang || !term || lang === 'en') continue
    return { lang, term, gloss: t.args?.t || t.args?.gloss || null }
  }
  return null
}

/** Confidence from the etymology text, using Wiktionary's own hedges. */
export function confidenceOf(etymologyText = '', hasChain) {
  const text = etymologyText.toLowerCase()
  if (!hasChain || /origin (is )?unknown|unknown origin/.test(text)) return 'unknown'
  if (/uncertain|possibly|probably|perhaps|disputed/.test(text)) return 'likely'
  return 'known'
}

/**
 * Walks the ancestor links from an English section up to MAX_DEPTH.
 * `lookup(key)` returns a compact non-English record { lang, gloss, ancestor }.
 * Returns stages earliest-first, ending with the English form itself.
 */
export function resolveChain(word, firstAncestor, lookup) {
  const stages = []
  const seen = new Set()
  let link = firstAncestor
  while (link && stages.length < MAX_DEPTH) {
    const key = keyOf(link.lang, link.term)
    if (seen.has(key)) break
    seen.add(key)
    const record = lookup(key)
    stages.unshift({
      code: link.lang,
      term: link.term,
      language: record?.lang ?? languageNameFallback(link.lang),
      gloss: link.gloss ?? record?.gloss ?? undefined,
    })
    link = record?.ancestor ?? null
  }
  return stages.map((s) => {
    const reconstructed = isReconstructed(s.term)
    return {
      family: familyOf(s.code),
      language: s.language,
      form: cleanTerm(s.term),
      ...(s.gloss ? { gloss: s.gloss } : {}),
      ...(reconstructed ? { reconstructed: true } : {}),
    }
  }).concat([{ family: 'other', language: 'Modern English', form: word }])
}

// "alternative form of forca (found in compounds)" -> forca, in the same language.
const ALT_FORM = /^alternative (?:form|spelling) of ([^\s(]+)/i

/** Keeps the compact fields we need from one raw kaikki record. */
export function compactRecord(raw) {
  const gloss = raw.senses?.[0]?.glosses?.[0] ?? ''
  const alt = ALT_FORM.exec(gloss.trim())
  const ancestor = ancestorOf(raw.etymology_templates)
    ?? (alt ? { lang: raw.lang_code, term: alt[1], gloss: null } : null)
  return {
    lang: raw.lang,
    gloss: gloss && !ALT_FORM.test(gloss.trim()) ? gloss.slice(0, 120) : undefined,
    ancestor,
  }
}

/** Data shard for a headword: its first two letters ("fo"), or "f_" for one-letter words. */
export function shardOf(word) {
  if (/^[a-z]{2}/.test(word)) return word.slice(0, 2)
  if (/^[a-z]/.test(word)) return `${word[0]}_`
  return 'other'
}

/** Search-index file for a headword: its first letter. */
export function letterOf(word) {
  return /^[a-z]/.test(word) ? word[0] : 'other'
}

// A quotation reference starts with its date: "1879, R. Jefferies, ...",
// "c. 1606–1607 (date written), William Shakespeare, ...". Take the first year.
const QUOTE_YEAR = /^(?:c\.\s*|a\.\s*|ante\s+|circa\s+)?(\d{3,4})\b/

/**
 * The earliest dated quotation in a raw section, as { year, quote, source }, or null.
 * This is the earliest example Wiktionary quotes, not necessarily the first use ever.
 */
export function earliestQuote(raw) {
  let best = null
  for (const sense of raw.senses ?? []) {
    for (const ex of sense.examples ?? []) {
      if (ex.type !== 'quotation' || !ex.ref) continue
      const m = QUOTE_YEAR.exec(ex.ref.trim())
      if (!m) continue
      const year = Number(m[1])
      if (year > new Date().getFullYear()) continue
      if (best && best.year <= year) continue
      best = {
        year,
        ...(ex.text ? { quote: ex.text.replace(/\s+/g, ' ').trim().slice(0, 200) } : {}),
        source: ex.ref.replace(/,?\s*→[A-Z]+:?/g, '').replace(/\s+/g, ' ').trim().slice(0, 160),
      }
    }
  }
  return best
}

/** A short, sourced sentence used as the hook until a human writes one. */
export function draftHook(stages) {
  const origin = stages[0]
  if (stages.length === 1) return 'Wiktionary gives no earlier form for this sense.'
  const gloss = origin.gloss ? `, meaning "${origin.gloss}"` : ''
  return `From ${origin.language} ${origin.reconstructed ? '*' : ''}${origin.form}${gloss}.`
}

// Templates that say how an English word was built from parts.
// prefix|en|un|happy, suffix|en|teach|er, af|en|re-|write, compound|en|black|bird,
// and the tree form ety|en|:af|happy|-ness.
const PART_TEMPLATES = new Set(['af', 'affix', 'prefix', 'pre', 'suffix', 'suf', 'compound', 'com'])

function numberedArgs(args, from) {
  const out = []
  for (let i = from; args[String(i)] !== undefined; i++) out.push(String(args[String(i)]).trim())
  return out.filter(Boolean)
}

/**
 * The parts a word was built from, as [{ form, affix }], or null.
 * Affixes keep their hyphen ("un-", "-ness") so they read as affixes.
 */
export function partsOf(templates = []) {
  for (const t of templates) {
    const args = t.args ?? {}
    let forms = null
    if (t.name === 'ety' && /^:(af|affix|compound|com)$/.test(args['2'] ?? '')) forms = numberedArgs(args, 3)
    else if (!PART_TEMPLATES.has(t.name) || args['1'] !== 'en') continue
    else if (t.name === 'prefix' || t.name === 'pre') {
      const [prefix, ...rest] = numberedArgs(args, 2)
      forms = prefix ? [`${prefix.replace(/-$/, '')}-`, ...rest] : null
    } else if (t.name === 'suffix' || t.name === 'suf') {
      const [base, ...suffixes] = numberedArgs(args, 2)
      forms = base ? [base, ...suffixes.map((s) => `-${s.replace(/^-/, '')}`)] : null
    } else forms = numberedArgs(args, 2)
    if (!forms || forms.length < 2) continue
    return forms.map((form) => ({ form, affix: form.startsWith('-') || form.endsWith('-') }))
  }
  return null
}

/** The single non-affix part a derived word is built on, or null for compounds. */
export function baseOf(parts) {
  const bases = (parts ?? []).filter((p) => !p.affix)
  return bases.length === 1 ? bases[0].form : null
}

/** A short, sourced sentence for a word built from parts. */
export function partsHook(parts, baseChain) {
  const built = parts.map((p) => p.form).join(' + ')
  const bases = parts.filter((p) => !p.affix)
  if (bases.length > 1) return `A compound of ${built}.`
  if (!baseChain || baseChain.length < 2) return `Made from ${built}.`
  const origin = baseChain[0]
  const gloss = origin.gloss ? `, meaning "${origin.gloss}"` : ''
  return `Made from ${built}. ${bases[0].form} goes back to ${origin.language} ${origin.reconstructed ? '*' : ''}${origin.form}${gloss}.`
}
