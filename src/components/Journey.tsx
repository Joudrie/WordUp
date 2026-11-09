import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, MapPinned } from 'lucide-react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import type { Feature, Geometry } from 'geojson'
import journeys from '../../content/journeys.json'
import { BackLink, Loading } from './ui.tsx'

// Word journeys: a word's route between languages, drawn on a map one step at a time.
// The content is hand-written in content/journeys.json; places are modern countries,
// used only as a rough guide to where a language was spoken.

type Color = 'yellow' | 'purple' | 'blue' | 'green' | 'coral' | 'pink'
interface Area { iso: string; color: Color; label?: string; at?: [number, number] }
interface Step {
  headline: string
  text: string
  lang?: string
  form?: string
  stop?: [number, number]
  noRoute?: boolean
  areas: Area[]
  key?: { color: Color; text: string }[]
}
export interface JourneyData { id: string; word: string; title: string; summary: string; steps: Step[] }

export const JOURNEYS = journeys as JourneyData[]
export const journeyFor = (word: string) => JOURNEYS.find((j) => j.word === word)

const FILL: Record<Color, string> = {
  yellow: 'var(--sticker-yellow)', purple: 'var(--sticker-purple)', blue: 'var(--sticker-blue)',
  green: 'var(--sticker-green)', coral: 'var(--sticker-coral)', pink: 'var(--sticker-pink)',
}

// The whole world is projected once onto a 1000 x 520 canvas; steps only move the view.
const W = 1000
const H = 520
const projection = geoNaturalEarth1().fitSize([W, H], { type: 'Sphere' })
const path = geoPath(projection)
const project = ([lat, lon]: [number, number]) => projection([lon, lat]) ?? [0, 0]

interface Country { id: string; d: string }
let worldPromise: Promise<Country[]> | null = null
function loadWorld(): Promise<Country[]> {
  worldPromise ??= Promise.all([import('world-atlas/countries-110m.json'), import('topojson-client')]).then(([world, topo]) => {
    const topology = (world.default ?? world) as unknown as Parameters<typeof topo.feature>[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fc = topo.feature(topology, (topology as any).objects.countries) as unknown as { features: Feature<Geometry>[] }
    return fc.features.map((f) => ({ id: String(f.id), d: path(f) ?? '' }))
  })
  return worldPromise
}

function useWorld(): Country[] | null {
  const [world, setWorld] = useState<Country[] | null>(null)
  useEffect(() => {
    let live = true
    loadWorld().then((w) => live && setWorld(w))
    return () => {
      live = false
    }
  }, [])
  return world
}

type Box = [number, number, number, number] // x, y, width, height

/** The stop before step i, if any: the leg the reader has just travelled. */
function previousStop(steps: Step[], i: number): Step | undefined {
  for (let k = i - 1; k >= 0; k--) if (steps[k].stop && !steps[k].noRoute) return steps[k]
  return undefined
}

/** The view for a step: the leg just travelled (previous stop to this one) plus this
 *  step's labels, padded, at 4:3. Earlier legs run off the edge, like a moving map. */
function viewFor(steps: Step[], i: number): Box {
  const pts: [number, number][] = []
  const step = steps[i]
  const prev = step.noRoute ? undefined : previousStop(steps, i)
  if (prev?.stop) pts.push(project(prev.stop) as [number, number])
  for (const a of step.areas) if (a.at) pts.push(project(a.at) as [number, number])
  if (step.stop) pts.push(project(step.stop) as [number, number])
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  const pad = 45
  x0 -= pad; x1 += pad; y0 -= pad; y1 += pad
  let w = Math.max(x1 - x0, 150)
  let h = Math.max(y1 - y0, 110)
  const aspect = 4 / 3
  if (w / h > aspect) h = w / aspect
  else w = h * aspect
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  return [cx - w / 2, cy - h / 2, w, h]
}

/** Glides the view between steps; jumps when the reader prefers reduced motion. */
function useAnimatedBox(target: Box): Box {
  const [box, setBox] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const start = from.current
    if (reduce) {
      from.current = target
      setBox(target)
      return
    }
    let frame = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / 700)
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      const next = start.map((v, k) => v + (target[k] - v) * e) as Box
      from.current = next
      setBox(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.join(',')])
  return box
}

