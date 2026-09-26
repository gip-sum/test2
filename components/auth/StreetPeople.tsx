import type { ReactNode } from 'react'

/**
 * The street's people: two neighbours, an old gentleman and the
 * chai-wallah. Drawn like the house-hunter — flat shapes, tokens only —
 * and choreographed in way-home.css on a forty-second cycle that is a
 * whole multiple of the taxi's and the rickshaw's, so who is where, and
 * when, is the same on every loop and can be tested.
 *
 * Each walker is drawn facing right with its feet at (0, 0): a wrapper
 * places it on its strip of pavement, and nested groups each do one job
 * (the path through the street, which way it faces, the stride, the
 * wave). Every walker waits off-stage in the still picture, so reduced
 * motion shows the street without anyone frozen mid-step; the
 * chai-wallah is simply at his counter.
 */

/** Legs that walk: two groups swinging from the hip in opposite phase. */
function StrideLegs({ prefix, children }: { prefix: string; children: (side: 'b' | 'f') => ReactNode }) {
  return (
    <>
      <g className={`wh-stride-b ${prefix}-leg`}>{children('b')}</g>
      <g className={`wh-stride-f ${prefix}-leg`}>{children('f')}</g>
    </>
  )
}

/** A neighbour home from the market: laal-paar sari, a jhola of greens. */
export function Neighbour() {
  return (
    <g transform="translate(0 536)">
      <g className="wh-p1">
        <g className="wh-figure">
          <ellipse className="wh-person-shadow" cx="0" cy="0.4" rx="10" ry="2" />
          <g className="wh-p-bob">
            {/* Walking feet, and standing feet for when she stops to talk. */}
            <g className="wh-p1-walking">
              <StrideLegs prefix="wh-p1">
                {(side) => (
                  <>
                    <path className={side === 'b' ? 'wh-p-shin-b' : 'wh-p-shin'} d="M0 -24 V-2" />
                    <path className="wh-p-sandal" d="M-2.4 -1.8 H3.6 Q5 -1.8 5 -0.4 V0.4 H-2.4 Z" />
                  </>
                )}
              </StrideLegs>
            </g>
            <g className="wh-p1-standing">
              <path className="wh-p-shin-b" d="M-2.4 -24 V-2" />
              <path className="wh-p-sandal" d="M-4.8 -1.8 H1.2 Q2.6 -1.8 2.6 -0.4 V0.4 H-4.8 Z" />
              <path className="wh-p-shin" d="M2.4 -24 V-2" />
              <path className="wh-p-sandal" d="M0 -1.8 H6 Q7.4 -1.8 7.4 -0.4 V0.4 H0 Z" />
            </g>
            <path className="wh-sari-p" d="M-7 -31 C-8.5 -20 -10.5 -10 -11.5 -4.5 H10.5 C9.5 -10 8 -20 6.5 -31 Z" />
            <path className="wh-sari-edge" d="M-11.5 -4.5 H10.5 L10.8 -2.6 H-11.8 Z" />
            <path className="wh-fold" d="M1 -30 L-0.2 -5" />
            <path className="wh-blouse" d="M-6 -31 C-6.5 -40 -5.5 -46 -3 -48 H4.5 C6.5 -46 7 -40 6.5 -31 Z" />
            <path className="wh-sari-p" d="M-4.5 -48 L4 -48 L6.5 -33 L-1 -31 Z" />
            <path className="wh-sari-line" d="M4 -48 L6.5 -33" />
            <g className="wh-p1-wave">
              <path className="wh-p-arm-b" d="M-2 -46 L-4 -34.5" />
            </g>
            <rect className="wh-skin" x="-0.6" y="-50.5" width="3" height="3.5" />
            <circle className="wh-skin" cx="1.2" cy="-53.5" r="4.8" />
            <path className="wh-hair" d="M-3.8 -54.6 C-3.4 -59.8 2 -61.2 5.6 -57.4 C3 -58.4 0 -58 -1.4 -55.4 Z" />
            <circle className="wh-hair" cx="-4.4" cy="-53.4" r="2.6" />
            <circle className="wh-bindi" cx="5.2" cy="-55.6" r="0.6" />
            <circle className="wh-eye-p" cx="3.9" cy="-54" r="0.55" />
            {/* The jhola, full of greens from the bazaar. */}
            <path className="wh-p-arm" d="M2 -46 L3.8 -35" />
            <path className="wh-jhola-handle" d="M2.4 -35 Q5.2 -39.5 8 -35" />
            <path className="wh-jhola" d="M1.4 -35 H10 L10.8 -22 H0.8 Z" />
            <path className="wh-greens" d="M4 -35 C3 -39 4.4 -41.4 5.6 -42.2 M6.6 -35 C7 -38.6 9 -40.2 10.2 -40.6 M8.6 -35 C9.4 -37 10.8 -37.8 12 -37.8" />
          </g>
        </g>
      </g>
    </g>
  )
}

