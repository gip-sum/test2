'use client'

import { SmoothTabs } from '@/components/ui/SmoothTabs'
import type { Intent } from '@/lib/property/types'

const OPTIONS: Array<{ value: Intent; label: string }> = [
  { value: 'buy', label: 'Buy' },
  { value: 'rent', label: 'Rent' },
]

/**
 * Buy / Rent.
 *
 * These are two different products, not a filter value — different field
 * sets, different economics, separate URL namespaces. Modelling them as
 * tabs at the top of the search is what makes that legible to the user.
 * The tabs themselves are the shared SmoothTabs (Kokonut-derived, UI-05).
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
  return <SmoothTabs items={OPTIONS} value={value} onChange={onChange} label="Search intent" idPrefix={idPrefix} fullWidth={fullWidth} />
}
