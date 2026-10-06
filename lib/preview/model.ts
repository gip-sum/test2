import { parsePostingEntry } from '@/lib/posting/entry'
import { readDetailInput, validateDetails } from '@/lib/posting/details'
import { readLocationInput, validateLocation } from '@/lib/posting/location'
import { readPricingInput, validatePricing } from '@/lib/posting/pricing'
import { PROPERTY_TYPE_LABEL, type PropertyMedia } from '@/lib/property/types'
import type { Location } from '@/lib/location/types'
import { snapshotOf, type Draft } from '@/lib/drafts/types'
import type { Photo } from '@/lib/media/types'
export type PreviewWarning = { section: 'entry' | 'details' | 'location' | 'pricing' | 'photos' | 'seller'; message: string }
export function buildPreview(draft: Draft, photos: Photo[], sellerName: string | null, places: readonly Location[], today: string) {
  const input = snapshotOf(draft).input, entry = parsePostingEntry(input), warnings: PreviewWarning[] = []
  const add = (section: PreviewWarning['section'], errors: Record<string, string | undefined>) => {
    for (const message of Object.values(errors)) if (message) warnings.push({ section, message })
  }
  if (!entry.role || !entry.intent || !entry.type) warnings.push({ section: 'entry', message: 'Choose who is posting, sale or rent, and the property type.' })
  const details = entry.type && entry.intent ? validateDetails(readDetailInput(input), { type: entry.type, intent: entry.intent }, today) : undefined
  if (details && !details.ok) add('details', details.errors)
  const locationResult = validateLocation(readLocationInput(input), places)
  if (!locationResult.ok) add('location', locationResult.errors)
  const pricingResult = entry.intent ? validatePricing(readPricingInput(input), entry.intent) : undefined
  if (pricingResult && !pricingResult.ok) add('pricing', pricingResult.errors)
  const ready = [...photos].filter(p => p.status === 'ready').sort((a,b) => a.position - b.position || a.id.localeCompare(b.id))
  if (!ready.length) warnings.push({ section: 'photos', message: 'Add at least one property photo.' })
  if (photos.some(p => p.status !== 'ready')) warnings.push({ section: 'photos', message: 'Finish or remove pending photo uploads before confirming.' })
  const name = sellerName?.trim() || null
  if (!name) warnings.push({ section: 'seller', message: 'Add your display name in your profile.' })
  const facts = details?.ok ? details.facts : null, pricing = pricingResult?.ok ? pricingResult.pricing : null
  const location = locationResult.ok ? locationResult.location : null
  const locality = location ? places.find(p => p.id === location.localityId)?.name : null
  const city = location ? places.find(p => p.id === location.cityId)?.name : null
  const title = [entry.type === 'STUDIO' ? 'Studio' : facts?.bedrooms ? `${facts.bedrooms} BHK` : null, entry.type ? PROPERTY_TYPE_LABEL[entry.type].toLowerCase() : 'Property', entry.intent === 'buy' ? 'for sale' : entry.intent === 'rent' ? 'for rent' : null, locality ? `in ${locality}` : null].filter(Boolean).join(' ')
  const media: PropertyMedia[] = ready.map((p,i) => ({ id:p.id, url:`/api/posting/photos/${p.id}`, alt:`Property photo ${i+1} — ${title}`, authenticated:true }))
  const carpetSqft = facts ? facts.carpetArea * (facts.areaUnit === 'sqm' ? 10.7639 : facts.areaUnit === 'sqyd' ? 9 : 1) : undefined
  return { entry, facts, pricing, location, locality, city, title, media, sellerName:name, carpetSqft, warnings, canConfirm:warnings.length===0 }
}
export type PreviewModel = ReturnType<typeof buildPreview>
