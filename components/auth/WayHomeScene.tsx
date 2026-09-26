import type { CSSProperties, ReactNode } from 'react'
import './way-home.css'
import { Babu, ChaiWallah, Neighbour, YoungMan } from './StreetPeople'

/**
 * "Finding your way home" — the login illustration.
 *
 * An evening lane in North Kolkata. A house-hunter stands by a tea stall
 * reading a map on their phone. A route plots itself across the lane; they
 * look up, gather themselves and walk it. At the last door a pin pops into
 * the sky, winds up and drops, and the street answers: windows light up
 * house by house, the lamp comes on, the double door swings open on warm
 * light, an alpana appears on the red-oxide step and the house cat comes
 * out to meet them. Then everything rests: breathing, a blink, a kite on
 * its string, steam off the kettle, the pin's slow halo.
 *
 * People live on it too (StreetPeople.tsx): a neighbour comes home from
 * the bazaar and the chai-wallah waves to her; later her son goes out;
 * an old gentleman walks up the street to wave to the newcomer at their
 * new door, and goes home again.
 *
 * The street lives around them. A yellow taxi drives past behind the
 * hunter while they wait at the kerb — the first thing that moves — and
 * comes back every twenty seconds; a cycle rickshaw passes the other way
 * in the far lane; the flame tree's leaves drift and lean in the taxi's
 * wake; tiny traffic crosses the far bridge; a few windows go dark and
 * light again. Speed follows distance — taxi, rickshaw, bridge, clouds —
 * which is what gives the flat drawing its depth.
 *
 * Built as one inline SVG with CSS keyframes (way-home.css): no video, no
 * animation library, nothing to download, server-rendered with the page.
 * Every colour is a token (the --wh-* block in app/globals.css).
 *
 * Three rules keep it honest across sizes and preferences:
 *  - The RESTING state is the finished picture. Each intro animation runs
 *    from an earlier state to the element's own style, so with
 *    prefers-reduced-motion (animations off) the scene is complete — lights
 *    on, door open, pin landed — never a blank or half-built frame.
 *  - The story sits in the bottom band (y ≥ 345). Phones crop the scene to
 *    that band (preserveAspectRatio="xMidYMax slice"); desktop shows the
 *    sky, bridge, kite and rooftops above it.
 *  - Animated parts carry absolute coordinates, never a `transform`
 *    attribute: a CSS transform replaces the attribute rather than
 *    composing with it. Wrappers that only position carry the attribute.
 *
 * Decorative: the login form beside it carries every word that matters.
 */

type Vars = Record<`--${string}`, string>
const vars = (values: Vars) => values as CSSProperties
const r1 = (n: number) => Math.round(n * 10) / 10

/** A window: open louvred shutters, frame, dark glass and the light that comes on. */
function Win({ x, y, w, h, d, arch = true, shutters = true, bars = false, twinkle, life }: {
  x: number; y: number; w: number; h: number
  /** When its light comes on, in seconds from page load. */
  d: number
  arch?: boolean
  shutters?: boolean
  bars?: boolean
  /** Start of this window's slow resting twinkle, if it has one. */
  twinkle?: number
  /** Someone at home: the light goes off for a while and comes back, from `start`, every `period` seconds. */
  life?: { start: number; period: number }
}) {
  const r = w / 2
  const inset = 2.2
  const shape = (i: number) => arch
    ? `M${x + i} ${y + h - i} V${y + r} A${r - i} ${r - i} 0 0 1 ${x + w - i} ${y + r} V${y + h - i} Z`
    : `M${x + i} ${y + i} H${x + w - i} V${y + h - i} H${x + i} Z`
  const shutterTop = arch ? y + r : y
  const style: Vars = { '--d': `${d}s` }
  if (twinkle) style['--t'] = `${twinkle}s`
  if (life) { style['--s'] = `${life.start}s`; style['--p'] = `${life.period}s` }
  const barPath = bars
    ? Array.from({ length: Math.max(2, Math.floor(w / 6)) }, (_, i) => {
        const bx = r1(x + ((i + 1) * w) / (Math.max(2, Math.floor(w / 6)) + 1))
        return `M${bx} ${arch ? y + r * 0.35 : y + 2} V${y + h - 2}`
      }).join(' ')
    : `M${x + r} ${arch ? y + r * 0.35 : y + 2} V${y + h - 2}`
  return (
    <g>
      {shutters && <>
        <rect className="wh-shutter" x={x - r - 1} y={shutterTop} width={r} height={y + h - shutterTop} />
        <rect className="wh-shutter" x={x + w + 1} y={shutterTop} width={r} height={y + h - shutterTop} />
      </>}
      <path className="wh-frame" d={shape(0)} />
      <path className="wh-glass" d={shape(inset)} />
      <path className={twinkle ? 'wh-lit wh-twinkle' : life ? 'wh-lit wh-switch' : 'wh-lit'} d={shape(inset)} style={vars(style)} />
      <path className="wh-bars" d={barPath} />
      <rect className="wh-sill" x={x - 2} y={y + h} width={w + 4} height={2.6} />
    </g>
  )
}

