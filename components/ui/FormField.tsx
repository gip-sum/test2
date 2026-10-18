import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * A form field's frame: label, hint, the control, its error, and the ARIA
 * that ties them together (UI-09).
 *
 * The three posting forms each wired this by hand, three slightly different
 * ways — hints in two sizes, errors above the control in one and below in the
 * others, inputs 15px in one (Safari on iPhone zooms the page into a field
 * under 16px) and 16px in the rest. This is the one wiring:
 *
 *   label        always visible, above the control; "(optional)" when the
 *                answer is optional — required is the default and unmarked,
 *                which is the posting flow's convention
 *   hint         under the label, read with the control (aria-describedby)
 *   control      rendered by the caller with `control` spread on it: id,
 *                aria-invalid and aria-describedby, so an input, a select or
 *                a textarea all get the same wiring
 *   error        under the control, also in aria-describedby, prefixed
 *                "Error:" for screen readers
 *
 * Server-safe (no hooks): the posting forms are plain GET forms that work
 * without JavaScript, and their error summary takes focus on load. Field
 * errors are therefore not alerts here; the sign-in form's AuthField
 * (components/auth) keeps its own alert semantics because it validates in
 * place without a page load.
 *
 * `messageId` names the hint and error (`<messageId>-hint`, `-error`); it
 * defaults to the control's id. The posting forms pass their existing names
 * so links and checks that point at an error keep working.
 */
export type FieldControl = { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }

/** The shared look of a text input, select or textarea: 48px, 16px text. */
export const fieldControlClass =
  'mt-2 block min-h-12 w-full min-w-0 rounded-md border border-border-strong bg-surface-000 px-3 py-3 text-base text-ink-900 aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger-600'

function describedBy(messageId: string, hint: unknown, error: unknown) {
  return [hint ? `${messageId}-hint` : null, error ? `${messageId}-error` : null].filter(Boolean).join(' ') || undefined
}

function Label({ optional, children }: { optional?: boolean; children: ReactNode }) {
  return <>{children}{optional && <span className="font-normal text-ink-500"> (optional)</span>}</>
}

function Hint({ messageId, children }: { messageId: string; children: ReactNode }) {
  return <p id={`${messageId}-hint`} className="mt-1 text-body-sm text-ink-500">{children}</p>
}

function FieldError({ messageId, children }: { messageId: string; children: ReactNode }) {
  return <p id={`${messageId}-error`} className="mt-2 text-body-sm font-semibold text-danger-600"><span className="sr-only">Error: </span>{children}</p>
}

export function FormField({ id, messageId = id, label, optional, hint, error, className, children }: {
  id: string
  messageId?: string
  label: ReactNode
  optional?: boolean
  hint?: ReactNode
  error?: string
  className?: string
  children: (control: FieldControl) => ReactNode
}) {
  const control: FieldControl = { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy(messageId, hint, error) }
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="block text-label text-ink-900"><Label optional={optional}>{label}</Label></label>
      {hint && <Hint messageId={messageId}>{hint}</Hint>}
      {children(control)}
      {error && <FieldError messageId={messageId}>{error}</FieldError>}
    </div>
  )
}

/**
 * A group of choices (radios, checkboxes) under one legend. The hint and
 * error describe the fieldset itself: aria-invalid is not valid on a radio,
 * so the caller styles invalid options from `error` instead.
 */
export function FormFieldset({ messageId, legend, optional, hint, error, className, children }: {
  messageId: string
  legend: ReactNode
  optional?: boolean
  hint?: ReactNode
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <fieldset aria-describedby={describedBy(messageId, hint, error)} className={cn('min-w-0', className)}>
      <legend className="text-label text-ink-900"><Label optional={optional}>{legend}</Label></legend>
      {hint && <Hint messageId={messageId}>{hint}</Hint>}
      {children}
      {error && <FieldError messageId={messageId}>{error}</FieldError>}
    </fieldset>
  )
}