/** A gentle arc between two points, so the route reads as travel. */
function arc(a: [number, number], b: [number, number]): string {
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const bend = 0.18
  return `Q ${mx - dy * bend} ${my + dx * bend} ${b[0]} ${b[1]}`
}

function Label({ x, y, text, size, faded }: { x: number; y: number; text: string; size: number; faded?: boolean }) {
  const w = text.length * size * 0.56 + size * 0.9
  const h = size * 1.5
  return (
    <g opacity={faded ? 0.75 : 1}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} fill="#ffffff" stroke="#16161d" strokeWidth={size * 0.12} />
      <text x={x} y={y + size * 0.36} textAnchor="middle" fontSize={size} fontWeight={800} fill="#16161d">{text}</text>
    </g>
  )
}

function JourneyMap({ journey, step }: { journey: JourneyData; step: number }) {
  const world = useWorld()
  const target = useMemo(() => viewFor(journey.steps, step), [journey, step])
  const box = useAnimatedBox(target)
  const s = journey.steps[step]
  const fills = new Map(s.areas.map((a) => [a.iso, FILL[a.color]]))
  const unit = box[2] / 100 // one hundredth of the visible width
  const stops = s.noRoute ? [] : journey.steps.slice(0, step + 1).filter((x) => x.stop && !x.noRoute)
  const pts = stops.map((x) => project(x.stop!) as [number, number])
  const route = pts.length > 1 ? `M ${pts[0][0]} ${pts[0][1]} ` + pts.slice(1).map((p, k) => arc(pts[k], p)).join(' ') : ''

  return (
    <div className="sticker overflow-hidden bg-[#eef1f7]" style={{ aspectRatio: '4 / 3' }}>
      {!world ? (
        <div className="flex h-full items-center justify-center"><Loading /></div>
      ) : (
        <svg viewBox={box.join(' ')} className="block h-full w-full" role="img"
          aria-label={`Map: ${s.areas.map((a) => a.label).filter(Boolean).join(', ')}`}>
          {world.map((c) => (
            <path key={c.id} d={c.d} fill={fills.get(c.id) ?? '#dcdde6'} stroke={fills.has(c.id) ? '#16161d' : '#ffffff'}
              strokeWidth={fills.has(c.id) ? unit * 0.28 : unit * 0.12} strokeLinejoin="round" />
          ))}
          {route && (
            <path d={route} fill="none" stroke="#16161d" strokeWidth={unit * 0.45} strokeDasharray={`${unit * 1.4} ${unit * 1.1}`} strokeLinecap="round" />
          )}
          {pts.map((p, k) => (
            <circle key={k} cx={p[0]} cy={p[1]} r={unit * (k === pts.length - 1 ? 1.3 : 0.9)} fill={k === pts.length - 1 ? 'var(--sticker-yellow)' : '#ffffff'} stroke="#16161d" strokeWidth={unit * 0.35} />
          ))}
          {/* The previous form stays on the map, smaller, so you can see where the word came from. */}
          {(() => {
            const prev = s.noRoute ? undefined : previousStop(journey.steps, step)
            if (!prev?.form) return null
            const [px, py] = project(prev.stop!)
            return <Label x={px} y={py - unit * 3.4} text={prev.form} size={unit * 2.8} faded />
          })()}
          {s.areas.filter((a) => a.label && a.at).map((a, k) => {
            const [px, py] = project(a.at!)
            return <Label key={k} x={px} y={py} text={a.label!} size={unit * (s.noRoute ? 2.3 : 3.8)} />
          })}
        </svg>
      )}
    </div>
  )
}

