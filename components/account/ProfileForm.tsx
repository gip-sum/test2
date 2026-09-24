'use client'

import { useActionState } from 'react'
import { updateProfile, type ProfileState } from '@/app/account/actions'
import type { BuyerProfile } from '@/lib/account/queries'
import { Button } from '@/components/ui/Button'

type LocalityOption = { slug: string; name: string }
const initialState: ProfileState = { status: 'idle', message: '' }
const inputClass = 'mt-2 block min-h-11 w-full rounded-md border border-border-strong bg-surface-000 px-3 text-body text-ink-900 placeholder:text-ink-500'

export function ProfileForm({ profile, localities, disabled = false }: {
  profile: BuyerProfile | null
  localities: LocalityOption[]
  disabled?: boolean
}) {
  const [state, action, pending] = useActionState(updateProfile, initialState)

  return <form action={action} className="space-y-6">
    <div>
      <h2 className="font-display text-heading-3 text-ink-900">Your details</h2>
      <p className="mt-1 text-body-sm text-ink-700">Keep these details up to date for your property search.</p>
    </div>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-label text-ink-900">Full name
        <input className={inputClass} name="full_name" defaultValue={profile?.full_name ?? ''} maxLength={100} autoComplete="name" disabled={disabled} />
      </label>
      <label className="text-label text-ink-900">Contact number <span className="font-normal text-ink-500">(optional)</span>
        <input className={inputClass} name="contact_phone" defaultValue={profile?.contact_phone ?? ''} type="tel" inputMode="tel" autoComplete="tel" maxLength={16} placeholder="10 to 15 digits" aria-describedby="phone-help" disabled={disabled} />
        <span id="phone-help" className="mt-1 block text-caption font-normal text-ink-500">Saved for your account. This number is not verified or shared with sellers.</span>
      </label>
    </div>
    <div className="border-t border-border-subtle pt-6">
      <h2 className="font-display text-heading-3 text-ink-900">Property preferences</h2>
      <p className="mt-1 text-body-sm text-ink-700">Your choices stay in your account for future visits.</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="text-label text-ink-900">I am interested in
          <select className={inputClass} name="preferred_intent" defaultValue={profile?.preferred_intent ?? 'both'} disabled={disabled}>
            <option value="both">Buying and renting</option>
            <option value="buy">Buying</option>
            <option value="rent">Renting</option>
          </select>
        </label>
        <label className="text-label text-ink-900">Preferred locality
          <select className={inputClass} name="preferred_locality" defaultValue={profile?.preferred_locality ?? ''} disabled={disabled}>
            <option value="">No preference yet</option>
            {localities.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
          </select>
        </label>
      </div>
    </div>
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border-subtle bg-surface-100 p-3 text-body-sm text-ink-700">
      <input type="checkbox" name="email_updates" defaultChecked={profile?.email_updates ?? false} className="mt-1 size-4 accent-brand-600" disabled={disabled} />
      <span>Email me occasional GharBazaar product updates. You can turn this off here at any time.</span>
    </label>
    <div className="flex flex-wrap items-center gap-4">
      <Button type="submit" loading={pending} disabled={disabled}>Save changes</Button>
      <p role={state.status === 'error' ? 'alert' : 'status'} aria-live="polite" className={state.status === 'error' ? 'text-body-sm text-danger-600' : 'text-body-sm text-success-600'}>{state.message}</p>
    </div>
  </form>
}
