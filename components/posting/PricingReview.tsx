import Link from 'next/link'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { formatPriceExact, groupIndian } from '@/lib/format/price'
import type { DetailInput, PropertyFacts } from '@/lib/posting/details'
import { postingUrl } from '@/lib/posting/entry'
import type { CompleteEntry } from '@/lib/posting/flow'
import type { LocationInput } from '@/lib/posting/location'
import { pricingRate, type PricingInput, type PropertyPricing, type PricingKey } from '@/lib/posting/pricing'
import { pricingFieldId } from './PricingForm'

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
    <h2 className="mt-8 font-display text-heading-3 text-ink-900">Property pricing</h2>
    <dl aria-label="Property pricing" className="mt-3 divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface-000 px-5 sm:px-7">
      {rows.map((row) => <div key={row.key} className="flex min-h-20 items-center justify-between gap-3 py-4">
        <div className="min-w-0"><dt className="text-caption text-ink-500">{row.label}</dt><dd className="mt-1 break-words text-body-lg font-semibold text-ink-900 [overflow-wrap:anywhere]">{row.value}</dd></div>
        <Link href={edit(row.key)} aria-label={`Change ${row.label}`} className="inline-flex min-h-11 shrink-0 items-center px-3 text-label text-brand-700 underline underline-offset-4">Change</Link>
      </div>)}
      <div className="py-4"><dt className="text-caption text-ink-500">Rate based on carpet area</dt><dd className="mt-1 text-body-lg font-semibold text-ink-900">₹{groupIndian(pricingRate(pricing, facts))} / sq. ft{pricing.intent === 'rent' ? ' per month' : ''}</dd><p className="mt-1 text-body-sm text-ink-500">Rounded to whole rupees. Excludes separate maintenance and deposit.</p></div>
    </dl>
    <div className="mt-6 rounded-lg border border-brand-600/20 bg-brand-100/65 p-5 sm:p-6">
      <h2 className="font-display text-heading-3 text-ink-900">What happens next?</h2>
      <p className="mt-2 text-body text-ink-700">Add property photos next. Your answers are in this page link only: they have not been saved to an account and no property has been posted.</p>
      <Link href={postingUrl(entry, { details: carried, location, pricing: values, step: 'pricing-review' }).replace('/post?', '/post/photos?')} className="mt-4 inline-flex min-h-11 items-center rounded-md bg-brand-600 px-5 font-semibold text-on-brand">Continue to photos →</Link>
    </div>
  </>
}
