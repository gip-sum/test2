import { PriceDisplay } from '@/components/property/PriceDisplay'
import { formatPriceExact, groupIndian } from '@/lib/format/price'
import type { DetailInput, PropertyFacts } from '@/lib/posting/details'
import { postingUrl } from '@/lib/posting/entry'
import type { CompleteEntry } from '@/lib/posting/flow'
import type { LocationInput } from '@/lib/posting/location'
import { pricingRate, type PricingInput, type PropertyPricing, type PricingKey } from '@/lib/posting/pricing'
import { pricingFieldId } from './PricingForm'
import { NextStep, ReviewList } from './ReviewParts'

export function PricingReview({ entry, carried, location, values, pricing, facts }: {
  entry: CompleteEntry; carried: DetailInput; location: LocationInput; values: PricingInput; pricing: PropertyPricing; facts: PropertyFacts
}) {
  const amount = pricing.intent === 'buy' ? pricing.price : pricing.monthlyRent
  const edit = (key: PricingKey) => `${postingUrl(entry, { details: carried, location, pricing: values, step: 'pricing' })}#${pricingFieldId(key)}`
  const maintenance = pricing.maintenance
  const rows: { key: PricingKey; label: string; value: React.ReactNode }[] = [
    { key: pricing.intent === 'buy' ? 'saleprice' : 'rent', label: pricing.intent === 'buy' ? 'Sale price' : 'Monthly rent', value: <>
      <PriceDisplay amount={amount} intent={pricing.intent} size="detail" />
      <span className="mt-1 block text-body text-ink-700">Exact amount: {formatPriceExact(amount)}{pricing.intent === 'rent' ? ' per month' : ''}</span>
    </> },
    ...(pricing.intent === 'rent' ? [{ key: 'deposit' as const, label: 'Security deposit (total)', value: pricing.deposit === 0 ? 'No deposit — ₹0' : formatPriceExact(pricing.deposit) }] : []),
    { key: 'maintenance', label: 'Monthly maintenance', value: maintenance.status === 'separate' ? `${formatPriceExact(maintenance.monthly)} per month, charged separately` : maintenance.status === 'included' ? 'Included in monthly rent' : maintenance.status === 'none' ? 'No maintenance charge — ₹0' : 'Not known yet' },
    { key: 'negotiable', label: 'Negotiability', value: pricing.negotiable ? 'Negotiable' : 'Fixed price' },
  ]
  return <>
    <ReviewList className="mt-7" title="Property pricing" rows={[
      ...rows.map((row) => ({ key: row.key, label: row.label, value: row.value, edit: edit(row.key), changeLabel: `Change ${row.label}` })),
    ]} />
    <p className="mt-3 rounded-md bg-surface-200 px-4 py-3 text-body-sm text-ink-700">
      <span className="font-semibold text-ink-900">Rate on carpet area: ₹{groupIndian(pricingRate(pricing, facts))} / sq. ft{pricing.intent === 'rent' ? ' per month' : ''}.</span>{' '}
      Rounded to whole rupees; excludes separate maintenance and deposit.
    </p>
    <NextStep
      body="Add photos next. Then preview the listing as buyers will see it, and submit it for review."
      primary={{ href: postingUrl(entry, { details: carried, location, pricing: values, step: 'pricing-review' }).replace('/post?', '/post/photos?'), label: 'Continue to photos' }}
    />
  </>
}