/** A wrought-iron balcony: rail, bars and the slab beneath. */
function Railing({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const bars = Array.from({ length: Math.floor(w / 5) }, (_, i) => `M${x + 2.5 + i * 5} ${y} V${y + h}`).join(' ')
  return (
    <g>
      <path className="wh-iron" d={bars} />
      <rect className="wh-iron-rail" x={x - 1} y={y - 1.5} width={w + 2} height={2.4} />
      <rect className="wh-trim" x={x - 3} y={y + h} width={w + 6} height={4} />
    </g>
  )
}

/** A house front that settles into place as the scene opens. */
function House({ d, children }: { d: number; children: ReactNode }) {
  return <g className="wh-rise" style={vars({ '--d': `${d}s` })}>{children}</g>
}

/**
 * A car wheel. The one white bar on the hubcap is what makes the turning
 * visible: a plain tyre and hub look the same at every angle, and a
 * symmetric pattern strobes at driving speed.
 */
function Wheel({ cx, cy, className }: { cx: number; cy: number; className: string }) {
  return (
    <g className={className}>
      <circle className="wh-tyre" cx={cx} cy={cy} r="7.5" />
      <circle className="wh-steel" cx={cx} cy={cy} r="4.4" />
      <path className="wh-hub-mark" d={`M${cx} ${cy - 0.8} H${cx + 3.9} V${cy + 0.8} H${cx} Z`} />
      <circle className="wh-tyre" cx={cx} cy={cy} r="1.3" />
      <circle className="wh-steel" cx={cx - 6.1} cy={cy} r="0.7" />
    </g>
  )
}

/** Krishnachura flowers come in clusters, not polka dots. */
function Blossom({ x, y }: { x: number; y: number }) {
  return (
    <>
      <circle className="wh-blossom" cx={x} cy={y} r="1.5" />
      <circle className="wh-blossom" cx={r1(x + 2.2)} cy={r1(y + 0.8)} r="1.2" />
      <circle className="wh-blossom-deep" cx={r1(x + 0.8)} cy={r1(y - 1.7)} r="1.1" />
    </>
  )
}

function cloud(x: number, y: number, s: number) {
  return `M${x} ${y} a${7 * s} ${7 * s} 0 0 1 ${6 * s} ${-8 * s} a${11 * s} ${11 * s} 0 0 1 ${19 * s} ${-4 * s} a${9 * s} ${9 * s} 0 0 1 ${15 * s} ${5 * s} a${6 * s} ${6 * s} 0 0 1 ${3 * s} ${7 * s} Z`
}

// The route: a cubic from the road at bottom-left to the pinned doorstep.
// Dots are spaced by arc length (precomputed) so they read as even steps.
const ROUTE_DOTS: [number, number][] = [
  [13.5, 597.9], [31.6, 596.6], [49.5, 594.7], [67.2, 592.2], [85, 589.1], [102.7, 585.6],
  [120.3, 581.7], [137.7, 577.7], [155.3, 573.4], [172.8, 569.1], [190.2, 564.8], [207.6, 560.5],
  [225.1, 556.4], [242.8, 552.5], [260.4, 548.9], [278.2, 545.6], [296, 543], [313.7, 540.9],
]

// The far bridge's top chord: a cantilever outline, stated as x → y.
function chordY(x: number) {
  const pts: [number, number][] = [[170, 320], [321, 258], [406, 290], [496, 258], [575, 305]]
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!
    const [x1, y1] = pts[i]!
    if (x <= x1) return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0)
  }
  return 305
}
const LATTICE = Array.from({ length: 28 }, (_, i) => {
  const x = 176 + i * 14
  return `${i === 0 ? 'M' : 'L'}${x} ${i % 2 ? 318 : r1(chordY(x) + 2)}`
}).join(' ')

// Marigold toran across the door, sagging on its thread.
const TORAN = Array.from({ length: 7 }, (_, i) => {
  const t = (i + 0.5) / 7
  const x = (1 - t) * (1 - t) * 354 + 2 * (1 - t) * t * 375 + t * t * 396
  const y = (1 - t) * (1 - t) * 451 + 2 * (1 - t) * t * 461 + t * t * 451
  return { x: r1(x), y: r1(y), deep: i % 2 === 1 }
})

const AWNING = (() => {
  let d = 'M18 466 H116 V474'
  for (let i = 0; i < 10; i++) {
    const x0 = 116 - i * 9.8
    d += ` Q${r1(x0 - 4.9)} 480.5 ${r1(x0 - 9.8)} 474`
  }
  return d + ' Z'
})()

const ALPANA_PETALS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2
  return { x: r1(375 + Math.cos(a) * 13.5), y: r1(523.6 + Math.sin(a) * 2.5), rot: r1((Math.atan2(Math.sin(a) * 2.5, Math.cos(a) * 13.5) * 180) / Math.PI) }
})

