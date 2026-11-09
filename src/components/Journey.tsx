import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, ChevronsDown, MapPinned } from 'lucide-react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import type { Feature, Geometry } from 'geojson'
import journeys from '../../content/journeys.json'
import { Loading } from './ui.tsx'

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

const routeSteps = (j: JourneyData) => j.steps.filter((x) => x.stop && !x.noRoute)

/** Pads a set of points and widens it to 4:3. */
function boxAround(pts: [number, number][], pad = 45): Box {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad
  const y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad
  let w = Math.max(x1 - x0, 150)
  let h = Math.max(y1 - y0, 110)
  const aspect = 4 / 3
  if (w / h > aspect) h = w / aspect
  else w = h * aspect
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  return [cx - w / 2, cy - h / 2, w, h]
}

/** The view for a step: the leg just travelled (previous stop to this one) plus this
 *  step's labels. In overview, the whole route. */
function viewFor(j: JourneyData, i: number, overview: boolean): Box {
  if (overview) return boxAround(routeSteps(j).map((x) => project(x.stop!) as [number, number]), 55)
  const step = j.steps[i]
  const pts: [number, number][] = []
  const prev = step.noRoute ? undefined : previousStop(j.steps, i)
  if (prev?.stop) pts.push(project(prev.stop) as [number, number])
  for (const a of step.areas) if (a.at) pts.push(project(a.at) as [number, number])
  if (step.stop) pts.push(project(step.stop) as [number, number])
  return boxAround(pts)
}

/** Glides the view when the target changes; jumps when the reader prefers reduced motion. */
function useAnimatedBox(target: Box): Box {
  const [box, setBox] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const start = from.current
    if (reduce || start.join(',') === target.join(',')) {
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

/** The map for one step, or with `overview` the whole route at once. */
function JourneyMap({ journey, step, overview = false }: { journey: JourneyData; step: number; overview?: boolean }) {
  const world = useWorld()
  const target = useMemo(() => viewFor(journey, step, overview), [journey, step, overview])
  const box = useAnimatedBox(target)
  const s = journey.steps[step]
  const unit = box[2] / 100 // one hundredth of the visible width

  // Overview colours every country on the route; a step colours only its own.
  const fills = new Map<string, string>()
  const areaSource = overview ? journey.steps.filter((x) => !x.noRoute) : [s]
  for (const x of areaSource) for (const a of x.areas) if (!fills.has(a.iso)) fills.set(a.iso, FILL[a.color])

  const stops = overview ? routeSteps(journey) : s.noRoute ? [] : journey.steps.slice(0, step + 1).filter((x) => x.stop && !x.noRoute)
  const pts = stops.map((x) => project(x.stop!) as [number, number])
  const route = pts.length > 1 ? `M ${pts[0][0]} ${pts[0][1]} ` + pts.slice(1).map((p, k) => arc(pts[k], p)).join(' ') : ''
  const prev = overview || s.noRoute ? undefined : previousStop(journey.steps, step)

  return (
    <div className="sticker overflow-hidden bg-[#eef1f7]" style={{ aspectRatio: '4 / 3' }}>
      {!world ? (
        <div className="flex h-full items-center justify-center"><Loading /></div>
      ) : (
        <svg viewBox={box.join(' ')} className="block h-full w-full" role="img"
          aria-label={overview ? `Map of the route: ${stops.map((x) => x.form).join(', ')}` : `Map: ${s.areas.map((a) => a.label).filter(Boolean).join(', ')}`}>
          {world.map((c) => (
            <path key={c.id} d={c.d} fill={fills.get(c.id) ?? '#dcdde6'} stroke={fills.has(c.id) ? '#16161d' : '#ffffff'}
              strokeWidth={fills.has(c.id) ? unit * 0.28 : unit * 0.12} strokeLinejoin="round" />
          ))}
          {route && (
            <path d={route} fill="none" stroke="#16161d" strokeWidth={unit * 0.45} strokeDasharray={`${unit * 1.4} ${unit * 1.1}`} strokeLinecap="round" />
          )}
          {pts.map((p, k) => (
            <circle key={k} cx={p[0]} cy={p[1]} r={unit * (!overview && k === pts.length - 1 ? 1.3 : 0.9)}
              fill={!overview && k === pts.length - 1 ? 'var(--sticker-yellow)' : '#ffffff'} stroke="#16161d" strokeWidth={unit * 0.35} />
          ))}
          {overview
            ? (() => {
                // Try above, below, right, then left of each stop; skip a label that still
                // collides. The full route is spelled out in the chips under the map.
                const size = unit * 2.7
                const placed: [number, number, number, number][] = []
                const hits = (b: [number, number, number, number]) =>
                  placed.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])
                return stops.map((x, k) => {
                  const text = x.form ?? ''
                  const w = text.length * size * 0.56 + size * 0.9
                  const h = size * 1.5
                  const [px, py] = pts[k]
                  const spots: [number, number][] = [
                    [px, py - unit * 3.4], [px, py + unit * 3.4], [px + w / 2 + unit * 1.5, py], [px - w / 2 - unit * 1.5, py],
                  ]
                  for (const [cx, cy] of spots) {
                    const b: [number, number, number, number] = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]
                    if (!hits(b)) {
                      placed.push(b)
                      return <Label key={k} x={cx} y={cy} text={text} size={size} />
                    }
                  }
                  return null
                })
              })()
            : (
              <>
                {prev?.form && (() => {
                  const [px, py] = project(prev.stop!)
                  return <Label x={px} y={py - unit * 3.4} text={prev.form} size={unit * 2.8} faded />
                })()}
                {s.areas.filter((a) => a.label && a.at).map((a, k) => {
                  const [px, py] = project(a.at!)
                  return <Label key={k} x={px} y={py} text={a.label!} size={unit * (s.noRoute ? 2.3 : 3.8)} />
                })}
              </>
            )}
        </svg>
      )}
    </div>
  )
}

