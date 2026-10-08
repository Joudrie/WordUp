import type { ChainStep } from '../data/types.ts'
import { familyColor } from '../lib/families.ts'

// The word's ancestry drawn as a transit line: one station per stage, each in
// its language family's color. Vertical on phones, horizontal from `sm` up.
export function FamilyLine({ chain }: { chain: ChainStep[] }) {
  return (
    <ol className="flex flex-col sm:flex-row sm:items-start" aria-label="Family line, earliest form first">
      {chain.map((step, i) => {
        const color = familyColor(step.family)
        return (
          <li key={`${step.language}-${step.form}`} className="relative flex-1 pb-7 pl-8 sm:pb-0 sm:pl-0 sm:pt-8 sm:text-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className="absolute left-[7px] -top-7 h-8 w-[3px] sm:-left-1/2 sm:right-1/2 sm:top-[9px] sm:h-[3px] sm:w-auto"
                style={{ backgroundColor: color }}
              />
            )}
            <span
              aria-hidden="true"
              className="absolute left-0 top-1 size-4 rounded-full border-[3px] bg-[var(--color-page)] sm:left-1/2 sm:top-0 sm:-translate-x-1/2"
              style={{ borderColor: color }}
            />
            <div className="headword text-xl" style={{ color }}>
              {step.reconstructed ? '*' : ''}
              {step.form}
            </div>
            <div className="text-sm text-[var(--color-muted)]">
              {step.language}
              {step.gloss ? `, ${step.gloss}` : ''}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
