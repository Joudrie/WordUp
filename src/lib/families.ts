import type { Family } from '../data/types.ts'

// Each language family gets one color, used everywhere it appears: chain
// lines, relative chips, the stats page. Everything else is neutral gray.
// Values are placeholders until the palette is checked for contrast in both
// themes (see README, "Look").
export const FAMILY_META: Record<Family, { label: string; color: string }> = {
  latin: { label: 'Latin', color: 'var(--color-latin)' },
  french: { label: 'French', color: 'var(--color-french)' },
  germanic: { label: 'Germanic', color: 'var(--color-germanic)' },
  greek: { label: 'Greek', color: 'var(--color-greek)' },
  arabic: { label: 'Arabic', color: 'var(--color-arabic)' },
  norse: { label: 'Norse', color: 'var(--color-norse)' },
  other: { label: 'Other', color: 'var(--color-neutral)' },
}

export function familyColor(family: Family): string {
  return FAMILY_META[family].color
}