/** Her son, off out: blue shirt, a bag slung across his back. */
export function YoungMan() {
  return (
    <g transform="translate(0 536)">
      <g className="wh-p2">
        <g className="wh-figure">
          <ellipse className="wh-person-shadow" cx="0" cy="0.4" rx="10" ry="2" />
          {/* Drawn facing right; he only ever walks left. */}
          <g className="wh-face-left">
            <g className="wh-p-bob">
              <StrideLegs prefix="wh-p2">
                {(side) => (
                  <>
                    <rect className={side === 'b' ? 'wh-jeans-b' : 'wh-jeans'} x="-3" y="-28" width="6" height="26.5" rx="3" />
                    <path className="wh-shoe" d="M-3.4 -3.2 H5 Q7.6 -3.2 7.6 -0.8 V0.5 H-3.4 Z" />
                  </>
                )}
              </StrideLegs>
              <rect className="wh-bag-p" x="-11" y="-38" width="7.5" height="9.5" rx="1.6" />
              <g className="wh-p2-swing">
                <path className="wh-shirt-arm-b" d="M-1 -51 Q-3 -44 -2.5 -38" />
              </g>
              <path className="wh-shirt" d="M-6 -53 Q0.5 -56.4 6.8 -53 L8.6 -26.5 Q0.5 -24.2 -8 -26.5 Z" />
              <path className="wh-strap-p" d="M-5 -52.5 L6 -30" />
              <rect className="wh-skin" x="-0.6" y="-58.4" width="3.4" height="5" />
              <circle className="wh-skin" cx="1.2" cy="-61.4" r="5.4" />
              <path className="wh-hair" d="M-4.4 -61.2 C-5.2 -67.4 3 -69.2 6.8 -64.2 C3.4 -65.4 -0.6 -65.2 -1.4 -61.4 C-2.2 -60 -3.4 -59.6 -4.4 -61.2 Z" />
              <circle className="wh-eye-p" cx="4.2" cy="-61.8" r="0.6" />
              <g className="wh-p2-wave">
                <g className="wh-p2-swing-f">
                  <path className="wh-shirt-arm" d="M1.5 -51 Q3 -44 2.5 -38" />
                  <circle className="wh-skin" cx="2.5" cy="-37" r="1.8" />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  )
}

/**
 * The old gentleman from the corner house: dhoti and kurta, spectacles,
 * a furled black umbrella on his arm. He walks the wall side of the
 * pavement, a little farther off than the others, so he is drawn at
 * 0.88 and passes behind the flame tree rather than through it.
 */
