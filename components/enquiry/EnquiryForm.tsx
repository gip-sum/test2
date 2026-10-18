'use client'

import { startTransition, useActionState, useEffect, useId, useRef, useState, useTransition, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { fieldControlClass, FormField } from '@/components/ui/FormField'
import { validateEnquiry } from '@/lib/enquiry/validate'
import type { EnquiryFieldError } from '@/lib/enquiry/types'
import {
  submitEnquiry,
  type EnquiryFormState,
} from '@/app/property/actions'

const EMPTY_ENQUIRY_STATE: EnquiryFormState = { status: 'idle' }
type Field = 'name' | 'phone' | 'message'
// A request that never reached the server: never shown as a failure of ours.
const OFFLINE = 'Your enquiry was not sent. Check your connection and try again; what you typed is still here.'
const UNREACHED = 'Your enquiry could not be sent. Please try again; what you typed is still here.'

/**
 * Three fields, because every extra one costs leads.
 *
 * Name, mobile and an optional message. Not email — a seller in this market
 * calls back, they do not write. Not a budget, not a preferred time, not a
 * "how did you hear about us".
 *
 * TWO PATHS, ONE ACTION (UI-12, as the sign-in form in UI-07). The form
 * posts to the `submitEnquiry` server action through `useActionState`, so
 * without JavaScript it is an ordinary POST: the page comes back with the
 * errors beside their fields and everything typed, or with the
 * confirmation. With JavaScript, `onSubmit` takes over (React skips a form
 * action whose submit event was cancelled) and calls the same action itself
 * to:
 *   - check the fields first with the server's own rules and wording
 *     (lib/enquiry/validate), so a typo costs no round trip;
 *   - refuse a second submission while one is in flight (the busy Button
 *     refuses the press too, and keeps focus);
 *   - catch a request that never reached the server. Through the form
 *     action a lost connection threw into the property page's error
 *     boundary and the typed message was gone; here it is a message above
 *     the form, with every field intact.
 *
 * Fields use the shared frame (FormField): visible labels, errors under
 * each field tied to it, 16px controls. After a failed submit the summary
 * takes focus and links to each field, as the posting forms do. The
 * confirmation that replaces the form takes focus, so the submit button
 * that had it does not drop it to <body>.
 *
 * No seller phone number is returned. The confirmation reports whether an
 * assigned seller actually has an in-app notification for this enquiry.
 */
export function EnquiryForm({
  listingPublicId,
  listingId,
  sellerLabel,
  compact,
}: {
  sellerLabel: string
  compact?: boolean
} & (
  // A demo fixture (Phase 4) or a real Phase 18 listing; never both.
  | { listingPublicId: string; listingId?: undefined }
  | { listingId: string; listingPublicId?: undefined }
)) {
  const [serverState, formAction] = useActionState<EnquiryFormState, FormData>(submitEnquiry, EMPTY_ENQUIRY_STATE)
  const [clientState, setClientState] = useState<EnquiryFormState | null>(null)
  const [pending, startSubmit] = useTransition()
  // Set synchronously, so two submit events in one frame cannot both pass
  // before React re-renders with `pending`.
  const inFlight = useRef(false)
  // Each result is a new attempt: the same error twice moves focus again.
  const [attempt, setAttempt] = useState(0)
  const ids = useId()
  const summaryRef = useRef<HTMLDivElement>(null)
  const state = clientState ?? serverState

  useEffect(() => {
    if (state.status === 'error') summaryRef.current?.focus()
  }, [state, attempt])

  function show(result: EnquiryFormState) {
    setClientState(result)
    setAttempt((n) => n + 1)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current || pending) return
    const data = new FormData(event.currentTarget)
    const values = { name: String(data.get('name') ?? ''), phone: String(data.get('phone') ?? ''), message: String(data.get('message') ?? '') }
    // The listing is known to the form, so only the buyer's fields are checked here.
    const { errors } = validateEnquiry({ listingPublicId: listingPublicId ?? listingId ?? '', ...values })
    if (Object.keys(errors).length) { show({ status: 'error', errors, values }); return }
    inFlight.current = true
    startSubmit(async () => {
      try {
        const result = await submitEnquiry(state, data)
        startTransition(() => show(result))
      } catch {
        startTransition(() => show({ status: 'error', errors: { listing: navigator.onLine ? UNREACHED : OFFLINE }, values }))
      } finally {
        inFlight.current = false
      }
    })
  }

  if (state.status === 'success') {
    return <EnquirySent duplicate={state.duplicate === true} sellerNotified={state.sellerNotified === true} sellerLabel={sellerLabel} />
  }

  const errors: Partial<Record<EnquiryFieldError, string>> = state.errors ?? {}
  const values = state.values
  const fieldId = (field: Field) => `${ids}-${field}`

  return (
    <form action={formAction} onSubmit={submit} noValidate aria-busy={pending || undefined} className="flex flex-col gap-4">
      {listingId
        ? <input type="hidden" name="listingId" value={listingId} />
        : <input type="hidden" name="listingPublicId" value={listingPublicId} />}

      {Object.keys(errors).length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          // Without JavaScript the page is rendered afresh from the result;
          // autoFocus is how focus gets to the summary there.
          autoFocus={!clientState}
          className="rounded-md border border-danger-600/30 bg-danger-100 p-3 text-body-sm text-ink-900"
        >
          <p className="font-semibold text-danger-600">{errors.listing && Object.keys(errors).length === 1 ? 'Your enquiry was not sent' : 'Please check the form'}</p>
          <ul className="mt-1 list-inside list-disc">
            {(Object.entries(errors) as Array<[EnquiryFieldError, string]>).map(([field, message]) => (
              <li key={field}>{field === 'listing' || (compact && field === 'message')
                ? message
                : <a href={`#${fieldId(field)}`} className="underline underline-offset-2">{message}</a>}</li>
            ))}
          </ul>
        </div>
      )}

      <FormField id={fieldId('name')} label="Your name" error={errors.name}>
        {(control) => <input {...control} name="name" autoComplete="name" defaultValue={values?.name} className={fieldControlClass} />}
      </FormField>
      <FormField id={fieldId('phone')} label="Mobile number" error={errors.phone} hint="10-digit Indian mobile number. Only the seller of this property sees it.">
        {(control) => <input {...control} name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={values?.phone} className={fieldControlClass} />}
      </FormField>
      {!compact && (
        <FormField id={fieldId('message')} label="Message" optional error={errors.message}>
          {(control) => <textarea {...control} name="message" rows={3} placeholder="Ask about possession, parking, or anything else." defaultValue={values?.message} className={fieldControlClass} />}
        </FormField>
      )}

      <Button type="submit" variant="primary" size="lg" fullWidth loading={pending}>
        {pending ? 'Sending…' : 'Send enquiry'}
      </Button>
      <p role="status" className="sr-only">{pending ? 'Sending your enquiry.' : ''}</p>

      <p className="text-caption text-ink-500">
        Your enquiry is stored securely. If this listing has an assigned seller,
        they receive it in their inbox. Your number is shared only with that seller.
      </p>
    </form>
  )
}

/**
 * The confirmation. States exactly what happened based on the database
 * response, and takes focus when it replaces the form (UI-12): it is a
 * status, so it is also announced. No animation: the change is the message.
 */
function EnquirySent({ duplicate, sellerNotified, sellerLabel }: { duplicate: boolean; sellerNotified: boolean; sellerLabel: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  return (
    <div ref={ref} tabIndex={-1} role="status" data-enquiry-sent className="rounded-lg border border-trust-600/30 bg-trust-100 p-4">
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
