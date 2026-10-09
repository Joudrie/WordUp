// Groups the hundreds of source languages in Wiktionary into sections readers
// recognise, and classifies each word by where it came from.
//
// Matching is on language names (as shown in the family line), so hand-checked
// entries and generated ones are sorted the same way. Order matters: the first
// pattern that matches wins.

export const ORIGIN_GROUPS = [
  { id: 'english', label: 'Old & Middle English', family: 'germanic',
    pattern: /^((Early |Late |Northern )?(Old|Middle) English|Scots|Germanic|Proto-(West |North )?Germanic)$/ },
  { id: 'latin', label: 'Latin', family: 'latin', pattern: /Latin\b/ },
  { id: 'french', label: 'French', family: 'french', pattern: /French|Anglo-Norman|Norman/ },
  { id: 'greek', label: 'Greek', family: 'greek', pattern: /Greek/ },
  { id: 'norse', label: 'Old Norse & Scandinavian', family: 'norse',
    pattern: /Norse|Icelandic|Swedish|Danish|Norwegian|Faroese|North Germanic/ },
  { id: 'dutch-german', label: 'Dutch & German', family: 'other',
    pattern: /Dutch|German\b|Frankish|Saxon|Afrikaans|Yiddish|Flemish|Frisian/ },
  { id: 'italian', label: 'Italian', family: 'other', pattern: /Italian|Venetian|Sicilian|Neapolitan|Genoese/ },
  { id: 'spanish-portuguese', label: 'Spanish & Portuguese', family: 'other', pattern: /Spanish|Portuguese|Galician|Catalan|Occitan|Provençal/ },
  { id: 'celtic', label: 'Celtic languages', family: 'other', pattern: /Irish|Gaelic|Welsh|Breton|Cornish|Celtic|Gaulish|Manx|Brythonic/ },
  { id: 'arabic', label: 'Arabic', family: 'arabic', pattern: /Arabic/ },
  { id: 'hebrew', label: 'Hebrew & Aramaic', family: 'other', pattern: /Hebrew|Aramaic|Syriac|Akkadian|Phoenician/ },
  { id: 'persian', label: 'Persian', family: 'other', pattern: /Persian|Avestan|Pahlavi|Iranian/ },
  { id: 'india', label: 'Hindi, Sanskrit & languages of India', family: 'other',
    pattern: /Hindi|Urdu|Hindustani|Sanskrit|Pali|Prakrit|Tamil|Telugu|Malayalam|Kannada|Bengali|Punjabi|Marathi|Gujarati|Sinhalese|Dravidian/ },
  { id: 'chinese', label: 'Chinese', family: 'other', pattern: /Chinese|Mandarin|Cantonese|Hokkien|Hakka|Min Nan|Wu\b|Pinyin/ },
  { id: 'japanese', label: 'Japanese', family: 'other', pattern: /Japanese/ },
  { id: 'slavic', label: 'Russian & Slavic languages', family: 'other',
    pattern: /Russian|Ukrainian|Polish|Czech|Slavic|Slavonic|Serbo|Serbian|Croatian|Bulgarian|Slovak|Slovene|Belarusian/ },
  { id: 'turkic', label: 'Turkish & Turkic languages', family: 'other', pattern: /Turkish|Turkic|Uzbek|Kazakh|Azerbaijani|Tatar|Mongolian/ },
  { id: 'americas', label: 'Native American languages', family: 'other',
    pattern: /Nahuatl|Tupi|Quechua|Taíno|Taino|Guarani|Navajo|Ojibwe|Cree|Mi'kmaq|Algonquian|Cherokee|Dakota|Lakota|Chinook|Arawak|Iroquoian|Siouan|Mayan|Maya|Inuit|Inuktitut|Aleut|Massachusett|Powhatan|Munsee|Unami|Narragansett|Abenaki|Mohawk|Choctaw|Muscogee|Carib|Aymara|Mapudungun|Yupik|Tlingit|Hopi|Zuni|Delaware|Shawnee|Miami|Mohegan/ },
  { id: 'pacific', label: 'Malay & Pacific languages', family: 'other',
    pattern: /Māori|Maori|Hawaiian|Malay|Indonesian|Tagalog|Samoan|Tongan|Tahitian|Fijian|Javanese|Polynesian/ },
  { id: 'african', label: 'African languages', family: 'other',
    pattern: /Swahili|Zulu|Xhosa|Yoruba|Hausa|Wolof|Egyptian|Coptic|Bantu|Kongo|Akan|Twi|Igbo|Malagasy|Amharic|Berber|Mandinka|Fula/ },
  { id: 'other', label: 'Other languages', family: 'other', pattern: null },
]

const BY_ID = new Map(ORIGIN_GROUPS.map((g) => [g.id, g]))

// A bare code such as "ja" or "nan-hbl" is a language whose name we never learned.
const LOOKS_LIKE_CODE = /^[a-z]{2,3}(-[a-z]+)*$/
const IGNORED = /^(Modern English|English|translingual|Translingual)$/

/** The origin group for a language name, or null if it should be ignored. */
export function groupOfLanguage(name) {
  if (!name || IGNORED.test(name) || LOOKS_LIKE_CODE.test(name)) return null
  for (const g of ORIGIN_GROUPS) if (g.pattern && g.pattern.test(name)) return g.id
  return 'other'
}

/**
 * Classifies a word from its family line (earliest stage first).
 *   origin: where it ultimately comes from (earliest attested, named stage)
 *   via:    the language it came into English through (last stage before English)
 *   groups: every section the word belongs to
 * Reconstructed stages are skipped: nobody wrote them down.
 */
export function classify(chain) {
  const groups = chain
    .filter((s) => !s.reconstructed)
    .map((s) => groupOfLanguage(s.language))
    .filter(Boolean)
  if (!groups.length) {
    // Only reconstructed ancestors: a native word whose history is all Germanic.
    const germanic = chain.some((s) => s.reconstructed && /Germanic/.test(s.language))
    return germanic ? { origin: 'english', via: 'english', groups: ['english'] } : { origin: 'unknown', via: 'unknown', groups: [] }
  }
  const origin = groups[0]
  const borrowed = groups.filter((g) => g !== 'english')
  const via = borrowed.length ? borrowed[borrowed.length - 1] : 'english'
  const sections = new Set(borrowed)
  if (origin === 'english') sections.add('english')
  return { origin, via, groups: [...sections] }
}

export function originLabel(id) {
  return BY_ID.get(id)?.label ?? 'Unknown'
}
