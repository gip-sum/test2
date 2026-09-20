'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'

/**
 * Shortlist toggle.
 *
 * Optimistic: the icon fills immediately, because waiting on a round trip
 * for a save makes the whole product feel slow. Phase 5 wires this to the
 * favourite table and replays the action after login when signed out;
 * until then it is local state only.
 */
export function SaveButton({ title, className }: { title: string; className?: string }) {
  const [saved, setSaved] = useState(false)

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      onClick={(e) => {
        // The whole card is a link; the save control must not navigate.
        e.preventDefault()
        e.stopPropagation()
        setSaved((s) => !s)
      }}
      className={cn(
        'grid size-11 place-items-center rounded-full border border-border-subtle bg-surface-000/95',
        saved ? 'text-danger-600' : 'text-ink-700 hover:text-danger-600',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" aria-hidden>
        <path d="M12 20s-7-4.4-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.6-7 9-7 9z" />
      </svg>
    </button>
  )
}
