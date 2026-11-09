import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, MapPinned } from 'lucide-react'
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

/** How long the camera and the dotted line take to travel one leg. */
const MOVE_MS = 1100

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
      const t = Math.min(1, (now - t0) / MOVE_MS)
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

/** A point along the arc from a to b, t from 0 to 1 (the same curve `arc` draws). */
function alongArc(a: [number, number], b: [number, number], t: number): [number, number] {
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2
  const c: [number, number] = [mx - (b[1] - a[1]) * 0.18, my + (b[0] - a[0]) * 0.18]
  const u = 1 - t
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]
}

/** The first part of the arc, up to t, as path commands. */
function partialArc(a: [number, number], b: [number, number], t: number): string {
  const n = Math.max(2, Math.ceil(40 * t))
  let d = ''
  for (let k = 1; k <= n; k++) {
    const p = alongArc(a, b, (t * k) / n)
    d += ` L ${p[0]} ${p[1]}`
  }
  return d
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

/**
 * The map. `step` is where the reader is; `progress` (0 to 1) is how far the dotted
 * line has travelled from the previous stop to this one. The new country fills in and
 * its word appears as the line arrives. With `overview`, the whole trip at once.
 */
function JourneyMap({ journey, step, progress = 1, overview = false }: { journey: JourneyData; step: number; progress?: number; overview?: boolean }) {
  const world = useWorld()
  const target = useMemo(() => viewFor(journey, step, overview), [journey, step, overview])
  const box = useAnimatedBox(target)
  const s = journey.steps[step]
  const unit = box[2] / 100 // one hundredth of the visible width
  const arrive = clamp01((progress - 0.6) / 0.4) // the last stretch of the leg

  // Countries. Overview colours the whole route at full strength. On a step, the new
  // country fades in as the line lands, the country just left eases to a lighter
  // "visited" shade as the line departs, and every earlier stop stays lightly coloured:
  // a trail of where the word has been. Nothing disappears mid-leg.
  const VISITED = 0.4
  const fills = new Map<string, { color: string; opacity: number }>()
  if (overview) {
    for (const x of journey.steps.filter((y) => !y.noRoute)) for (const a of x.areas) if (!fills.has(a.iso)) fills.set(a.iso, { color: FILL[a.color], opacity: 1 })
  } else {
    if (!s.noRoute) {
      const left = previousStop(journey.steps, step)
      journey.steps.slice(0, step).forEach((x) => {
        if (x.noRoute) return
        const opacity = x === left ? 1 - (1 - VISITED) * clamp01(progress / 0.6) : VISITED
        for (const a of x.areas) fills.set(a.iso, { color: FILL[a.color], opacity })
      })
    }
    // The current stop wins over the trail when they share a country.
    for (const a of s.areas) {
      const trail = fills.get(a.iso)
      fills.set(a.iso, { color: FILL[a.color], opacity: Math.max(arrive, trail && trail.color === FILL[a.color] ? trail.opacity : 0) })
    }
  }

  const stops = overview ? routeSteps(journey) : s.noRoute ? [] : journey.steps.slice(0, step + 1).filter((x) => x.stop && !x.noRoute)
  const pts = stops.map((x) => project(x.stop!) as [number, number])
  // Every finished leg in full; the newest leg only as far as the line has got.
  let route = ''
  let tip: [number, number] | null = null
  if (pts.length > 1) {
    route = `M ${pts[0][0]} ${pts[0][1]} `
    route += pts.slice(1, -1).map((p, k) => arc(pts[k], p)).join(' ')
    const a = pts[pts.length - 2]
    const b = pts[pts.length - 1]
    const t = overview ? 1 : progress
    route += partialArc(a, b, t)
    tip = overview || t >= 1 ? null : alongArc(a, b, t)
  }
  const prev = overview || s.noRoute ? undefined : previousStop(journey.steps, step)

  return (
    <div className="sticker overflow-hidden bg-[#eef1f7]" style={{ aspectRatio: '4 / 3' }}>
      {!world ? (
        <div className="flex h-full items-center justify-center"><Loading /></div>
      ) : (
        <svg viewBox={box.join(' ')} className="block h-full w-full" role="img"
          aria-label={overview ? `Map of the whole trip: ${stops.map((x) => x.form).join(', ')}` : `Map: ${s.areas.map((a) => a.label).filter(Boolean).join(', ')}`}>
          {world.map((c) => {
            const fill = fills.get(c.id)
            return (
              <g key={c.id}>
                <path d={c.d} fill="#dcdde6" stroke="#ffffff" strokeWidth={unit * 0.12} strokeLinejoin="round" />
                {fill && fill.opacity > 0 && (
                  <path d={c.d} fill={fill.color} stroke="#16161d" strokeWidth={unit * 0.28} strokeLinejoin="round" opacity={fill.opacity} />
                )}
              </g>
            )
          })}
          {route && (
            <path d={route} fill="none" stroke="#16161d" strokeWidth={unit * 0.5} strokeDasharray={`${unit * 1.4} ${unit * 1.1}`} strokeLinecap="round" />
          )}
          {pts.map((p, k) => {
            const isNew = !overview && k === pts.length - 1
            if (isNew && pts.length > 1 && progress < 1) return null // not arrived yet
            return (
              <circle key={k} cx={p[0]} cy={p[1]} r={unit * (isNew ? 1.3 : 0.9)}
                fill={isNew ? 'var(--sticker-yellow)' : '#ffffff'} stroke="#16161d" strokeWidth={unit * 0.35} />
            )
          })}
          {/* The traveller: rides the front of the line while it moves. */}
          {tip && <circle cx={tip[0]} cy={tip[1]} r={unit * 1.5} fill="var(--sticker-yellow)" stroke="#16161d" strokeWidth={unit * 0.4} />}
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
                <g opacity={arrive}>
                  {s.areas.filter((a) => a.label && a.at).map((a, k) => {
                    const [px, py] = project(a.at!)
                    return <Label key={k} x={px} y={py} text={a.label!} size={unit * (s.noRoute ? 2.3 : 3.8)} />
                  })}
                </g>
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
// The journeys feed: one screen per word, scrolled vertically. On each screen the reader
// swipes sideways to travel: the dotted line draws itself to the next country, the camera
// follows it, and the country fills in when the line arrives. The last swipe shows the
// whole trip. No geography needed: you follow the line instead of knowing the route.

/**
 * Runs the dotted line from 0 to 1 whenever `step` moves forward; jumps when it moves back.
 * The value is derived during render, so the very first frame after a swipe already starts
 * at 0: the destination never flashes in before the line has travelled.
 */
function useLegProgress(step: number): number {
  // done: the last step whose leg finished; target: the step a running leg is heading to.
  const [state, setState] = useState({ done: step, target: step, progress: 1 })
  const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (step === state.done) return
    if (step < state.done || reduce) {
      setState({ done: step, target: step, progress: 1 })
      return
    }
    let frame = 0
    const t0 = performance.now()
    const from = state.done
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / MOVE_MS)
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      setState(t < 1 ? { done: from, target: step, progress: eased } : { done: step, target: step, progress: 1 })
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  if (step === state.done) return state.progress
  if (step === state.target) return state.progress // this leg is already under way
  // A new step this render: forward starts at the very beginning of the leg; backward, or
  // reduced motion, is already there.
  return step > state.done && !reduce ? 0 : 1
}

function WordJourney({ journey, index }: { journey: JourneyData; index: number }) {
  // Slides: every step, then one more for the whole trip.
  const slides = journey.steps.length + 1
  const [slide, setSlide] = useState(0)
  const overview = slide === journey.steps.length
  const step = overview ? journey.steps.length - 1 : slide
  const progress = useLegProgress(slide)
  const s = journey.steps[step]
  const prev = overview || s.noRoute ? undefined : previousStop(journey.steps, step)
  const go = (d: number) => setSlide((n) => Math.max(0, Math.min(slides - 1, n + d)))

  // Sideways swipes travel; vertical movement is left to the page (touch-action: pan-y).
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const from = swipe.current
    swipe.current = null
    if (!from) return
    const dx = e.clientX - from.x
    const dy = e.clientY - from.y
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(dx < 0 ? 1 : -1)
  }

  return (
    <>
      <p className="flex items-center justify-between text-sm font-bold">
        <span className="uppercase tracking-wide text-[var(--sticker-coral)]">Word journey {index + 1} of {JOURNEYS.length}</span>
        <a href={`#/w/${journey.word}`} className="underline">word page</a>
      </p>
      <h2 className="headword text-4xl leading-none">{journey.word}</h2>

      {/* Where the word was, and where it is going. */}
      <p className="flex min-h-8 flex-wrap items-center gap-1.5 text-sm font-bold">
        {overview ? (
          <span className="rounded-full border-2 border-[#16161d] bg-[var(--sticker-yellow)] px-2 py-0.5 text-[#16161d]">The whole trip</span>
        ) : prev?.form ? (
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

      <div onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { swipe.current = null }}
        className="select-none" style={{ touchAction: 'pan-y' }}>
        <JourneyMap journey={journey} step={step} progress={overview ? 1 : progress} overview={overview} />
      </div>

      {/* Dots: one per stop, plus the whole trip. Arrows for anyone who cannot swipe. */}
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => go(-1)} disabled={slide === 0} aria-label="Previous stop"
          className="sticker flex h-10 w-10 items-center justify-center bg-[var(--color-card)] text-[var(--color-ink)] disabled:opacity-30">
          <ArrowLeft size={18} aria-hidden />
        </button>
        <ol className="flex flex-1 flex-wrap items-center justify-center gap-1.5" aria-label="Stops">
          {Array.from({ length: slides }, (_, i) => (
            <li key={i}>
              <button type="button" onClick={() => setSlide(i)} aria-label={i === slides - 1 ? 'The whole trip' : `Stop ${i + 1}`}
                aria-current={i === slide ? 'step' : undefined}
                className={`block h-3 rounded-full border-2 border-[#16161d] ${i === slide ? 'w-7 bg-[#16161d]' : i < slide ? 'w-3 bg-[var(--sticker-yellow)]' : 'w-3 bg-white'}`} />
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => go(1)} disabled={slide === slides - 1} aria-label="Next stop"
          className="sticker bg-yellow flex h-10 w-10 items-center justify-center disabled:opacity-30">
          <ArrowRight size={18} aria-hidden />
        </button>
      </div>

      {overview ? (
        <>
          <h3 className="headword text-xl leading-tight">{journey.title}</h3>
          <RouteChips journey={journey} />
        </>
      ) : (
        <>
          <h3 className="headword text-xl leading-tight" aria-live="polite">{s.headline}</h3>
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
        </>
      )}
      {slide === 0 && (
        <p className="mt-auto flex items-center gap-1 text-sm font-bold">
          <ArrowLeft size={16} aria-hidden /> Swipe the map to travel · scroll for the next word
        </p>
      )}
    </>
  )
}

/** The feed. `start` scrolls to a word's screen. */
function JourneyFeed({ start }: { start?: string }) {
  const scroller = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!start) return
    const i = JOURNEYS.findIndex((j) => j.id === start)
    if (i > 0) cardRefs.current[i]?.scrollIntoView({ block: 'start' })
  }, [start])

  // Track which word is on screen, to draw nearby maps and light up the word bar.
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

  return (
    <div className="fixed inset-x-0 bottom-[5.75rem] top-[4.5rem] z-[5] bg-[var(--color-page)] sm:bottom-0 sm:top-[5rem]">
      <div className="mx-auto flex h-full max-w-3xl flex-col px-4">
        <nav aria-label="Words with maps" className="flex shrink-0 gap-2 overflow-x-auto pb-2">
          {JOURNEYS.map((j, i) => (
            <button key={j.id} type="button" onClick={() => cardRefs.current[i]?.scrollIntoView({ block: 'start', behavior: 'smooth' })}
              aria-current={i === active ? 'true' : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-extrabold ${i === active ? 'bg-[var(--color-ink)] text-[var(--color-page)]' : 'border-2 border-[var(--color-ink)]'}`}>
              {j.word}
            </button>
          ))}
        </nav>
        <div ref={scroller} className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain">
          {JOURNEYS.map((j, i) => (
            <section key={j.id} data-index={i} ref={(el) => { cardRefs.current[i] = el }} aria-label={`${j.word}: its journey`}
              className="flex h-full snap-start flex-col gap-2 overflow-hidden py-2">
              {/* Only words near the screen draw their maps; the rest keep their space. */}
              {Math.abs(i - active) <= 1 ? <WordJourney journey={j} index={i} /> : <p className="headword text-4xl">{j.word}</p>}
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