export function WayHomeScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 560 600"
      preserveAspectRatio="xMidYMax slice"
      className={`wh-scene ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="wh-sky-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="wh-stop-sky-top" />
          <stop offset="0.55" className="wh-stop-sky-mid" />
          <stop offset="0.78" className="wh-stop-sky-low" />
        </linearGradient>
        <linearGradient id="wh-dusk-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.2" className="wh-stop-dusk-clear" />
          <stop offset="0.74" className="wh-stop-dusk" />
        </linearGradient>
        <radialGradient id="wh-interior-g" cx="0.5" cy="0.62" r="0.7">
          <stop offset="0" className="wh-stop-light-core" />
          <stop offset="1" className="wh-stop-light" />
        </radialGradient>
        <linearGradient id="wh-spill-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="wh-stop-light" />
          <stop offset="1" className="wh-stop-light-clear" />
        </linearGradient>
        <pattern id="wh-louvre" width="4" height="3" patternUnits="userSpaceOnUse">
          <rect width="4" height="3" className="wh-louvre-a" />
          <rect y="2" width="4" height="1" className="wh-louvre-b" />
        </pattern>
        <pattern id="wh-stripes" width="12" height="10" patternUnits="userSpaceOnUse">
          <rect width="12" height="10" className="wh-stripe-a" />
          <rect width="6" height="10" className="wh-stripe-b" />
        </pattern>
      </defs>

      {/* ── Sky ─────────────────────────────────────────────────────── */}
      <rect width="560" height="600" fill="url(#wh-sky-g)" />
      <circle className="wh-sun" cx="430" cy="292" r="54" />
      <rect className="wh-dusk" width="560" height="600" fill="url(#wh-dusk-g)" />
      <path className="wh-cloud" style={vars({ '--d': '-6s' })} d={cloud(40, 176, 1.5)} />
      <path className="wh-cloud" style={vars({ '--d': '-17s' })} d={cloud(372, 232, 1.1)} />

      {/* A kite over the rooftops, on a string to the pink house's terrace. */}
      <path className="wh-string" d="M462 216 Q490 246 520 258" />
      <g className="wh-kite">
        <path className="wh-kite-body" d="M462 178 L475 197 L462 216 L449 197 Z" />
        <path className="wh-kite-spar" d="M462 178 V216 M449 197 H475" />
        <path className="wh-string" d="M462 216 Q457 226 463 234 T461 250" />
        <path className="wh-kite-bow" d="M459 227 l6 -2 l-1 5 Z M458 241 l6 -1 l-2 5 Z" />
      </g>

      {/* The far bridge: a cantilever silhouette over the river mist. */}
      <g className="wh-far">
        <rect x="170" y="318" width="400" height="5" />
        <rect x="318" y="256" width="7" height="66" />
        <rect x="492" y="256" width="7" height="66" />
        <path className="wh-far-line" d="M170 320 L321 258 L406 290 L496 258 L575 305" />
        <path className="wh-far-lattice" d={LATTICE} />
      </g>
      {/* Evening traffic on the far bridge: the slowest movers in the
          picture, because they are the farthest away. Seen only in the gap
          above the mint house; the other roofs hide the deck. */}
      <path className="wh-bridge-taxi" d="M0 318 V315.2 Q0 314 1.4 313.9 L3 313.8 L4.6 311.8 H9 L10.6 313.8 L12 313.9 Q13.2 314 13.2 315.2 V318 Z" />
      <g className="wh-bridge-bus">
        <rect className="wh-bridge-bus-body" x="0" y="311.2" width="19" height="6.8" rx="1.3" />
        <path className="wh-bridge-bus-glass" d="M2 313.2 H17" />
      </g>

      {/* ── House A: ochre, three storeys, a tea stall at its foot ──── */}
      <House d={0.05}>
        <rect className="wh-wall-ochre" x="-10" y="272" width="160" height="248" />
        <rect className="wh-trim" x="-12" y="266" width="164" height="8" />
        <rect className="wh-trim" x="-12" y="354" width="164" height="6" />
        <rect className="wh-trim" x="-12" y="438" width="164" height="6" />
        <rect className="wh-oxide" x="-10" y="512" width="160" height="8" />
        <Win x={14} y={288} w={26} h={52} d={6.4} />
        <Win x={84} y={288} w={26} h={52} d={6.34} life={{ start: 14, period: 26 }} />
        <Win x={18} y={368} w={30} h={62} d={6.22} twinkle={11.2} />
        <Win x={90} y={368} w={30} h={62} d={6.28} />
        <Railing x={6} y={404} w={128} h={26} />
        <rect className="wh-sign" x="16" y="446" width="112" height="8" rx="1" />
        <rect className="wh-rolling" x="18" y="454" width="108" height="66" />
        <path className="wh-rolling-lines" d={Array.from({ length: 15 }, (_, i) => `M18 ${458 + i * 4.2} H126`).join(' ')} />
      </House>

      {/* ── House B: cream, a water tank on the terrace ─────────────── */}
      <House d={0.13}>
        <rect className="wh-tank" x="256" y="266" width="30" height="28" rx="4" />
        <path className="wh-tank-ribs" d="M256 274 H286 M256 282 H286" />
        <rect className="wh-trim" x="252" y="292" width="38" height="3" />
        <rect className="wh-wall-cream" x="150" y="300" width="150" height="220" />
        <rect className="wh-trim" x="148" y="294" width="154" height="8" />
        <rect className="wh-trim" x="148" y="438" width="154" height="6" />
        <rect className="wh-oxide" x="150" y="512" width="150" height="8" />
        <Win x={164} y={370} w={24} h={50} d={6.14} life={{ start: 21, period: 31 }} />
        <Win x={213} y={370} w={24} h={50} d={6.06} twinkle={8.6} />
        <Win x={262} y={370} w={24} h={50} d={6.0} />
        <rect className="wh-trim" x="166" y="450" width="42" height="5" />
        {/* The neighbours' door: it opens on warm light to let her in and,
            later, her son out. Hinged on the left, like the mint house's. */}
        <rect className="wh-door-b-inside" fill="url(#wh-interior-g)" x="172" y="456" width="30" height="64" />
        <g className="wh-door-b">
          <rect className="wh-wood" x="172" y="456" width="30" height="64" />
          <path className="wh-wood-line" d="M187 458 V520 M175 470 H184 M190 470 H199 M175 496 H184 M190 496 H199" />
        </g>
        <Win x={234} y={462} w={44} h={36} d={6.04} arch={false} shutters={false} bars />
      </House>

      {/* ── House C: mint, the one the pin finds ─────────────────────── */}
      <House d={0.21}>
        <rect className="wh-wall-mint" x="300" y="330" width="150" height="190" />
        <rect className="wh-trim" x="296" y="326" width="158" height="7" />
        <path className="wh-baluster" d={Array.from({ length: 25 }, (_, i) => `M${303 + i * 6} 334 V345`).join(' ')} />
        <rect className="wh-trim" x="298" y="344" width="154" height="4" />
        <rect className="wh-clay" x="414" y="314" width="12" height="12" rx="1.5" />
        <path className="wh-leaves" d="M420 314 C416 306 418 300 420 297 C422 300 424 306 420 314 Z M420 314 C413 311 411 306 412 303 C415 305 418 309 420 314 Z M420 314 C427 311 429 306 428 303 C425 305 422 309 420 314 Z" />
        <rect className="wh-trim" x="296" y="436" width="158" height="6" />
        <rect className="wh-oxide" x="300" y="512" width="150" height="8" />
        <Win x={318} y={358} w={28} h={52} d={5.8} />
        <Win x={404} y={358} w={28} h={52} d={5.86} />
        <Railing x={312} y={396} w={40} h={14} />
        <Railing x={398} y={396} w={40} h={14} />
        <circle className="wh-frame" cx="375" cy="376" r="9" />
        <circle className="wh-glass" cx="375" cy="376" r="6.8" />
        <circle className="wh-lit" cx="375" cy="376" r="6.8" style={vars({ '--d': '5.83s' })} />
        <path className="wh-bars" d="M375 369.2 V382.8 M368.2 376 H381.8" />
        <Win x={314} y={460} w={26} h={40} d={5.92} shutters={false} bars />
        <Win x={410} y={460} w={26} h={40} d={5.96} shutters={false} bars />

        {/* The double door. Leaves swing inward (scaleX from the hinge)
            onto warm light; the interior is there all along. */}
        <path className="wh-door-frame" d="M349 520 V470 A26 26 0 0 1 401 470 V520 Z" />
        <path className="wh-interior" fill="url(#wh-interior-g)" d="M353 520 V470 A22 22 0 0 1 397 470 V520 Z" />
        <g className="wh-leaf-l">
          <path className="wh-leaf" d="M353 520 V470 A22 22 0 0 1 375 448 V520 Z" />
          <rect className="wh-leaf-panel" x="357" y="474" width="14" height="18" rx="1" />
          <rect className="wh-leaf-panel" x="357" y="497" width="14" height="18" rx="1" />
          <circle className="wh-brass" cx="371.5" cy="494" r="1.6" />
        </g>
        <g className="wh-leaf-r">
          <path className="wh-leaf" d="M397 520 V470 A22 22 0 0 0 375 448 V520 Z" />
          <rect className="wh-leaf-panel" x="379" y="474" width="14" height="18" rx="1" />
          <rect className="wh-leaf-panel" x="379" y="497" width="14" height="18" rx="1" />
          <circle className="wh-brass" cx="378.5" cy="494" r="1.6" />
        </g>
        <g className="wh-toran">
          <path className="wh-toran-thread" d="M354 451 Q375 461 396 451" />
          {TORAN.map((f, i) => (
            <g key={i}>
              {i % 2 === 0 && <path className="wh-toran-drop" d={`M${f.x} ${f.y} V${f.y + 6}`} />}
              {i % 2 === 0 && <circle className="wh-marigold" cx={f.x} cy={f.y + 7.5} r="1.9" />}
              <circle className={f.deep ? 'wh-marigold-deep' : 'wh-marigold'} cx={f.x} cy={f.y} r="2.5" />
            </g>
          ))}
        </g>
      </House>

      {/* ── House D: rose, a sari drying on the balcony ─────────────── */}
      <House d={0.29}>
        <rect className="wh-wall-rose" x="450" y="262" width="125" height="258" />
        <rect className="wh-trim" x="448" y="256" width="130" height="8" />
        <rect className="wh-trim" x="448" y="354" width="130" height="6" />
        <rect className="wh-trim" x="448" y="438" width="130" height="6" />
        <rect className="wh-oxide" x="450" y="512" width="125" height="8" />
        <Win x={466} y={280} w={28} h={50} d={6.24} twinkle={13.8} />
        <Win x={466} y={370} w={28} h={50} d={6.1} />
        <Win x={526} y={370} w={28} h={50} d={6.16} />
        <Win x={466} y={462} w={28} h={38} d={6.02} shutters={false} bars life={{ start: 27, period: 23 }} />
        <Railing x={508} y={312} w={62} h={28} />
        <g className="wh-sari">
          <path className="wh-sari-cloth" d="M522 311 H541 V356 Q531.5 360 522 356 Z" />
          <path className="wh-sari-border" d="M524.5 311 V355.5 M538.5 311 V355.5" />
        </g>
      </House>

      {/* Overhead wires, and a crow minding its business. */}
      <path className="wh-wire" d="M-10 306 Q130 330 262 316 Q392 302 570 318" />
      <path className="wh-wire" d="M-10 318 Q150 344 300 328 Q420 318 570 334" />
      <g className="wh-crow">
        {/* It faces the way it flies: turned about for the glide home. */}
        <g className="wh-crow-face">
          {/* Wings for flight; folded away while it perches. */}
          <g className="wh-crow-wings">
            <path className="wh-crow-wing" d="M204 313 Q199 301 191 297 Q200 298.5 211 311 Z" />
          </g>
          <path className="wh-crow-body" d="M200 316 Q206 309 213 311 L216 314 Q210 319 200 316 Z M200 316 L192 318 L195 314 Z" />
          <path className="wh-crow-leg" d="M205 316.5 V320.5 M209 316 V320" />
          <g className="wh-crow-head">
            <circle className="wh-crow-body" cx="214.5" cy="309" r="3.6" />
            <path className="wh-crow-nape" d="M211.5 307 Q212 312.5 214.5 312.6 Q211 313 210.8 309.5 Z" />
            <path className="wh-crow-beak" d="M217.6 308 L222.4 309.4 L217.6 310.6 Z" />
            <circle className="wh-crow-eye" cx="215.6" cy="308.2" r="0.7" />
          </g>
        </g>
      </g>

      {/* ── Street ──────────────────────────────────────────────────── */}
      <rect className="wh-pavement" x="0" y="518" width="560" height="22" />
      <path className="wh-joint" d={Array.from({ length: 20 }, (_, i) => `M${14 + i * 28} 520 V537`).join(' ')} />
      <rect className="wh-kerb" x="0" y="538" width="560" height="4" />
      <rect className="wh-road" x="0" y="542" width="560" height="58" />
      <path className="wh-track" d="M0 572 H560 M0 581 H560" />

      {/* Red-oxide steps, the light that spills over them, and the alpana
          drawn on the top step once the door opens. */}
      <rect className="wh-oxide" x="344" y="518" width="62" height="9" />
      <rect className="wh-oxide-deep" x="338" y="527" width="74" height="8" />
      <path className="wh-spill" fill="url(#wh-spill-g)" d="M353 519 H397 L428 541 H322 Z" />
      <g className="wh-alpana">
        <ellipse className="wh-alpana-line" cx="375" cy="523.6" rx="20" ry="3.3" style={vars({ '--d': '6.45s' })} />
        {ALPANA_PETALS.map((p, i) => (
          <ellipse
            key={i}
            className="wh-alpana-petal"
            cx={p.x}
            cy={p.y}
            rx="2.6"
            ry="0.95"
            style={vars({ '--d': `${r1(6.55 + i * 0.07)}s`, '--r': `${p.rot}deg` })}
          />
        ))}
        <ellipse className="wh-alpana-line" cx="375" cy="523.6" rx="6" ry="1.1" style={vars({ '--d': '7.1s' })} />
      </g>

      {/* The street lamp beside the door. */}
      <ellipse className="wh-lamp-pool" cx="446" cy="530" rx="24" ry="4.6" />
      <rect className="wh-post" x="444" y="436" width="4" height="84" />
      <rect className="wh-post" x="440" y="514" width="12" height="6" />
      <circle className="wh-lamp-halo" cx="446" cy="423" r="16" />
      <path className="wh-post" d="M439 434 L453 434 L451.2 420 L440.8 420 Z" />
      <path className="wh-post" d="M438 420.6 L454 420.6 L446 413 Z" />
      <path className="wh-glass" d="M441.6 432.2 L450.4 432.2 L449 422 L443 422 Z" />
      <path className="wh-lamp-glass" d="M441.6 432.2 L450.4 432.2 L449 422 L443 422 Z" />

      {/* The old gentleman walks the wall side, behind the tree. */}
      <Babu />

      {/* A krishnachura on the pavement. Its leaves drift in three layers
          at different speeds, and the whole tree leans a little in the
          air a passing taxi pushes ahead of it. */}
      <g className="wh-tree">
        <ellipse className="wh-tree-pit" cx="521" cy="538.2" rx="12" ry="1.9" />
        <path className="wh-trunk" d="M515.5 539 C517 518 518 496 517 478 C512 466 505 455 496 443 L499.5 440.5 C507 450 513 459 518.6 468 C519 458 519.5 446 518.5 433 L522.5 433 C523.5 446 523.2 457 522.6 467 C528 457 536 446 546 436.5 L549 439 C539.5 449 531 461 526 474 C524.5 494 525.5 518 527 539 Z" />
        {/* A krishnachura's crown is an umbrella: wide, flat-topped, lit
            on top, deep underneath, with flame-red flowers all over. */}
        <g className="wh-canopy">
          <g className="wh-clump wh-clump-back">
            {[[490, 428, 23, 12], [522, 421, 27, 14], [557, 425, 22, 13]].map(([cx, cy, rx, ry]) => (
              <ellipse key={`${cx}-${cy}`} className="wh-leaf-deep" cx={cx} cy={cy} rx={rx} ry={ry} />
            ))}
          </g>
          <g className="wh-clump wh-clump-mid">
            {[[500, 411, 21, 12], [531, 405, 25, 13], [561, 411, 17, 10]].map(([cx, cy, rx, ry]) => (
              <ellipse key={`${cx}-${cy}`} className="wh-leaf-mid" cx={cx} cy={cy} rx={rx} ry={ry} />
            ))}
            {[[487, 414], [503, 404], [522, 398], [540, 401], [556, 407], [571, 414], [512, 416], [549, 420]].map(([cx, cy]) => (
              <Blossom key={`${cx}-${cy}`} x={cx!} y={cy!} />
            ))}
          </g>
          <g className="wh-clump wh-clump-front">
            {[[480, 437, 12, 7], [511, 440, 16, 8], [546, 438, 16, 8], [518, 397, 15, 7], [546, 395, 10, 6]].map(([cx, cy, rx, ry]) => (
              <ellipse key={`${cx}-${cy}`} className="wh-leaf-light" cx={cx} cy={cy} rx={rx} ry={ry} />
            ))}
            {[[478, 434], [498, 441], [528, 442], [557, 437], [514, 393], [533, 391], [551, 394], [566, 432]].map(([cx, cy]) => (
              <Blossom key={`${cx}-${cy}`} x={cx!} y={cy!} />
            ))}
          </g>
        </g>
      </g>

      {/* The tea stall: kettle on the boil, clay cups, a bulb under the awning. */}
      <rect className="wh-wood-deep" x="22" y="474" width="2.6" height="56" />
      <rect className="wh-wood-deep" x="111.4" y="474" width="2.6" height="56" />
      <path fill="url(#wh-stripes)" className="wh-awning" d={AWNING} />
      <path className="wh-bulb-cord" d="M67 474 V478" />
      <circle className="wh-glass" cx="67" cy="480.5" r="2.4" />
      <circle className="wh-lit" cx="67" cy="480.5" r="2.4" style={vars({ '--d': '6.12s' })} />
      <ChaiWallah />
      <rect className="wh-wood" x="28" y="500" width="78" height="30" />
      <rect className="wh-wood-deep" x="24" y="495" width="86" height="6" />
      <path className="wh-wood-line" d="M28 512 H106 M54 501 V530 M80 501 V530" />
      <rect className="wh-clay-deep" x="40" y="488" width="17" height="7" rx="1" />
      <path className="wh-steel" d="M41 488 C40 480 44 476.5 48.5 476.5 C53 476.5 56.5 480 55.5 488 Z M54 482 L60.5 477 L61.5 478.5 L55.4 484.4 Z" />
      <path className="wh-steel-line" d="M42.5 479 C42.5 471.5 54.5 471.5 54.5 479" />
      <circle className="wh-steel" cx="48.5" cy="475" r="1.5" />
      <path className="wh-clay" d="M71 489 H77 L76 495 H72 Z M79 489 H85 L84 495 H80 Z M87 489 H93 L92 495 H88 Z" />
      <path className="wh-steam" style={vars({ '--d': '0.2s' })} d="M61 474 C58.5 470 63.5 466 61 461" />
      <path className="wh-steam" style={vars({ '--d': '1.25s' })} d="M63 473 C60.5 469 65.5 465 63 460" />
      <path className="wh-steam" style={vars({ '--d': '2.3s' })} d="M59.5 474 C57 470 62 466 59.5 461" />

      {/* The neighbours, on the kerb side of the pavement in front of the
          stall: she comes home, and later her son goes out. */}
      <Neighbour />
      <YoungMan />

      {/* The route, plotted one step at a time. */}
      {ROUTE_DOTS.map(([x, y], i) => (
        <circle key={i} className="wh-dot" cx={x} cy={y} r="2.3" style={vars({ '--d': `${r1(0.8 + i * 0.06)}s` })} />
      ))}

      {/* A yellow Ambassador taxi, the street's loudest mover. In the still
          picture it is parked here. In motion it is only ever seen driving:
          it passes just behind the house-hunter while they wait at the kerb,
          then comes back through every twenty seconds. Nested groups, one
          job each: the drive, the body's ride over the road, the wheels. */}
      <g className="wh-taxi">
        <ellipse className="wh-car-shadow" cx="500" cy="590.2" rx="59" ry="2.8" />
        <g className="wh-taxi-ride">
          <path className="wh-taxi-body" d="M444 580 V566 Q444 560 452 559 L468 558 L480 548 Q484 545 492 545 L520 545 Q527 545 531 549 L540 558 L550 559 Q556 560 556 566 V580 Z" />
          <path className="wh-taxi-glass" d="M484.5 549.5 Q486.5 548 492 548 H505 V558 H477 Z M508 548 H520 Q525 548 528 551 L534 558 H508 Z" />
          <circle className="wh-driver" cx="496.2" cy="551.4" r="2.6" />
          <path className="wh-driver" d="M491.2 558 Q491.8 554.4 496.2 554.2 Q500.6 554.4 501.2 558 Z" />
          <rect className="wh-taxi-sign" x="498" y="540" width="14" height="5" rx="1" />
          <rect className="wh-steel" x="442" y="575" width="116" height="3.2" rx="1.2" />
          <circle className="wh-lit" cx="447.5" cy="567.5" r="2.4" style={vars({ '--d': '6.08s' })} />
        </g>
        <Wheel cx={466} cy={582} className="wh-wheel wh-wheel-f" />
        <Wheel cx={534} cy={582} className="wh-wheel wh-wheel-r" />
      </g>

      {/* The pin: pops, winds up, drops, lands once — then only its halo moves. */}
      <circle className="wh-halo" cx="375" cy="442" r="10" />
      <circle className="wh-ripple" cx="375" cy="442" r="16" style={vars({ '--d': '5.67s' })} />
      <circle className="wh-ripple" cx="375" cy="442" r="16" style={vars({ '--d': '5.82s' })} />
      <path className="wh-rays" d="M375 428 V421 M385 432 L390 427 M389 442 H396 M365 432 L360 427 M361 442 H354 M385 452 L390 457 M365 452 L360 457" />
      <g className="wh-pin">
        <path className="wh-pin-body" d="M375 442 C375 442 358 422 358 410 A17 17 0 1 1 392 410 C392 422 375 442 375 442 Z" />
        <path className="wh-pin-glyph" d="M367.5 415 V408.8 L375 402.6 L382.5 408.8 V415 Z" />
        <rect className="wh-pin-door" x="373" y="409.4" width="4" height="5.6" rx="0.6" />
        <path className="wh-pin-shine" d="M363.2 404.5 A13 13 0 0 1 371.5 396.6" />
      </g>

      {/* The house cat comes out to see who it is. */}
      <g className="wh-cat">
        <path className="wh-tail wh-cat-tail" d="M423 532 C430 531 431 523 427 520" />
        <path className="wh-cat-fur" d="M410 534 C408 526 410 519 416 518 C422 518 425 525 424 534 Z" />
        <circle className="wh-cat-fur" cx="412" cy="514" r="4.6" />
        <path className="wh-cat-fur" d="M408.2 511.5 L408.6 506.2 L411.6 510 Z M412.8 509.7 L415.4 505.9 L416.4 511.2 Z" />
        <circle className="wh-cat-eye" cx="410.1" cy="513.6" r="0.75" />
        <circle className="wh-cat-eye" cx="413.2" cy="513.4" r="0.75" />
      </g>

      {/* The house-hunter. Nested groups, one job each: walk the route,
          bob with each step, gather (squash) before setting off. */}
      <g transform="translate(324 540)">
        <g className="wh-hunter">
          <g className="wh-figure">
            <ellipse className="wh-shadow" cx="0" cy="0.5" rx="13" ry="2.8" />
            <g className="wh-bob">
              <g className="wh-squash">
                <g className="wh-leg-b">
                  <rect className="wh-trouser-b" x="-3.2" y="-29" width="6.4" height="27" rx="3.2" />
                  <path className="wh-shoe" d="M-3.6 -3.4 H5.4 Q8 -3.4 8 -0.8 V0.6 H-3.6 Z" />
                </g>
                <g className="wh-arm-b">
                  <path className="wh-sleeve" d="M-1 -51 Q-3.5 -44 -3 -37.5" />
                  <circle className="wh-skin" cx="-3" cy="-35.8" r="2.2" />
                </g>
                <path className="wh-strap" d="M-1.5 -51 L-8 -38.5" />
                <rect className="wh-bag" x="-12.5" y="-40" width="8.5" height="10.5" rx="1.8" />
                <g className="wh-leg-f">
                  <rect className="wh-trouser" x="-3.2" y="-29" width="6.4" height="27" rx="3.2" />
                  <path className="wh-shoe" d="M-3.6 -3.4 H5.4 Q8 -3.4 8 -0.8 V0.6 H-3.6 Z" />
                </g>
                <path className="wh-tunic" d="M-6.5 -53 Q0.5 -56.5 7.5 -53 L10.5 -22.5 Q1 -19.8 -9.5 -22.5 Z" />
                <path className="wh-hem" d="M-9.3 -24.4 Q1 -21.8 10.3 -24.4" />
                <g className="wh-scarf">
                  <path className="wh-scarf-fill" d="M6 -55 C2 -55 -4 -53 -10 -48 C-13 -45.5 -15.5 -41 -16 -37 L-12.8 -36.6 C-12 -41 -9 -45 -5 -48.5 C-1.5 -51 2.5 -52 6.5 -52.2 Z" />
                  <path className="wh-scarf-fill" d="M5 -54 L8.6 -40.5 L5.8 -40 L3 -53 Z" />
                </g>
                <rect className="wh-skin" x="-0.8" y="-58.5" width="3.6" height="5" />
                <g className="wh-head">
                  <circle className="wh-hair" cx="-6.2" cy="-66.5" r="3.4" />
                  <circle className="wh-skin" cx="1" cy="-63.5" r="7.2" />
                  <path className="wh-skin" d="M7.9 -64.2 Q10.3 -62.3 8 -60.9 Z" />
                  <path className="wh-hair" d="M-6 -61 C-8.6 -67.8 -3.4 -72.6 2.6 -71.4 C6.4 -70.8 8.7 -68.2 8.5 -65.8 C5.6 -67.6 2 -67.8 -0.4 -66.2 C-1.6 -64.4 -2.2 -62.4 -6 -61 Z" />
                  <circle className="wh-skin-deep" cx="-1.8" cy="-62.6" r="1.6" />
                  <circle className="wh-brass" cx="-1.8" cy="-60.4" r="0.8" />
                  <path className="wh-brow" d="M3.2 -66.9 Q4.8 -67.7 6.4 -66.9" />
                  <ellipse className="wh-eye" cx="4.6" cy="-64" rx="0.9" ry="1.15" />
                  <path className="wh-smile" d="M4 -60.2 Q5.8 -58.8 7.3 -60.4" />
                </g>
                <g className="wh-arm-f">
                  <path className="wh-sleeve" d="M3.5 -52 L6 -43 L11.2 -47.2" />
                  <rect className="wh-phone" x="10.8" y="-55.2" width="4.4" height="7.4" rx="1" />
                  <rect className="wh-screen" x="11.5" y="-54.4" width="3" height="5.8" rx="0.4" />
                  <circle className="wh-skin" cx="12" cy="-48" r="2.2" />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>

      {/* A cycle rickshaw in the far lane, going the other way, as Kolkata's
          left-hand traffic would: smaller and slower than the taxi because
          it is farther off. Drawn at the left edge and kept off-stage by its
          own style, so the still picture does not include a passer-by. */}
      <g className="wh-rickshaw">
        <ellipse className="wh-car-shadow" cx="31" cy="563.4" rx="32" ry="1.9" />
        <g className="wh-rk-wheel wh-rk-wheel-r">
          <circle className="wh-rk-tyre" cx="13" cy="554" r="8.4" />
          <path className="wh-rk-spokes" d="M13 545.6 V562.4 M4.6 554 H21.4 M7.06 548.06 L18.94 559.94 M18.94 548.06 L7.06 559.94" />
        </g>
        <path className="wh-rk-frame" d="M13 554 L16 545 M27 543 L47 533 M47 529 L53 556.5 M44.5 527.5 H50.5" />
        <path className="wh-rk-panel" d="M2 537 H28 L26 546 H6 Z" />
        <rect className="wh-rk-seat" x="1.5" y="532.5" width="25" height="5" rx="1.5" />
        <path className="wh-rk-hood" d="M1 534 C-0.5 519 7 510.5 20 510.5 C24 510.5 27 511.5 28.5 513.5 L26.8 516.2 C22.5 514.2 10.5 514.5 7 520.5 C5 524.5 4.6 529.5 4.8 534 Z" />
        <path className="wh-rk-trim" d="M3 533 C2 521 8.5 513.8 20 513.3 C23.5 513.3 25.8 514 27.2 515" />
        <rect className="wh-rk-foot" x="26" y="544" width="9" height="2" rx="0.6" />
        <g className="wh-rk-wheel wh-rk-wheel-f">
          <circle className="wh-rk-tyre" cx="53" cy="556.5" r="6.3" />
          <path className="wh-rk-spokes" d="M53 550.2 V562.8 M46.7 556.5 H59.3 M48.55 552.05 L57.45 560.95 M57.45 552.05 L48.55 560.95" />
        </g>
        <g className="wh-rk-crank">
          <path className="wh-rk-crank-arm" d="M35.8 546 H42.2" />
        </g>
        <g className="wh-rider">
          <g className="wh-rk-leg wh-rk-leg-b">
            <path className="wh-rk-shin-b" d="M38 529 L44.5 537.5 L41 545.5" />
          </g>
          <rect className="wh-rk-saddle" x="34.5" y="528.8" width="7" height="2.2" rx="1" />
          <path className="wh-rk-vest" d="M34.5 529 C34 521 37 514.5 42.5 512.5 L46 514.5 C44.6 519.5 42.5 524 42 529.5 Z" />
          <path className="wh-rk-lungi" d="M33.8 526 H42.6 L46 534.5 Q41 537 37 535 Z" />
          <path className="wh-rk-arm" d="M43.5 515 L49.5 527.5" />
          <circle className="wh-rk-skin" cx="45.6" cy="508" r="3.6" />
          <path className="wh-rk-hair" d="M41.9 507.2 Q42 503.2 45.6 503.4 Q49 503.6 49.4 506.6 Q45.6 505 41.9 507.2 Z" />
          <path className="wh-rk-gamchha" d="M41.9 507.4 Q45.6 505.2 49.4 506.8 L49.5 508 Q45.6 506.6 42 508.7 Z" />
          <g className="wh-rk-leg wh-rk-leg-f">
            <path className="wh-rk-shin" d="M38.5 529 L45 537.5 L42 545.5" />
          </g>
        </g>
      </g>
    </svg>
  )
}
