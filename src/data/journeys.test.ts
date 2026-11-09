import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

// Checks content/journeys.json, so new journeys cannot ship with a broken map.
const require = createRequire(import.meta.url)
const world = require('world-atlas/countries-110m.json') as { objects: { countries: { geometries: { id: string }[] } } }
const countries = new Set(world.objects.countries.geometries.map((g) => g.id))
const journeys = JSON.parse(readFileSync(join(process.cwd(), 'content', 'journeys.json'), 'utf8')) as {
  id: string
  word: string
  steps: { headline: string; text: string; form?: string; stop?: [number, number]; noRoute?: boolean; areas: { iso: string; color: string; label?: string; at?: [number, number] }[] }[]
}[]
const COLORS = new Set(['yellow', 'purple', 'blue', 'green', 'coral', 'pink'])
const headwords = new Set<string>()
for (const f of readdirSync(join(process.cwd(), 'public', 'data', 'w'))) {
  for (const w of Object.keys(JSON.parse(readFileSync(join(process.cwd(), 'public', 'data', 'w', f), 'utf8')))) headwords.add(w)
}
const okPoint = (p?: [number, number]) => !!p && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180

test('journey ids are unique and every journey word has a page', () => {
  assert.equal(new Set(journeys.map((j) => j.id)).size, journeys.length)
  for (const j of journeys) assert.ok(headwords.has(j.word), `${j.id}: ${j.word} is not a headword`)
})

test('every step has text, a valid stop when it is on the route, and real countries', () => {
  for (const j of journeys) {
    assert.ok(j.steps.length >= 2, `${j.id} needs at least two steps`)
    for (const [i, s] of j.steps.entries()) {
      const where = `${j.id} step ${i + 1}`
      assert.ok(s.headline && s.text, `${where} needs a headline and text`)
      // The text sits in a fixed room under the map on a phone; longer text squeezes the map.
      assert.ok(s.headline.length <= 56, `${where} headline is too long for a phone (${s.headline.length} > 56)`)
      assert.ok(s.text.length <= 170, `${where} text is too long for a phone (${s.text.length} > 170)`)
      if (!s.noRoute) assert.ok(okPoint(s.stop), `${where} needs a stop [lat, lon]`)
      assert.ok(s.areas.length > 0, `${where} needs at least one area`)
      for (const a of s.areas) {
        assert.ok(countries.has(a.iso), `${where}: country ${a.iso} is not on the map`)
        assert.ok(COLORS.has(a.color), `${where}: colour ${a.color}`)
        if (a.label) assert.ok(okPoint(a.at), `${where}: label ${a.label} needs a position`)
      }
    }
  }
})
