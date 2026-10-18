'use server'

import { revalidatePath } from 'next/cache'
import { getVerifiedUser } from '@/lib/auth/session'
import { getAllLocalitySlugs } from '@/lib/location/queries'
import { saveBuyerProfile } from '@/lib/account/queries'
import { validateProfile, type ProfileField } from '@/lib/account/validation'

/**
 * `field` places a validation message beside its field (UI-12). `values`
 * echoes what was typed on a failure: React resets an action form's fields
 * to their defaults after the action, and the defaults were the SAVED
 * profile, so a failed save used to throw away the change being made.
 */
export type ProfileValues = { full_name: string; contact_phone: string; preferred_intent: string; preferred_locality: string; email_updates: boolean }
export type ProfileState = { status: 'idle' | 'success' | 'error'; message: string; field?: ProfileField | null; values?: ProfileValues }

function typed(form: FormData): ProfileValues {
  const text = (key: string) => { const v = form.get(key); return typeof v === 'string' ? v : '' }
  return { full_name: text('full_name'), contact_phone: text('contact_phone'), preferred_intent: text('preferred_intent'), preferred_locality: text('preferred_locality'), email_updates: form.get('email_updates') === 'on' }
}

export async function updateProfile(_state: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await getVerifiedUser()
  if (!user) return { status: 'error', message: 'Your session has ended. Sign in again to save changes.', values: typed(form) }
  const parsed = validateProfile(form, getAllLocalitySlugs())
  if (!parsed.ok) return { status: 'error', message: parsed.message, field: parsed.field, values: typed(form) }
  if (!await saveBuyerProfile(user, parsed.value)) {
    return { status: 'error', message: 'We could not save your profile. Please try again.', values: typed(form) }
  }
  revalidatePath('/account')
  return { status: 'success', message: 'Your account details have been saved.' }
}
