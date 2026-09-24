'use server'

import { revalidatePath } from 'next/cache'
import { getVerifiedUser } from '@/lib/auth/session'
import { getAllLocalitySlugs } from '@/lib/location/queries'
import { saveBuyerProfile } from '@/lib/account/queries'
import { validateProfile } from '@/lib/account/validation'

export type ProfileState = { status: 'idle' | 'success' | 'error'; message: string }

export async function updateProfile(_state: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await getVerifiedUser()
  if (!user) return { status: 'error', message: 'Your session has ended. Sign in again to save changes.' }
  const parsed = validateProfile(form, getAllLocalitySlugs())
  if (!parsed.ok) return { status: 'error', message: parsed.message }
  if (!await saveBuyerProfile(user, parsed.value)) {
    return { status: 'error', message: 'We could not save your profile. Please try again.' }
  }
  revalidatePath('/account')
  return { status: 'success', message: 'Your account details have been saved.' }
}
