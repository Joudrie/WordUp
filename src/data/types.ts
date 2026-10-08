// One entry per spelling-and-meaning. A spelling with several unrelated
// origins (bear the animal, bear to carry) is several Word entries sharing
// the same `word`; the lookup returns them all so the card can show a picker.

export type Family = 'latin' | 'french' | 'germanic' | 'greek' | 'arabic' | 'norse' | 'other'

export type Confidence = 'known' | 'likely' | 'disputed' | 'unknown'

export interface ChainStep {
  family: Family
  /** Language name as shown to readers, e.g. "Old English". */
  language: string
  /** The form in that language, e.g. "forca". */
  form: string
  gloss?: string
  /** Reconstructed forms are marked with an asterisk and explained once. */
  reconstructed?: boolean
}

export interface Relative {
  word: string
  /** Short note on how it relates, shown under the chip. */
  note?: string
}

export interface Lookalike {
  word: string
  note: string
}

export interface Word {
  /** The headword as typed, lowercase. */
  word: string
  /** Shown beside the headword when this spelling has several meanings. */
  sense: string
  /** One line: the best fact about the word. */
  hook: string
  /** Ancestry stages, earliest first, ending at the modern English form. */
  chain: ChainStep[]
  confidence: Confidence
  /** Earliest dated use if verified; null means "not yet checked". */
  firstUse: { year: number; quote?: string; source?: string } | null
  relatives: Relative[]
  /** Pattern callout, e.g. the -ology ending. */
  pattern?: { affix: string; text: string }
  lookalikes?: Lookalike[]
  /** Hook generated from Wiktionary and not yet reviewed by a person. */
  draft?: boolean
  /** Popular origin that is false or oversimplified. */
  myth?: boolean
  sources: string[]
}
