import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * A filter value that is on or off: property type, budget band, bedrooms.
 *
 * `aria-pressed`, because it re-runs a search (or stages one) rather than
 * waiting in a form. The pressed state is shown by fill, a 2px border, a
 * tick and weight, never colour alone.
 *
 * One primitive for the homepage's More filters and the results page's
 * filter rail and sheet (UI-13). They had drifted: the rail's copy was 40px
 * tall, under the 44px target, and showed "pressed" by colour only.
 *
 * `unavailable` (a value that would empty the results) is `aria-disabled`,
 * not `disabled`: a chip pressed off can come back with a zero count, and
 * disabling the control under the keyboard sends focus to <body> (UI-07).
 * The press is refused instead.
 */
export function ToggleChip({
  pressed,
  onToggle,
  unavailable = false,
  count,
  restoreKey,
  children,
}: {
  pressed: boolean
  onToggle: () => void
  unavailable?: boolean
  /** Results this value would give, from the server's facet counts. */
  count?: number
  /** A stable name for putting focus back if the page remounts (results filters, UI-15). */
  restoreKey?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      data-restore={restoreKey}
      aria-pressed={pressed}
      aria-disabled={unavailable || undefined}
      onClick={unavailable ? undefined : onToggle}
      className={cn(
        'inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-label transition-colors',
        pressed
          ? 'border-2 border-brand-600 bg-brand-100 px-[15px] font-semibold text-brand-700'
          : unavailable
            ? 'cursor-not-allowed border-border-subtle bg-surface-000 text-ink-500 opacity-55'
            : 'border-border-strong bg-surface-000 text-ink-900 hover:border-ink-500',
      )}
    >
      {pressed && (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
      {children}
      {count != null && <span className="text-caption font-normal text-ink-500 tabular">{count}</span>}
    </button>
  )
}