export function Babu() {
  return (
    <g transform="translate(0 523) scale(0.88)">
      <g className="wh-p3">
        <g className="wh-figure">
          <ellipse className="wh-person-shadow" cx="0" cy="0.4" rx="10" ry="2" />
          <g className="wh-p3-face">
            {/* Walking legs and standing legs; only one pair shows at a time,
                so he never treads the air while he stands and talks. */}
            <g className="wh-p3-walking">
              <StrideLegs prefix="wh-p3">
                {(side) => (
                  <>
                    <path className={side === 'b' ? 'wh-p-shin-b' : 'wh-p-shin'} d="M0 -26 L0.6 -1.8" />
                    <path className="wh-p-sandal" d="M-2.4 -1.8 H3.8 Q5.2 -1.8 5.2 -0.4 V0.4 H-2.4 Z" />
                  </>
                )}
              </StrideLegs>
            </g>
            <g className="wh-p3-standing">
              <path className="wh-p-shin-b" d="M-2 -26 V-1.8" />
              <path className="wh-p-sandal" d="M-4.4 -1.8 H1.8 Q3.2 -1.8 3.2 -0.4 V0.4 H-4.4 Z" />
              <path className="wh-p-shin" d="M2 -26 V-1.8" />
              <path className="wh-p-sandal" d="M-0.4 -1.8 H5.8 Q7.2 -1.8 7.2 -0.4 V0.4 H-0.4 Z" />
            </g>
            <path className="wh-dhoti" d="M-7 -34 C-8 -25 -9.5 -17 -10 -12.5 Q-0.5 -10.4 9.2 -12.5 C8.6 -18 7.6 -26 6.6 -34 Z" />
            <path className="wh-fold" d="M1 -33 C0.4 -25 1.6 -18 1 -11.6" />
            <g className="wh-p3-wave">
              <path className="wh-kurta-arm-b" d="M-1.5 -50 Q-3.5 -43 -3 -37.5" />
              <circle className="wh-skin-deep" cx="-3" cy="-36.4" r="1.7" />
            </g>
            <path className="wh-kurta" d="M-6.5 -52 Q0 -55.2 7 -52 L8.6 -28 Q0.6 -25.6 -7.6 -28 Z" />
            <path className="wh-fold" d="M1 -50 V-40" />
            <rect className="wh-skin" x="-0.4" y="-54.8" width="3.2" height="4" />
            <circle className="wh-skin" cx="1.2" cy="-58.6" r="5.1" />
            <path className="wh-grey-hair" d="M-4 -56.6 C-5 -61.4 -1 -64.2 2.2 -63.6 C-0.4 -62.6 -2.4 -60.4 -2.6 -56.2 Z" />
            <path className="wh-moustache" d="M3.4 -56.2 Q5 -57.2 6.2 -55.9" />
            <circle className="wh-specs" cx="4.3" cy="-59.2" r="1.5" />
            {/* The umbrella, hooked over the forearm. */}
            <path className="wh-kurta-arm" d="M1.5 -50 L5 -39.5" />
            <path className="wh-umbrella" d="M4 -35.5 L5.8 -35.5 L2.8 -9 L1.8 -9 Z" />
            <path className="wh-umbrella-line" d="M4.6 -40 Q7.2 -42.6 5.2 -44.6 M4.8 -39 L2.3 -7" />
            <circle className="wh-skin" cx="5" cy="-39" r="1.8" />
          </g>
        </g>
      </g>
    </g>
  )
}

/**
 * The chai-wallah on his stool behind the counter: head and shoulders
 * above it, a red gamchha over one shoulder. He wipes the counter now and
 * then, and raises a hand to the neighbours as they pass.
 */
export function ChaiWallah() {
  return (
    <g className="wh-vendor">
      <g className="wh-figure wh-figure-seated">
        {/* At rest: a hand on the counter behind the cups, the gamchha on his
            shoulder. While he wipes, both give way to the wiping arm below. */}
        <path className="wh-p-arm wh-vendor-rest" d="M92 491 L87.5 494" />
        <path className="wh-ganji" d="M91 495 Q91 490.4 95 489.6 H103 Q107 490.4 107 495 Z" />
        <path className="wh-gamchha wh-vendor-rest" d="M93 490 L96.8 489.6 L96 495 L92.6 495 Z" />
        <rect className="wh-skin" x="97.8" y="487" width="2.4" height="3" />
        <circle className="wh-skin" cx="99" cy="484.8" r="4.4" />
        <path className="wh-hair" d="M94.6 484.2 C94.4 479.6 103.6 479.2 103.5 484 C101.4 482.2 96.6 482.2 94.6 484.2 Z" />
        <path className="wh-moustache-dark" d="M97 486.8 Q99 485.7 101 486.8" />
        <circle className="wh-eye-p" cx="97.4" cy="484.4" r="0.55" />
        <circle className="wh-eye-p" cx="100.6" cy="484.4" r="0.55" />
        {/* His other arm, resting behind the counter's lip until he raises
            it: long enough, with a hand, that the wave reads on a phone. */}
        <g className="wh-vendor-wave">
          <path className="wh-p-arm" d="M106 491 L110.5 497.2" />
          <circle className="wh-skin" cx="110.8" cy="497.6" r="1.6" />
        </g>
        {/* The gamchha off his shoulder and across the counter in front of
            him, clear of the cups, where the wiping can be seen. */}
        <g className="wh-vendor-wiping">
          <g className="wh-vendor-wipe">
            <path className="wh-p-arm" d="M92.5 491 Q93.5 494 97.5 494.2" />
            <path className="wh-gamchha" d="M96 492.6 H103 L102.6 495.3 H95.6 Z" />
          </g>
        </g>
      </g>
    </g>
  )
}
