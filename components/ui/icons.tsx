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
