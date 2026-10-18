export type BuyerProfileInput = {
  full_name: string
  contact_phone: string | null
  preferred_intent: 'buy' | 'rent' | 'both'
  preferred_locality: string | null
  email_updates: boolean
}

/** The field a problem belongs to, so the form can show it there (UI-12); null for the form as a whole. */
export type ProfileField = 'full_name' | 'contact_phone' | 'preferred_intent' | 'preferred_locality'

export function validateProfile(form: FormData, localities: readonly string[]):
  | { ok: true; value: BuyerProfileInput }
  | { ok: false; message: string; field: ProfileField | null } {
  const rawName = form.get('full_name')
  const rawPhone = form.get('contact_phone')
  const rawIntent = form.get('preferred_intent')
  const rawLocality = form.get('preferred_locality')
  if (typeof rawName !== 'string' || typeof rawPhone !== 'string' ||
      typeof rawIntent !== 'string' || typeof rawLocality !== 'string') {
    return { ok: false, message: 'Check the profile fields and try again.', field: null }
  }
  const name = rawName.trim().replace(/\s+/g, ' ')
  const phone = rawPhone.trim()
  if (name.length > 100 || /[\p{Cc}\p{Cf}]/u.test(name)) return { ok: false, message: 'Name must be at most 100 characters.', field: 'full_name' }
  if (phone && !/^\+?[0-9]{10,15}$/.test(phone)) return { ok: false, message: 'Enter a contact number with 10 to 15 digits, or leave it empty.', field: 'contact_phone' }
  if (!['buy', 'rent', 'both'].includes(rawIntent)) return { ok: false, message: 'Choose a valid property interest.', field: 'preferred_intent' }
  if (rawLocality && !localities.includes(rawLocality)) return { ok: false, message: 'Choose a locality from the list.', field: 'preferred_locality' }
  return { ok: true, value: {
    full_name: name,
    contact_phone: phone || null,
    preferred_intent: rawIntent as BuyerProfileInput['preferred_intent'],
    preferred_locality: rawLocality || null,
    email_updates: form.get('email_updates') === 'on',
  } }
}
