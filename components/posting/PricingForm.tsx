import { Button } from '@/components/ui/Button'
import { detailPairs, type DetailInput } from '@/lib/posting/details'
import { locationPairs, type LocationInput } from '@/lib/posting/location'
import type { CompleteEntry } from '@/lib/posting/flow'
import { PRICING_KEYS, type PricingInput, type PricingErrors, type PricingKey } from '@/lib/posting/pricing'
import { ErrorSummary } from './ErrorSummary'

export const pricingFieldId = (key: PricingKey) => `pricing-${key}`
export function PricingForm({ entry, carried, location, values, errors }: {
  entry: CompleteEntry; carried: DetailInput; location: LocationInput; values: PricingInput; errors: PricingErrors
}) {
  const field = (key: PricingKey, label: string, hint: string, options?: { value: string; label: string }[]) => {
    const error = errors[key]
    const common = { id: pricingFieldId(key), name: key, defaultValue: values[key] ?? '',
      'aria-invalid': error ? true as const : undefined,
      'aria-describedby': `${key}-pricing-hint${error ? ` ${key}-pricing-error` : ''}`,
      className: 'mt-2 block min-h-12 w-full min-w-0 rounded-md border border-border-strong bg-surface-000 px-3 py-3 text-base text-ink-900 tabular aria-[invalid=true]:border-danger-600 aria-[invalid=true]:border-2' }
    return <div className="min-w-0" key={key}>
      <label htmlFor={common.id} className="block text-label text-ink-900">{label}</label>
      <p id={`${key}-pricing-hint`} className="mt-1 text-body-sm text-ink-500">{hint}</p>
      {options ? <select {...common}><option value="">Choose an answer</option>
        {values[key] && !options.some((o) => o.value === values[key]) && <option value={values[key]}>Choose again — invalid answer</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select> : <input {...common} type="text" inputMode="numeric" maxLength={24} autoComplete="off" />}
      {error && <p id={`${key}-pricing-error`} className="mt-2 text-body-sm font-semibold text-danger-600"><span className="sr-only">Error: </span>{error}</p>}
    </div>
  }
  return <>
    <h1 id="post-heading" className="font-display text-heading-1 text-ink-900 sm:text-[40px] sm:leading-tight">Set the property price.</h1>
    <p className="mt-3 text-body-lg text-ink-700">Enter amounts in whole rupees. We calculate the rate from your carpet area when you review.</p>
    <form method="get" action="/post" noValidate className="post-pricing-form mt-6 grid gap-6">
      {Object.values(errors).some(Boolean) && <ErrorSummary errors={PRICING_KEYS.flatMap((key) => errors[key] ? [{ id: pricingFieldId(key), message: errors[key]! }] : [])} />}
      <input type="hidden" name="role" value={entry.role} /><input type="hidden" name="intent" value={entry.intent} /><input type="hidden" name="type" value={entry.type} />
      {[...detailPairs(carried), ...locationPairs(location)].map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      {entry.intent === 'buy' ? field('saleprice', 'Sale price (₹)', 'Total asking price, for example 62,50,000. Use digits, without ₹, lakh or crore.') : <>
        {field('rent', 'Monthly rent (₹)', 'Rent for one month, for example 25,000. Keep maintenance separate below.')}
        {field('deposit', 'Security deposit (₹)', 'Total security deposit, not a monthly charge. Enter 0 if no deposit is required.')}
      </>}
      {field('maintenance', 'Monthly maintenance', 'State how maintenance is charged. Unknown is different from no charge.', [
        { value: 'separate', label: 'Charged separately' }, ...(entry.intent === 'rent' ? [{ value: 'included', label: 'Included in rent' }] : []),
        { value: 'none', label: 'No maintenance charge' }, { value: 'unknown', label: 'Not known yet' },
      ])}
      <div className="post-if-maintenance">{field('maintenanceAmount', 'Monthly maintenance amount (₹)', 'Required only when maintenance is charged separately. Enter the amount for one month.')}</div>
      {field('negotiable', 'Is the price negotiable?', 'Buyers or tenants can see whether you are open to discussing the asking price.', [{ value: 'yes', label: 'Yes, negotiable' }, { value: 'no', label: 'No, fixed price' }])}
      <input type="hidden" name="step" value="pricing-review" />
      <div className="border-t border-border-subtle pt-6"><Button type="submit" variant="supply" size="lg" className="w-full sm:w-auto">Review property and pricing</Button>
        <p className="mt-3 text-body-sm text-ink-500">Nothing is saved or posted yet. Your answers stay in this page link.</p></div>
    </form>
  </>
}
