/**
 * The 404 illustration: a house-hunter who has followed a link to nowhere.
 *
 * Pure SVG + CSS keyframes (see "404 scene" in app/globals.css). No image,
 * video or animation library: the scene costs a few kilobytes of markup,
 * renders on the server, scales to any width without a second asset, and
 * takes every colour from a token so it follows a palette change.
 *
 * The loop, ten seconds: look left, look right, walk toward the house, a
 * location pin drops onto it and lights the window — a hop of relief —
 * then the pin flickers out, the question mark returns and they walk back.
 *
 * Every animated group carries its geometry in absolute coordinates and
 * never a `transform` attribute: a CSS transform animation REPLACES the
 * attribute rather than composing with it, and the part would jump.
 * Static tufts sit in a positioned wrapper for the same reason.
 *
 * The resting pose — no animation applied — is itself a complete picture
 * (map in hand, question mark, pin hovering over the house). That is what
 * prefers-reduced-motion gets, not a blank frame.
 *
 * Decorative: the page's heading and copy say everything this does.
 */

const TUFTS = [
  { x: 64, delay: '0s' },
  { x: 214, delay: '-1.1s' },
  { x: 262, delay: '-2.3s' },
  { x: 392, delay: '-0.6s' },
  { x: 432, delay: '-1.7s' },
  { x: 566, delay: '-2.9s' },
  { x: 606, delay: '-0.3s' },
]

const SPARKS = [
  { x: 280, y: 118 },
  { x: 362, y: 128 },
  { x: 288, y: 196 },
  { x: 356, y: 192 },
]

function spark(x: number, y: number) {
  return `M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2} Z`
}

