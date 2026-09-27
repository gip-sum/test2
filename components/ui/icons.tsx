/**
 * Inline SVG icons — 24px grid, 1.75px stroke, `currentColor`.
 *
 * Deliberately not an icon font: icon fonts break under content blockers
 * and are invisible to screen readers. Every icon is decorative here
 * (aria-hidden); the accessible name lives on the control that wraps it.
 */
type IconProps = { className?: string }

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

export function HomeIcon({ className }: IconProps) {
  return <svg {...base} className={className}><path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9" /></svg>
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  )
}

export function HeartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 20s-7-4.4-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.6-7 9-7 9z" />
    </svg>
  )
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 6v12M6 12h12" />
    </svg>
  )
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  )
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="9" r="3.4" />
      <path d="M5.5 19.5c1-3.2 3.5-4.8 6.5-4.8s5.5 1.6 6.5 4.8" />
    </svg>
  )
}

export function KeyIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="12" r="3.6" />
      <path d="M11.6 12H20.5M17.5 12v3M20 12v2.2" />
    </svg>
  )
}

export function MapPinIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  )
}

/** Filter sliders — "more filters", not "sort". */
export function SlidersIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </svg>
  )
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function CalculatorIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path d="M8.5 7h7M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5v3M8.5 18h.01M12 18h.01" />
    </svg>
  )
}

/** A wallet — "what can I afford", as opposed to the calculator's "what will it cost". */
export function WalletIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7.5A2.5 2.5 0 016.5 5H17v3" />
      <rect x="4" y="8" width="16" height="11" rx="2.5" />
      <path d="M16 13.5h.01" />
    </svg>
  )
}

/** Three bars: the menu of every destination. */
export function MenuIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

/* ── Discovery hub (Phase C): one simple shape per kind of destination ── */

/** A block of flats. */
export function BuildingIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 21V4.5A1.5 1.5 0 016.5 3h7A1.5 1.5 0 0115 4.5V21M15 9h3.5A1.5 1.5 0 0120 10.5V21M3 21h18" />
      <path d="M8.5 7h3M8.5 11h3M8.5 15h3" />
    </svg>
  )
}

/** Floors stacked one on another: a builder floor. */
export function LayersIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3 3 7.5 12 12l9-4.5L12 3z" />
      <path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5" />
    </svg>
  )
}

/** A house with a tree beside it: a villa's garden. */
export function VillaIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2.5 11 9 6l6.5 5M4.5 9.5V20h9V9.5M7.5 20v-4.5h3V20" />
      <circle cx="18.5" cy="10.5" r="2.5" />
      <path d="M18.5 13v7M2 20h20" />
    </svg>
  )
}

/** One room, one window: a studio. */
export function StudioIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 14h16M9 14v-3.5h6V14" />
    </svg>
  )
}

/** A crane over a half-built frame: still being built. */
export function CraneIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 21V3M3 6h17M6 3l4 3M17 6v4" />
      <path d="M14 21v-6h6v6M3 21h18" />
    </svg>
  )
}

/** An open door: ready to move into. */
export function DoorIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 21V4.5A1.5 1.5 0 016.5 3h9A1.5 1.5 0 0117 4.5V21M3 21h18" />
      <path d="M13.5 12h.01" />
    </svg>
  )
}

/** A board on a post: the owner's own sign outside the home. */
export function SignpostIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="5" width="16" height="9" rx="1.5" />
      <path d="M12 14v7M12 3v2M9 21h6M8 9.5h8" />
    </svg>
  )
}

/** Four tiles: everything, laid out. */
export function GridIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  )
}

/** A house of its own, chimney and all — distinct from Home's outline. */
export function HouseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5M16 6.5V4h2v4.2" />
      <rect x="10" y="14" width="4" height="6" />
    </svg>
  )
}