export function JourneyPage({ id }: { id: string }) {
  const journey = JOURNEYS.find((j) => j.id === id)
  const [step, setStep] = useState(0)
  if (!journey) return <p>No such journey. <a className="underline" href="#/journeys">See all journeys</a>.</p>
  const s = journey.steps[step]
  const last = journey.steps.length - 1
  const forms = journey.steps.map((x, i) => ({ i, form: x.form, lang: x.lang })).filter((x) => x.form)

  return (
    <section>
      <BackLink href="#/journeys">All journeys</BackLink>
      <p className="mt-2 text-sm font-bold uppercase tracking-wide text-[var(--sticker-coral)]">{journey.title}</p>
      <h1 className="headword mt-1 min-h-[3.75rem] text-2xl leading-tight sm:text-3xl" aria-live="polite">{s.headline}</h1>

      <div className="mt-3"><JourneyMap journey={journey} step={step} /></div>

      {s.key && (
        <ul className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
          {s.key.map((k) => (
            <li key={k.text} className="flex items-center gap-1.5">
              <span className="h-4 w-4 rounded-full border-2 border-[#16161d]" style={{ background: FILL[k.color] }} />
              {k.text}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-base leading-relaxed">{s.text}</p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" onClick={() => setStep((n) => Math.max(0, n - 1))} disabled={step === 0}
          className="sticker inline-flex h-12 items-center gap-1 bg-[var(--color-card)] px-4 font-extrabold text-[var(--color-ink)] disabled:opacity-40">
          <ArrowLeft size={18} aria-hidden /> Back
        </button>
        <span className="text-sm font-bold tabular-nums">{step + 1} / {last + 1}</span>
        {step < last ? (
          <button type="button" onClick={() => setStep((n) => Math.min(last, n + 1))}
            className="sticker bg-yellow inline-flex h-12 items-center gap-1 px-5 font-extrabold">
            Next <ArrowRight size={18} aria-hidden />
          </button>
        ) : (
          <a href={`#/w/${journey.word}`} className="sticker bg-purple inline-flex h-12 items-center px-4 font-extrabold">Word page</a>
        )}
      </div>

      <h2 className="headword mt-6 text-lg">The route</h2>
      <ol className="mt-2 flex flex-wrap items-center gap-1.5">
        {forms.map((f, k) => (
          <li key={f.i} className="flex items-center gap-1.5">
            {k > 0 && <span aria-hidden="true" className="font-extrabold">→</span>}
            <button type="button" onClick={() => setStep(f.i)} aria-current={f.i === step ? 'step' : undefined}
              className={`rounded-full border-2 border-[#16161d] px-2.5 py-1 text-sm font-bold ${f.i === step ? 'bg-[var(--sticker-yellow)] text-[#16161d]' : ''}`}>
              {f.form} <span className="font-semibold opacity-70">{f.lang}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-xs text-[var(--color-muted)]">
        Modern borders are shown as a rough guide to where each language was spoken. Map data: Natural Earth.
      </p>
    </section>
  )
}

export function JourneysPage() {
  return (
    <section>
      <h1 className="headword text-2xl sm:text-3xl">Word journeys</h1>
      <p className="mt-1">Watch a word travel from language to language on the map.</p>
      <ul className="mt-4 grid gap-3">
        {JOURNEYS.map((j, k) => (
          <li key={j.id}>
            <a href={`#/journeys/${j.id}`} className={`sticker ${['bg-yellow', 'bg-purple', 'bg-green', 'bg-coral'][k % 4]} flex items-center gap-3 p-4`}>
              <MapPinned size={28} aria-hidden />
              <span className="min-w-0">
                <span className="headword block text-2xl leading-none">{j.word}</span>
                <span className="block font-bold">{j.title}</span>
                <span className="block text-sm">{j.summary.split(', ').join(' → ')}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** A link from a word page to its journey, when one exists. */
export function JourneyLink({ word }: { word: string }) {
  const j = journeyFor(word)
  if (!j) return null
  return (
    <a href={`#/journeys/${j.id}`} className="sticker bg-blue flex items-center gap-3 p-4">
      <MapPinned size={26} aria-hidden />
      <span>
        <span className="headword block text-lg">See {word} travel on a map</span>
        <span className="block text-sm">{j.summary.split(', ').join(' → ')}</span>
      </span>
    </a>
  )
}
