import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FAMILY_META } from './families.ts'

test('every language family has a label and a color token', () => {
  for (const [family, meta] of Object.entries(FAMILY_META)) {
    assert.ok(meta.label.length > 0, `${family} needs a label`)
    assert.match(meta.color, /^var\(--color-[a-z]+\)$/, `${family} needs a CSS token`)
  }
})
