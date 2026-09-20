import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/**
 * Native select.
 *
 * Deliberately not a custom listbox: on phones the OS picker is faster,
 * more accessible and more familiar than anything we would build, and this
 * product is mobile-first.
 */
export function Select({
  label,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-overline uppercase text-ink-500">{label}</span>
      <select
        {...rest}
        className={cn(
          'h-11 w-full min-w-0 rounded-md border border-border-subtle bg-surface-000 px-3',
          'text-body text-ink-900 hover:border-border-strong',
          className,
        )}
      >
        {children}
      </select>
    </label>
  )
}
