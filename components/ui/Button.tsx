import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Variants carry FIXED meaning across the product:
 *   primary   the buyer's action  — Search, Enquire, Save
 *   supply    the seller's action — Post Property, Publish, Renew
 *   secondary the alternative beside a primary
 *   tertiary  low emphasis, inline
 *   danger    destructive
 *
 * Exactly ONE filled primary per surface. Two competing filled buttons
 * measurably reduce clicks on both.
 */
type Variant = 'primary' | 'supply' | 'secondary' | 'tertiary' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  // on-brand / on-supply flip to dark ink in dark theme — never hardcode #fff
  primary: 'bg-brand-600 text-on-brand hover:bg-brand-700 border-transparent',
  supply: 'bg-supply-600 text-on-supply hover:brightness-95 border-transparent',
  secondary:
    'bg-transparent text-ink-900 border-border-strong hover:border-ink-500',
  tertiary: 'bg-transparent text-brand-600 border-transparent hover:bg-brand-100',
  danger: 'bg-danger-600 text-white border-transparent hover:brightness-95',
}

// 44px minimum touch target on md and lg; sm is for dense desktop toolbars only.
const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-label',
  md: 'h-11 px-4 text-label',
  lg: 'h-12 px-6 text-body',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  disabled,
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border font-semibold',
        'transition-colors disabled:cursor-not-allowed disabled:opacity-45',
        VARIANT[variant],
        SIZE[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {/* The button keeps its width while loading — a shrinking button
          moves everything beside it. */}
      {loading && (
        <span
          className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  )
}
