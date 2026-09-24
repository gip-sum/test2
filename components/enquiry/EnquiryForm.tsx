'use client'

import { useActionState, useEffect, useId, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import {
  submitEnquiry,
  type EnquiryFormState,
} from '@/app/property/actions'

const EMPTY_ENQUIRY_STATE: EnquiryFormState = { status: 'idle' }

/**
 * Three fields, because every extra one costs leads.
 *
 * Name, mobile and an optional message. Not email — a seller in this market
 * calls back, they do not write. Not a budget, not a preferred time, not a
 * "how did you hear about us".
 *
 * WORKS WITHOUT JAVASCRIPT. `useActionState` wraps a real form posting to a
 * server action, so the submit path exists before hydration. Everything the
 * client adds — pending state, focus management, inline errors — is on top
 * of something already functional.
 *
 * No seller phone number is returned. The confirmation reports whether an
 * assigned seller actually has an in-app notification for this enquiry.
 */
export function EnquiryForm({
  listingPublicId,
  sellerLabel,
  compact,
}: {
  listingPublicId: string
  sellerLabel: string
  compact?: boolean
}) {
  const [state, formAction, pending] = useActionState<EnquiryFormState, FormData>(
    submitEnquiry,
    EMPTY_ENQUIRY_STATE,
  )
  const ids = useId()
  const summaryRef = useRef<HTMLDivElement>(null)

  // A failed submit moves focus to the error summary. Without this, a
  // screen-reader user is left at the submit button with no indication that
  // anything changed further up the form.
  useEffect(() => {
    if (state.status === 'error') summaryRef.current?.focus()
  }, [state])

  if (state.status === 'success') {
    return <EnquirySent duplicate={state.duplicate === true} sellerNotified={state.sellerNotified === true} sellerLabel={sellerLabel} />
  }

  const errors = state.errors ?? {}
  const values = state.values

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="listingPublicId" value={listingPublicId} />

      {Object.keys(errors).length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-danger-600/30 bg-danger-100 p-3 text-body-sm text-ink-900"
        >
          <p className="font-semibold text-danger-600">Please check the form</p>
          <ul className="mt-1 list-inside list-disc">
            {(Object.entries(errors) as Array<[string, string]>).map(([field, message]) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <Field
        id={`${ids}-name`}
        name="name"
        label="Your name"
        autoComplete="name"
        defaultValue={values?.name}
        error={errors.name}
      />
      <Field
        id={`${ids}-phone`}
        name="phone"
        label="Mobile number"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="10-digit mobile number"
        defaultValue={values?.phone}
        error={errors.phone}
      />

      {!compact && (
        <Field
          id={`${ids}-message`}
          name="message"
          label="Message"
          optional
          multiline
          placeholder="Ask about possession, parking, or anything else."
          defaultValue={values?.message}
          error={errors.message}
        />
      )}

      <Button type="submit" variant="primary" size="lg" fullWidth loading={pending}>
        {pending ? 'Sending…' : 'Send enquiry'}
      </Button>

      <p className="text-caption text-ink-500">
        Your enquiry is stored securely. If this listing has an assigned seller,
        they receive it in their inbox. Your number is shared only with that seller.
      </p>
    </form>
  )
}

function Field({
  id,
  name,
  label,
  error,
  optional,
  multiline,
  defaultValue,
  ...rest
}: {
  id: string
  name: string
  label: string
  error?: string
  optional?: boolean
  multiline?: boolean
  defaultValue?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const errorId = `${id}-error`
  const shared = {
    id,
    name,
    defaultValue,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': error ? errorId : undefined,
    className: cn(
      'w-full rounded-md border bg-surface-000 px-3 text-body text-ink-900 placeholder:text-ink-500',
      'hover:border-border-strong',
      error ? 'border-danger-600' : 'border-border-subtle',
      multiline ? 'min-h-24 py-2' : 'h-12',
    ),
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-label text-ink-900">
        {label}
        {optional && <span className="ml-1 font-normal text-ink-500">(optional)</span>}
      </label>
      {multiline ? (
        <textarea {...shared} rows={3} placeholder={rest.placeholder} />
      ) : (
        <input {...shared} {...rest} />
      )}
      {error && (
        <p id={errorId} className="text-caption text-danger-600">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * The confirmation.
 *
 * States exactly what happened based on the database response.
 */
function EnquirySent({ duplicate, sellerNotified, sellerLabel }: { duplicate: boolean; sellerNotified: boolean; sellerLabel: string }) {
  return (
    <div role="status" className="rounded-lg border border-trust-600/30 bg-trust-100 p-4">
      <p className="flex items-center gap-2 text-body font-semibold text-trust-600">
        <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 13l4 4L19 7" />
        </svg>
        {duplicate ? 'Enquiry sent again' : 'Enquiry sent'}
      </p>
      <p className="mt-2 text-body-sm text-ink-700">
        {duplicate
          ? 'Another enquiry was recorded for this property and number.'
          : 'Your enquiry has been saved.'}
      </p>
      <p className="mt-2 text-caption text-ink-500">
        {sellerNotified
          ? `The assigned ${sellerLabel.toLowerCase()} can see it in their inbox.`
          : 'This listing has no connected seller account yet, so seller notification is pending.'}
      </p>
    </div>
  )
}
