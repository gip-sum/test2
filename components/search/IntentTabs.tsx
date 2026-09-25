'use client'

import { cn } from '@/lib/cn'
import type { Intent } from '@/lib/property/types'

/**
 * Buy / Rent.
 *
 * These are two different products, not a filter value — different field
 * sets, different economics, separate URL namespaces. Modelling them as
 * tabs at the top of the search is what makes that legible to the user.
 */
export function IntentTabs({
  value,
  onChange,
  idPrefix = 'intent',
  fullWidth = false,
}: {
  value: Intent
  onChange: (intent: Intent) => void
  idPrefix?: string
  /** Stretch into two equal halves — the phone form, where each tab is a big target. */
  fullWidth?: boolean
}) {
  const options: Array<{ value: Intent; label: string }> = [
    { value: 'buy', label: 'Buy' },
    { value: 'rent', label: 'Rent' },
  ]

  return (
    <div role="tablist" aria-label="Search intent" className={cn('gap-1 rounded-full bg-surface-200 p-1', fullWidth ? 'flex w-full lg:inline-flex lg:w-auto' : 'inline-flex')}>
      {options.map((o) => {
        const selected = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            id={`${idPrefix}-${o.value}`}
            aria-selected={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-10 rounded-full px-6 text-label transition-colors',
              fullWidth && 'flex-1 lg:flex-none',
              selected
                ? 'bg-brand-600 text-on-brand shadow-e1'
                : 'text-ink-700 hover:bg-surface-000 hover:text-ink-900',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
