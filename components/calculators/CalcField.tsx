'use client'

import { useId } from 'react'
import { cn } from '@/lib/cn'
import type { FieldSpec } from '@/lib/finance/params'
import { formatForInput } from '@/lib/finance/params'
import { formatPrice } from '@/lib/format/price'

/**
 * One calculator input: a text field for the exact figure and a slider for
 * quick adjustment, bound to the same value.
 *
 * The text field is the real control — it has the name the form submits
 * without JavaScript, accepts Indian digit grouping ("62,50,000"), and
 * echoes rupee amounts back in lakh and crore so a misplaced zero is seen
 * at once. The slider is a convenience over a practical range; a value
 * typed beyond it is kept and the slider simply rests at its end.
 */
export function CalcField({
  name,
  spec,
  raw,
  error,
  onChange,
  slider,
  hint,
}: {
  name: string
  spec: FieldSpec
  raw: string
  error?: string
  onChange: (raw: string) => void
  slider: { min: number; max: number; step: number }
  hint?: string
}) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const value = Number(raw.replace(/[₹,%\s]/g, ''))
  const numeric = Number.isFinite(value) && raw.trim() !== ''
  const echo = spec.kind === 'rupees' && numeric && !error && value > 0 ? formatPrice(value) : null
  const unit = spec.kind === 'rupees' ? '₹' : null
  const suffix = spec.kind === 'percent' ? '%' : spec.kind === 'years' ? 'years' : null
  const describedBy = [hint || echo ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="calc-field">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-label font-semibold text-ink-900">{spec.label}</label>
        {echo && <span className="tabular text-body-sm font-semibold text-brand-700" aria-hidden="true">{echo}</span>}
      </div>
      <div
        className={cn(
          'mt-2 flex h-12 items-center gap-2 rounded-md border bg-surface-000 px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring',
          error ? 'border-2 border-danger-600 px-[11px]' : 'border-border-strong',
        )}
      >
        {unit && <span className="text-body text-ink-500" aria-hidden="true">{unit}</span>}
        <input
          id={id}
          name={name}
          value={raw}
          onChange={(e) => onChange(e.target.value)}
          inputMode={spec.kind === 'percent' ? 'decimal' : 'numeric'}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="tabular min-w-0 flex-1 bg-transparent text-body-lg font-semibold text-ink-900 outline-none"
        />
        {suffix && <span className="text-body text-ink-500" aria-hidden="true">{suffix}</span>}
      </div>
      <input
        type="range"
        tabIndex={-1}
        aria-hidden="true"
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={numeric ? Math.min(Math.max(value, slider.min), slider.max) : slider.min}
        onChange={(e) => onChange(formatForInput(spec, Number(e.target.value)))}
        className="calc-slider mt-2 w-full"
      />
      {(hint || echo) && (
        <p id={hintId} className="sr-only">{[echo, hint].filter(Boolean).join('. ')}</p>
      )}
      {hint && <p className="mt-1 text-caption text-ink-500">{hint}</p>}
      {error && (
        <p id={errorId} className="mt-1.5 flex gap-1.5 text-body-sm font-medium text-danger-600">
          <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16h.01" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
