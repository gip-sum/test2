import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * A selected value, with the control that removes it.
 *
 * The remove button is a real button inside the chip rather than the whole
 * chip being clickable: a chip that removes itself on any click is a trap
 * for anyone who clicks to read it, and it gives a screen reader no way to
 * say what the click would do.
 */
export function Chip({
  label,
  onRemove,
  removeLabel,
  tone = 'brand',
}: {
  label: ReactNode
  onRemove?: () => void
  /** Full sentence for assistive tech: "Remove 2 BHK filter". */
  removeLabel?: string
  tone?: 'brand' | 'neutral'
}) {
  return (
    <span
      className={cn(
        'inline-flex h-8 max-w-full items-center gap-1 rounded-full py-0 pl-3 text-body-sm font-medium',
        onRemove ? 'pr-1' : 'pr-3',
        tone === 'brand' ? 'bg-brand-100 text-brand-600' : 'bg-surface-200 text-ink-700',
      )}
    >
      <span className="truncate">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? `Remove ${typeof label === 'string' ? label : 'filter'}`}
          className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-brand-600/15"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </span>
  )
}
