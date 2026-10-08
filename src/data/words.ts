import type { Word } from './types.ts'

// Seed entries written by hand from the product brief and standard
// etymological references. Any `firstUse` left null has NOT been checked
// against Wiktionary yet and must not be shown as verified.
export const WORDS: Word[] = [
  {
    word: 'fork',
    sense: 'eating and gardening tool',
    hook: 'Its root meant "pitchfork" before it meant anything you eat with.',
    chain: [
      { family: 'latin', language: 'Latin', form: 'furca', gloss: 'a pitchfork' },
      { family: 'germanic', language: 'Old English', form: 'forca', gloss: 'fork' },
      { family: 'other', language: 'Modern English', form: 'fork' },
    ],
    confidence: 'known',
    firstUse: null,
    relatives: [
      { word: 'bifurcate', note: 'two-pronged, from Medieval Latin bifurcus' },
      { word: 'furcate', note: 'forked, from Latin furca' },
    ],
    sources: ['Wiktionary: fork', 'Wiktionary: furca'],
  },
  {
    word: 'bear',
    sense: 'the animal',
    hook: 'English stopped saying the old word for bear, probably because people were afraid to say it.',
    chain: [
      { family: 'germanic', language: 'Proto-Germanic', form: 'berô', reconstructed: true, gloss: 'probably "the brown one"' },
      { family: 'germanic', language: 'Old English', form: 'bera' },
      { family: 'other', language: 'Modern English', form: 'bear' },
    ],
    confidence: 'likely',
    firstUse: null,
    relatives: [
      { word: 'arctic', note: 'from Greek arktos, "the Bear"' },
      { word: 'ursine', note: 'from Latin ursus' },
    ],
    sources: ['Wiktionary: bear (noun)'],
  },
  {
    word: 'bear',
    sense: 'to carry',
    hook: 'The same root gave English "burden", "transfer" and "metaphor".',
    chain: [
      { family: 'other', language: 'Proto-Indo-European', form: 'bʰer-', reconstructed: true, gloss: 'to carry' },
      { family: 'other', language: 'Old English', form: 'beran' },
      { family: 'other', language: 'Modern English', form: 'bear' },
    ],
    confidence: 'known',
    firstUse: null,
    relatives: [
      { word: 'burden', note: 'from the same root' },
      { word: 'transfer', note: 'from Latin ferre' },
      { word: 'metaphor', note: 'from Greek pherein' },
    ],
    sources: ['Wiktionary: bear (verb)', 'Wiktionary: bʰer-'],
  },
  {
    word: 'beef',
    sense: 'meat from cattle',
    hook: 'After 1066, the animal kept its English name while the meat got a French one.',
    chain: [
      { family: 'french', language: 'Old French', form: 'boeuf', gloss: 'ox, cow' },
      { family: 'other', language: 'Modern English', form: 'beef' },
    ],
    confidence: 'known',
    firstUse: null,
    relatives: [
      { word: 'pork', note: 'from Old French porc' },
      { word: 'mutton', note: 'from Old French mouton' },
    ],
    sources: ['Wiktionary: beef'],
  },
  {
    word: 'algorithm',
    sense: 'a step-by-step procedure',
    hook: 'Named after a ninth-century Persian mathematician, al-Khwarizmi.',
    chain: [
      { family: 'latin', language: 'Medieval Latin', form: 'algorismus' },
      { family: 'arabic', language: 'Arabic', form: 'al-Khwārizmī', gloss: 'the man from Khwarazm' },
      { family: 'other', language: 'Modern English', form: 'algorithm' },
    ],
    confidence: 'likely',
    firstUse: null,
    relatives: [
      { word: 'alcohol', note: 'also from Arabic al-' },
      { word: 'algebra', note: 'also from Arabic al-' },
    ],
    pattern: { affix: 'al-', text: 'Words starting with "al-" such as algebra and alcohol came through Arabic.' },
    sources: ['Wiktionary: algorithm'],
  },
  {
    word: 'posh',
    sense: 'upper-class, stylish',
    hook: 'The popular story "port out, starboard home" is a myth.',
    chain: [
      { family: 'other', language: 'Modern English', form: 'posh', gloss: 'origin disputed' },
    ],
    confidence: 'unknown',
    firstUse: null,
    relatives: [],
    myth: true,
    sources: ['Wiktionary: posh'],
  },
]