export function LostScene({ className }: { className?: string }) {
  return (
    // The viewBox starts just above the tallest resting part; the pin falls
    // in from above it, which `overflow: visible` lets it do.
    <svg viewBox="12 88 616 164" className={`nf-scene ${className ?? ''}`} aria-hidden="true" focusable="false">
      <defs>
        {/* A soft radial flash rather than a hard-edged disc. Stop colours
            come from CSS so they stay tokens. */}
        <radialGradient id="nf-glow-fill">
          <stop offset="0" className="nf-glow-stop-in" />
          <stop offset="1" className="nf-glow-stop-out" />
        </radialGradient>
      </defs>
      {/* Background forms: the reference's pale boulders, recast as soft hills. */}
      <path className="nf-fill-sunken" d="M34 240 Q38 178 82 176 Q124 178 128 240 Z" />
      <path className="nf-fill-sunken" d="M420 240 Q422 112 494 110 Q566 112 568 240 Z" />

      {/* Signpost: two boards, both saying HOME, pointing opposite ways. */}
      <rect className="nf-fill-forest" x="116" y="134" width="9" height="104" rx="3" />
      <g className="nf-sign-top">
        <path className="nf-board" d="M84 142 H152 L164 154 L152 166 H84 Z" />
        <text className="nf-board-text" x="118" y="158" textAnchor="middle">HOME</text>
      </g>
      <g className="nf-sign-bottom">
        <path className="nf-board" d="M156 174 H90 L78 186 L90 198 H156 Z" />
        <text className="nf-board-text" x="122" y="190" textAnchor="middle">HOME</text>
      </g>

      {/* Rocks and a bush. */}
      <path className="nf-fill-rock" d="M138 240 Q140 220 160 218 Q182 218 188 240 Z" />
      <path className="nf-fill-rock" d="M22 240 Q26 228 38 227 Q50 228 52 240 Z" />
      <path className="nf-fill-rock" d="M540 240 Q544 226 558 225 Q574 226 576 240 Z" />
      <circle className="nf-fill-leaf" cx="194" cy="233" r="9" />
      <circle className="nf-fill-leaf-dark" cx="205" cy="229" r="11" />
      <circle className="nf-fill-leaf" cx="216" cy="234" r="8" />

      {/* The house the pin keeps promising. */}
      <rect className="nf-fill-forest" x="514" y="154" width="10" height="24" rx="1.5" />
      <rect className="nf-house" x="452" y="184" width="76" height="54" rx="2" />
      <path className="nf-fill-forest" d="M440 190 L490 146 L540 190 Z" />
      <rect className="nf-window" x="460" y="198" width="16" height="14" rx="1.5" />
      <rect className="nf-window" x="504" y="198" width="16" height="14" rx="1.5" />
      <rect className="nf-window-light" x="460" y="198" width="16" height="14" rx="1.5" />
      <rect className="nf-window-light" x="504" y="198" width="16" height="14" rx="1.5" />
      <rect className="nf-fill-brand" x="482" y="208" width="16" height="30" rx="2" />
      <circle className="nf-fill-sunken" cx="494" cy="224" r="1.6" />

      {/* The pin: drops, lights the house, then flickers out — the 404. */}
      <ellipse className="nf-pulse" cx="490" cy="140" rx="20" ry="6" />
      <g className="nf-pin">
        <path className="nf-fill-brand" d="M490 136 C490 136 473 118 473 107 A17 17 0 1 1 507 107 C507 118 490 136 490 136 Z" />
        <circle className="nf-fill-surface" cx="490" cy="107" r="6.5" />
      </g>

      {/* Grass, swaying on its own slower clock. */}
      {TUFTS.map((tuft) => (
        <g key={tuft.x} className="nf-tuft-anchor" style={{ transform: `translate(${tuft.x}px, 240px)` }}>
          <g className="nf-grass" style={{ animationDelay: tuft.delay }}>
            <path d="M-3 0 Q-4 -9 -9 -14 M-1 0 Q-1 -12 -3 -20 M1 0 Q2 -11 5 -17 M3 0 Q5 -6 10 -10" />
          </g>
        </g>
      ))}

      {/* Ground. Drawn after the scenery so it crisply cuts every base. */}
      <path className="nf-ground" d="M8 240 Q320 232 632 240" />

      {/* The house-hunter. walk = horizontal travel; hop = vertical bob;
          the shadow walks but never hops, so it shrinks under a jump. */}
      <g className="nf-walk">
        <ellipse className="nf-shadow" cx="320" cy="241" rx="30" ry="4.5" />
        <g className="nf-hop">
          <ellipse className="nf-glow" cx="320" cy="170" rx="56" ry="74" fill="url(#nf-glow-fill)" />
          {SPARKS.map((s) => <path key={`${s.x}-${s.y}`} className="nf-spark" d={spark(s.x, s.y)} />)}

          {/* Legs and shoes */}
          <rect className="nf-fill-forest" x="305" y="192" width="12" height="42" rx="6" />
          <rect className="nf-fill-forest" x="323" y="192" width="12" height="42" rx="6" />
          <rect className="nf-fill-ink" x="298" y="229" width="20" height="9" rx="4.5" />
          <rect className="nf-fill-ink" x="322" y="229" width="20" height="9" rx="4.5" />

          {/* Kurta */}
          <path className="nf-fill-brand" d="M300 150 Q320 142 340 150 L347 206 Q320 212 293 206 Z" />
          <path className="nf-fill-mint" d="M312 146 L320 160 L328 146 Q320 143 312 146 Z" />

          {/* Head: turns from the neck; eyes move on their own. */}
          <g className="nf-head">
            <rect className="nf-fill-skin" x="315" y="136" width="10" height="13" rx="3" />
            <circle className="nf-fill-skin" cx="302" cy="126" r="4" />
            <circle className="nf-fill-skin" cx="320" cy="123" r="19" />
            <path className="nf-fill-hair" d="M301 121 Q299 100 321 100 Q343 100 340 121 Q336 110 322 110 Q308 110 301 121 Z" />
            <g className="nf-eyes">
              <circle className="nf-fill-ink" cx="313" cy="125" r="2.3" />
              <circle className="nf-fill-ink" cx="328" cy="125" r="2.3" />
            </g>
            <path className="nf-mouth" d="M315 133 Q320 136.5 325 133" />
          </g>

          {/* Arms holding a folded map, raised to read it. */}
          <g className="nf-map">
            <path className="nf-arm" d="M302 156 Q294 170 306 178" />
            <path className="nf-arm" d="M338 156 Q346 170 334 178" />
            <path className="nf-paper" d="M298 166 L312 170 L328 166 L342 170 L342 191 L328 187 L312 191 L298 187 Z" />
            <path className="nf-fold" d="M312 170 V191 M328 166 V187" />
            <path className="nf-route" d="M302 183 Q310 172 318 180 T336 174" />
            <circle className="nf-fill-supply" cx="336" cy="174" r="2.4" />
            <circle className="nf-fill-skin" cx="306" cy="179" r="5" />
            <circle className="nf-fill-skin" cx="334" cy="179" r="5" />
          </g>

          <text className="nf-question" x="352" y="104">?</text>
        </g>
      </g>
    </svg>
  )
}
