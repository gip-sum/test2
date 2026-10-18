'use client'

import { startTransition, useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { updateProfile, type ProfileState } from '@/app/account/actions'
import type { BuyerProfile } from '@/lib/account/queries'
import { validateProfile, type ProfileField } from '@/lib/account/validation'
import { Button } from '@/components/ui/Button'
import { fieldControlClass, FormField } from '@/components/ui/FormField'
import { cn } from '@/lib/cn'

type LocalityOption = { slug: string; name: string }
const initialState: ProfileState = { status: 'idle', message: '' }
const FIELD_ID: Record<ProfileField, string> = { full_name: 'profile-name', contact_phone: 'profile-phone', preferred_intent: 'profile-intent', preferred_locality: 'profile-locality' }

/**
 * The buyer's details and preferences (Phase 6; shared fields, busy and
 * focus, UI-12).
 *
 * TWO PATHS, ONE ACTION, as the sign-in and enquiry forms: without
 * JavaScript it posts to `updateProfile` and the page returns with the
 * message beside its field and what was typed; with JavaScript `onSubmit`
 * calls the same action itself — checking the fields first with the same
 * rules (lib/account/validation), refusing a second save while one is in
 * flight, and catching a request that never reached the server. Taking
 * over the submit also means React does not reset the fields after the
 * action, so a failed save keeps the change being made.
 *
 * Focus: the Save button keeps it while saving (busy Button). A saved
 * change moves it to the confirmation, which is also announced; a problem
 * with one field moves it to that field; a failure of the whole save is an
 * alert beside the button, and focus stays there.
 */
export function ProfileForm({ profile, localities, disabled = false }: {
  profile: BuyerProfile | null
  localities: LocalityOption[]
  disabled?: boolean
}) {
  const [serverState, action] = useActionState(updateProfile, initialState)
  const [clientState, setClientState] = useState<ProfileState | null>(null)
  const [pending, startSave] = useTransition()
  const inFlight = useRef(false)
  const [attempt, setAttempt] = useState(0)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const state = clientState ?? serverState
  const values = state.values
  const fieldError = (field: ProfileField) => state.status === 'error' && state.field === field ? state.message : undefined
  const formMessage = state.status === 'error' && state.field ? '' : state.message

  useEffect(() => {
    if (!attempt) return
    if (state.status === 'success') statusRef.current?.focus()
    else if (state.status === 'error' && state.field) document.getElementById(FIELD_ID[state.field])?.focus()
  }, [state, attempt])

  function show(result: ProfileState) {
    setClientState(result)
    setAttempt((n) => n + 1)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current || pending || disabled) return
    const data = new FormData(event.currentTarget)
    const echo = { full_name: String(data.get('full_name') ?? ''), contact_phone: String(data.get('contact_phone') ?? ''), preferred_intent: String(data.get('preferred_intent') ?? ''), preferred_locality: String(data.get('preferred_locality') ?? ''), email_updates: data.get('email_updates') === 'on' }
    const local = validateProfile(data, localities.map((l) => l.slug))
    if (!local.ok) { show({ status: 'error', message: local.message, field: local.field, values: echo }); return }
    inFlight.current = true
    startSave(async () => {
      try {
        const result = await updateProfile(state, data)
        startTransition(() => show(result))
      } catch {
        startTransition(() => show({ status: 'error', message: navigator.onLine ? 'Your changes could not be sent. Please try again; they are still here.' : 'Your changes were not saved. Check your connection and try again; they are still here.', values: echo }))
      } finally {
        inFlight.current = false
      }
    })
  }

  return <form action={action} onSubmit={submit} noValidate aria-busy={pending || undefined} className="space-y-6">
    <div>
      <h2 className="font-display text-heading-3 text-ink-900">Your details</h2>
      <p className="mt-1 text-body-sm text-ink-700">Keep these details up to date for your property search.</p>
    </div>
    <div className="grid gap-5 sm:grid-cols-2">
      <FormField id={FIELD_ID.full_name} label="Full name" error={fieldError('full_name')}>
        {(c) => <input {...c} className={fieldControlClass} name="full_name" defaultValue={values?.full_name ?? profile?.full_name ?? ''} autoComplete="name" autoFocus={!clientState && !!fieldError('full_name')} disabled={disabled} />}
      </FormField>
      <FormField id={FIELD_ID.contact_phone} label="Contact number" optional error={fieldError('contact_phone')} hint="Saved for your account. This number is not verified or shared with sellers.">
        {(c) => <input {...c} className={fieldControlClass} name="contact_phone" defaultValue={values?.contact_phone ?? profile?.contact_phone ?? ''} type="tel" inputMode="tel" autoComplete="tel" placeholder="10 to 15 digits" autoFocus={!clientState && !!fieldError('contact_phone')} disabled={disabled} />}
      </FormField>
    </div>
    <div className="border-t border-border-subtle pt-6">
      <h2 className="font-display text-heading-3 text-ink-900">Property preferences</h2>
      <p className="mt-1 text-body-sm text-ink-700">Your choices stay in your account for future visits.</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <FormField id={FIELD_ID.preferred_intent} label="I am interested in" error={fieldError('preferred_intent')}>
          {(c) => <select {...c} className={fieldControlClass} name="preferred_intent" defaultValue={values?.preferred_intent ?? profile?.preferred_intent ?? 'both'} disabled={disabled}>
            <option value="both">Buying and renting</option>
            <option value="buy">Buying</option>
            <option value="rent">Renting</option>
          </select>}
        </FormField>
        <FormField id={FIELD_ID.preferred_locality} label="Preferred locality" error={fieldError('preferred_locality')}>
          {(c) => <select {...c} className={fieldControlClass} name="preferred_locality" defaultValue={values?.preferred_locality ?? profile?.preferred_locality ?? ''} disabled={disabled}>
            <option value="">No preference yet</option>
            {localities.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
          </select>}
        </FormField>
      </div>
    </div>
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border-subtle bg-surface-100 p-3 text-body-sm text-ink-700">
      <input type="checkbox" name="email_updates" defaultChecked={values?.email_updates ?? profile?.email_updates ?? false} className="mt-1 size-4 accent-brand-600" disabled={disabled} />
      <span>Email me occasional GharBazaar product updates. You can turn this off here at any time.</span>
    </label>
    <div className="flex flex-wrap items-center gap-4">
      <Button type="submit" loading={pending} disabled={disabled}>{pending ? 'Saving…' : 'Save changes'}</Button>
      {/* Focusable from script: a saved change hands focus here and it is read out (UI-12). */}
      <p ref={statusRef} tabIndex={-1} role={state.status === 'error' ? 'alert' : 'status'} aria-live="polite" id="profile-status"
        className={cn('text-body-sm', state.status === 'error' ? 'text-danger-600' : 'text-success-600')}>{pending ? 'Saving your details.' : formMessage}</p>
    </div>
  </form>
}
