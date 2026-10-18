import type { MouseEvent, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * A selected value, with the control that removes it.
 *
 * The remove button is a real button inside the chip rather than the whole
 * chip being clickable: a chip that removes itself on any click is a trap
 * for anyone who clicks to read it, and it gives a screen reader no way to
 * say what the click would do.
 *
 * Where removing the value is navigation — a search filter, whose state is
 * the URL — pass `removeHref` as well: the control becomes a link to the
 * URL without that filter, so it works without JavaScript and opens in a new
 * tab on a modified click, while a plain click still runs `onRemove` (and
 * its in-place transition) instead of a full navigation (UI-06).
 */
export function Chip({
  label,
  onRemove,
  removeLabel,
  tone = 'brand',
  labelClassName,
  removeHref,
  className,
}: {
  label: ReactNode
  onRemove?: () => void
  /** The URL without this value, when removing it is navigation. */
  removeHref?: string
  className?: string
  /** Full sentence for assistive tech: "Remove 2 BHK filter". */
  removeLabel?: string
  tone?: 'brand' | 'neutral'
  /** Extra classes for the label, such as a narrower truncation width. */
  labelClassName?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-8 max-w-full items-center gap-1 rounded-full py-0 pl-3 text-body-sm font-medium',
        onRemove ? 'pr-1' : 'pr-3',
        tone === 'brand' ? 'bg-brand-100 text-brand-600' : 'bg-surface-200 text-ink-700',
        className,
      )}
    >
      <span className={cn('truncate', labelClassName)}>{label}</span>
      {onRemove && (
        <RemoveControl
          label={removeLabel ?? `Remove ${typeof label === 'string' ? label : 'filter'}`}
          onRemove={onRemove}
          href={removeHref}
        />
      )}
    </span>
  )
}

// The visible circle stays 24px; the control around it is 44×44 (the
// touch-target rule, UI-05), pulled back by negative margins so the chip
// keeps its 32px height and width. Square, because hit-testing follows
// border-radius. Lists of chips use a 12px row gap so wrapped rows' targets
// never overlap.
const REMOVE = 'group -mx-2.5 -my-1.5 grid size-11 shrink-0 place-items-center outline-none'

function RemoveControl({ label, onRemove, href }: { label: string; onRemove: () => void; href?: string }) {
  const glyph = (
    <span className="grid size-6 place-items-center rounded-full group-hover:bg-brand-600/15 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-focus-ring">
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </span>
  )
  if (!href) return <button type="button" onClick={onRemove} aria-label={label} className={REMOVE}>{glyph}</button>
  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    // A modified or middle click keeps the browser's own behaviour (new tab).
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onRemove()
  }
  return <a href={href} onClick={click} aria-label={label} className={REMOVE}>{glyph}</a>
}
