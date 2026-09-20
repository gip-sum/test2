import Link from 'next/link'
import { BRAND } from '@/lib/brand'

/**
 * PLACEHOLDER wordmark.
 *
 * The mark is a token-coloured geometric form, not a designed logo — the
 * production brand has not been chosen. Swapping it means replacing this
 * component and the values in lib/brand.ts; nothing else in the app knows
 * the brand's name.
 */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2 rounded-md font-display text-heading-3 font-bold text-ink-900"
      aria-label={`${BRAND.name} — home`}
    >
      <span
        aria-hidden
        className="size-6 rounded-sm bg-brand-600 shadow-[inset_-8px_8px_0_var(--color-supply-600)]"
      />
      <span className={compact ? 'sr-only sm:not-sr-only' : undefined}>{BRAND.shortName}</span>
    </Link>
  )
}
