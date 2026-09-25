import type { PropertyTypeCode } from '@/lib/property/types'

/**
 * A small, distinct drawing per property type, so the type tiles read at a
 * glance instead of repeating one line illustration five times. Flat
 * shapes filled from tokens (the .type-art-* classes in globals.css).
 * Decorative: the tile's text names the type.
 */
export function PropertyTypeArt({ type }: { type: PropertyTypeCode }) {
  return (
    <svg viewBox="0 0 64 48" className="type-art" aria-hidden="true" focusable="false">
      <rect className="type-art-ground" x="2" y="44" width="60" height="2" rx="1" />
      {ART[type]}
    </svg>
  )
}

const windows = (xs: number[], ys: number[], w = 4, h = 4) =>
  ys.flatMap((y) => xs.map((x) => <rect key={`${x}-${y}`} className="type-art-window" x={x} y={y} width={w} height={h} rx="0.6" />))

const ART: Record<PropertyTypeCode, React.ReactNode> = {
  // A tower of flats.
  APARTMENT: <>
    <rect className="type-art-main" x="20" y="6" width="24" height="38" rx="1.5" />
    <rect className="type-art-accent" x="18" y="4" width="28" height="4" rx="1" />
    {windows([24, 30, 36], [11, 18, 25, 32])}
    <rect className="type-art-door" x="29" y="38" width="6" height="6" rx="0.6" />
  </>,
  // One house, one family.
  INDEPENDENT_HOUSE: <>
    <path className="type-art-roof" d="M14 24 L32 10 L50 24 Z" />
    <rect className="type-art-main" x="18" y="23" width="28" height="21" rx="1" />
    {windows([22, 38], [28], 5, 5)}
    <rect className="type-art-door" x="29" y="33" width="7" height="11" rx="0.8" />
  </>,
  // A low-rise block, a floor each, with balconies.
  BUILDER_FLOOR: <>
    <rect className="type-art-main" x="14" y="12" width="36" height="32" rx="1.5" />
    <rect className="type-art-accent" x="12" y="21" width="40" height="2.4" rx="1" />
    <rect className="type-art-accent" x="12" y="31" width="40" height="2.4" rx="1" />
    {windows([18, 27, 36, 44], [15, 25, 35], 3.5, 4)}
  </>,
  // A wide house in its own garden.
  VILLA: <>
    <circle className="type-art-leaf" cx="54" cy="33" r="6" />
    <rect className="type-art-trunk" x="53" y="37" width="2" height="7" />
    <path className="type-art-roof" d="M6 26 L20 15 L34 26 Z" />
    <path className="type-art-roof" d="M26 22 L37 13 L48 22 Z" />
    <rect className="type-art-main" x="9" y="25" width="23" height="19" rx="1" />
    <rect className="type-art-main" x="30" y="21" width="15" height="23" rx="1" />
    {windows([13, 23], [29], 5, 5)}
    <rect className="type-art-door" x="34" y="33" width="7" height="11" rx="0.8" />
  </>,
  // One room: bed, window, lamp.
  STUDIO: <>
    <rect className="type-art-wall" x="8" y="8" width="48" height="36" rx="2" />
    <rect className="type-art-window" x="36" y="13" width="14" height="11" rx="1" />
    <rect className="type-art-main" x="12" y="31" width="26" height="9" rx="1.5" />
    <rect className="type-art-accent" x="12" y="27" width="8" height="5" rx="1.2" />
    <rect className="type-art-trunk" x="44" y="30" width="1.6" height="12" />
    <path className="type-art-roof" d="M40.5 30 L49 30 L46.5 25 L43 25 Z" />
  </>,
}
