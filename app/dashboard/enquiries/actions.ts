'use server'

import { revalidatePath } from 'next/cache'
import { getVerifiedUser } from '@/lib/auth/session'
import { changeLeadStatus, markNotificationsRead, type Lead } from '@/lib/enquiry/queries'

export async function setLeadStatus(formData: FormData) {
  const user = await getVerifiedUser()
  if (!user) return
  const id = formData.get('enquiryId')
  const status = formData.get('status')
  if (typeof id !== 'string' || typeof status !== 'string' || !['new', 'contacted', 'closed'].includes(status)) return
  if (await changeLeadStatus(user, id, status as Lead['status'])) revalidatePath('/dashboard/enquiries')
}

export async function acknowledgeNotifications() {
  const user = await getVerifiedUser()
  if (user && await markNotificationsRead(user)) revalidatePath('/dashboard/enquiries')
}
