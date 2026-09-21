import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Short, high-trust markers on a listing.
 *
 * V0 deliberately ships NO "Verified" tone. The platform performs no
 * verification yet, and an unearned trust badge is the one thing here that
 * could cause real harm. It returns when a real check exists.
 *
 * Maximum two visible per card; overflow is dropped, not stacked.
 */
type Tone = 'neutral' | 'brand' | 'supply' | 'warn' | 'danger'

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-200 text-ink-700',
  brand: 'bg-brand-100 text-brand-600',
  supply: 'bg-supply-100 text-supply-700',
  warn: 'bg-warn-100 text-warn-600',
  danger: 'bg-danger-100 text-danger-600',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-sm px-2 text-caption font-semibold',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