/** The whole route as a row of chips: every form, every language, in order. */
function RouteChips({ journey, current }: { journey: JourneyData; current?: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-1">
      {journey.steps.map((x, i) => ({ x, i })).filter(({ x }) => x.form).map(({ x, i }, k) => (
        <li key={i} className="flex items-center gap-1">
          {k > 0 && <span aria-hidden="true" className="text-sm font-extrabold">→</span>}
          <span className={`rounded-full border-2 border-[#16161d] px-2 py-0.5 text-xs font-bold ${i === current ? 'bg-[var(--sticker-yellow)] text-[#16161d]' : ''}`}>
            {x.form} <span className="font-semibold opacity-70">{x.lang}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

// ---------------------------------------------------------------------------------------
// The journeys feed: scroll through every word that has a map, one card per step.
// Each word opens with its whole route, then one card for every leg of the trip.

type Card =
  | { kind: 'intro'; journey: JourneyData; key: string }
  | { kind: 'step'; journey: JourneyData; step: number; leg: number; legs: number; key: string }

function buildCards(): Card[] {
  const cards: Card[] = []
  for (const j of JOURNEYS) {
    cards.push({ kind: 'intro', journey: j, key: `${j.id}-intro` })
    j.steps.forEach((_, i) => cards.push({ kind: 'step', journey: j, step: i, leg: i + 1, legs: j.steps.length, key: `${j.id}-${i}` }))
  }
  return cards
}
const CARDS = buildCards()

function IntroCard({ journey, index }: { journey: JourneyData; index: number }) {
  const legs = routeSteps(journey).length
  return (
    <>
      <p className="text-sm font-bold uppercase tracking-wide text-[var(--sticker-coral)]">Word journey {index + 1} of {JOURNEYS.length}</p>
      <h2 className="headword text-5xl leading-none">{journey.word}</h2>
      <p className="headword text-lg leading-tight">{journey.title}</p>
      <div className="mt-1"><JourneyMap journey={journey} step={0} overview /></div>
      <RouteChips journey={journey} />
      <p className="mt-auto flex items-center gap-1 text-sm font-bold">
        <ChevronsDown size={18} aria-hidden /> Scroll to travel all {legs} stops
      </p>
    </>
  )
}

function StepCard({ journey, step, leg, legs }: { journey: JourneyData; step: number; leg: number; legs: number }) {
  const s = journey.steps[step]
  const prev = s.noRoute ? undefined : previousStop(journey.steps, step)
  return (
    <>
      <p className="flex items-center justify-between text-sm font-bold">
        <span className="uppercase tracking-wide text-[var(--sticker-coral)]">{journey.word}</span>
        <span className="tabular-nums">Step {leg} of {legs}</span>
      </p>
      {/* The leg itself: where the word was, and where it went next. */}
      <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
        {prev?.form ? (
          <>
            <span className="rounded-full border-2 border-[#16161d] px-2 py-0.5">{prev.form} <span className="opacity-70">{prev.lang}</span></span>
            <ArrowRight size={16} aria-hidden />
            <span className="rounded-full border-2 border-[#16161d] bg-[var(--sticker-yellow)] px-2 py-0.5 text-[#16161d]">{s.form} <span className="opacity-70">{s.lang}</span></span>
          </>
        ) : s.form ? (
          <span className="rounded-full border-2 border-[#16161d] bg-[var(--sticker-yellow)] px-2 py-0.5 text-[#16161d]">Starts as {s.form} <span className="opacity-70">{s.lang}</span></span>
        ) : (
          <span className="rounded-full border-2 border-[#16161d] px-2 py-0.5">Where it ended up</span>
        )}
      </p>
      <h2 className="headword text-xl leading-tight sm:text-2xl">{s.headline}</h2>
      <JourneyMap journey={journey} step={step} />
      {s.key && (
        <ul className="flex flex-wrap gap-3 text-xs font-semibold">
          {s.key.map((k) => (
            <li key={k.text} className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-[#16161d]" style={{ background: FILL[k.color] }} />
              {k.text}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[15px] leading-snug">{s.text}</p>
      {step === legs - 1 && (
        <a href={`#/w/${journey.word}`} className="sticker bg-purple mt-auto self-start px-4 py-2 font-extrabold">Open the word page</a>
      )}
    </>
  )
}

/** The feed. `start` scrolls to a word's first card. */
function JourneyFeed({ start }: { start?: string }) {
  const scroller = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)

  // Jump to the requested word once, on arrival.
  useEffect(() => {
    if (!start) return
    const i = CARDS.findIndex((c) => c.kind === 'intro' && c.journey.id === start)
    if (i > 0) cardRefs.current[i]?.scrollIntoView({ block: 'start' })
  }, [start])

  // Track which card is on screen, to draw nearby maps and light up the word bar.
  useEffect(() => {
    const root = scroller.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
      },
      { root, threshold: 0.55 },
    )
    cardRefs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  const activeWord = CARDS[active]?.journey.id
  const jump = (id: string) => {
    const i = CARDS.findIndex((c) => c.kind === 'intro' && c.journey.id === id)
    cardRefs.current[i]?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  return (
    <div className="fixed inset-x-0 bottom-[5.75rem] top-[4.5rem] z-[5] bg-[var(--color-page)] sm:bottom-0 sm:top-[5rem]">
      <div className="mx-auto flex h-full max-w-3xl flex-col px-4">
        <nav aria-label="Words with maps" className="flex shrink-0 gap-2 overflow-x-auto pb-2">
          {JOURNEYS.map((j) => (
            <button key={j.id} type="button" onClick={() => jump(j.id)} aria-current={j.id === activeWord ? 'true' : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-extrabold ${j.id === activeWord ? 'bg-[var(--color-ink)] text-[var(--color-page)]' : 'border-2 border-[var(--color-ink)]'}`}>
              {j.word}
            </button>
          ))}
        </nav>
        <div ref={scroller} className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain">
          {CARDS.map((c, i) => (
            <section key={c.key} data-index={i} ref={(el) => { cardRefs.current[i] = el }}
              aria-label={c.kind === 'intro' ? `${c.journey.word}: the whole route` : `${c.journey.word}, step ${c.leg}`}
              className="flex h-full snap-start flex-col gap-2 overflow-hidden py-2">
              {/* Only cards near the screen draw their maps; the rest keep their space. */}
              {Math.abs(i - active) <= 1 ? (
                c.kind === 'intro'
                  ? <IntroCard journey={c.journey} index={JOURNEYS.indexOf(c.journey)} />
                  : <StepCard journey={c.journey} step={c.step} leg={c.leg} legs={c.legs} />
              ) : (
                <p className="headword text-2xl">{c.journey.word}</p>
              )}
            </section>
          ))}
          <section className="flex h-full snap-start flex-col items-center justify-center gap-3 text-center">
            <p className="headword text-2xl">That is every word with a map, for now.</p>
            <a href="#/stories" className="sticker bg-yellow px-4 py-2 font-extrabold">Read word stories instead</a>
          </section>
        </div>
      </div>
    </div>
  )
}

export function JourneysPage() {
  return <JourneyFeed />
}

export function JourneyPage({ id }: { id: string }) {
  return <JourneyFeed key={id} start={id} />
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
