import { Button } from '@/components/ui/Button'
import { FormField, fieldControlClass } from '@/components/ui/FormField'
import { detailPairs, type DetailInput } from '@/lib/posting/details'
import { locationPairs, type LocationInput } from '@/lib/posting/location'
import type { CompleteEntry } from '@/lib/posting/flow'
import { PRICING_KEYS, type PricingInput, type PricingErrors, type PricingKey } from '@/lib/posting/pricing'
import { ErrorSummary } from './ErrorSummary'
import { AmountEcho } from './AmountEcho'
import { ChipGroup } from './DetailsForm'
import { FormSection, StepActions, StepHeading } from './PostingWorkspace'
import { cn } from '@/lib/cn'

export const pricingFieldId = (key: PricingKey) => `pricing-${key}`
export function PricingForm({ entry, carried, location, values, errors }: {
  entry: CompleteEntry; carried: DetailInput; location: LocationInput; values: PricingInput; errors: PricingErrors
}) {
  // Label, hint, error and their ARIA come from the shared FormField (UI-09).
  // An amount carries a ₹ inside the field and reads back as typed.
  const amount = (key: PricingKey, label: string, hint: string, opts: { lead?: boolean; monthly?: boolean } = {}) => (
    <FormField key={key} id={pricingFieldId(key)} messageId={`${key}-pricing`} label={label} hint={hint} error={errors[key]}>
      {(control) => <>
        <div className="relative">
          <span aria-hidden className={cn('pointer-events-none absolute left-3 top-1/2 mt-1 -translate-y-1/2 font-semibold text-ink-500', opts.lead ? 'text-heading-3' : 'text-body')}>₹</span>
          <input {...control} name={key} defaultValue={values[key] ?? ''} type="text" inputMode="numeric" maxLength={24} autoComplete="off" className={cn(fieldControlClass, 'tabular', opts.lead ? 'min-h-14 pl-9 text-heading-3 font-semibold' : 'pl-8')} />
        </div>
        <AmountEcho inputId={pricingFieldId(key)} monthly={opts.monthly} />
      </>}
    </FormField>
  )
  const maintenanceOptions = [
    { value: 'separate', label: 'Charged separately', description: 'A monthly amount on top of the price.' },
    ...(entry.intent === 'rent' ? [{ value: 'included', label: 'Included in rent', description: 'The rent covers it.' }] : []),
    { value: 'none', label: 'No maintenance charge', description: 'Nothing is charged.' },
    { value: 'unknown', label: 'Not known yet', description: 'Different from no charge.' },
  ]
  return <>
    <StepHeading title="Set the property price." lede="Enter amounts in whole rupees. We calculate the rate from your carpet area when you review." />
    <form method="get" action="/post" noValidate className="post-pricing-form mt-8 grid gap-7">
      {Object.values(errors).some(Boolean) && <ErrorSummary errors={PRICING_KEYS.flatMap((key) => errors[key] ? [{ id: pricingFieldId(key), message: errors[key]! }] : [])} />}
      <input type="hidden" name="role" value={entry.role} /><input type="hidden" name="intent" value={entry.intent} /><input type="hidden" name="type" value={entry.type} />
      {[...detailPairs(carried), ...locationPairs(location)].map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      <FormSection first title={entry.intent === 'buy' ? 'Asking price' : 'Rent and deposit'} description={entry.intent === 'buy' ? 'The total price buyers see first.' : 'The monthly rent buyers see first, and the deposit held.'}>
        {entry.intent === 'buy' ? amount('saleprice', 'Sale price', 'Total asking price, for example 62,50,000. Use digits, without lakh or crore.', { lead: true }) : <>
          {amount('rent', 'Monthly rent', 'Rent for one month, for example 25,000. Keep maintenance separate below.', { lead: true, monthly: true })}
          {amount('deposit', 'Security deposit', 'Total security deposit, not a monthly charge. Enter 0 if no deposit is required.')}
        </>}
      </FormSection>
      <FormSection title="Maintenance" description="How the monthly society or building charge is handled.">
        <ChipGroup name="maintenance" legend="Monthly maintenance" hint="Unknown is different from no charge." variant="card" firstId={pricingFieldId('maintenance')} options={maintenanceOptions} values={values} errors={{ maintenance: errors.maintenance }} />
        <div className="post-if-maintenance">{amount('maintenanceAmount', 'Monthly maintenance amount', 'Required only when maintenance is charged separately. Enter the amount for one month.', { monthly: true })}</div>
      </FormSection>
      <FormSection title="Negotiation" description="Buyers and tenants see whether you are open to discussing the price.">
        <ChipGroup name="negotiable" legend="Is the price negotiable?" variant="card" firstId={pricingFieldId('negotiable')} options={[{ value: 'yes', label: 'Yes, negotiable', description: 'Open to offers.' }, { value: 'no', label: 'No, fixed price', description: 'The price as stated.' }]} values={values} errors={{ negotiable: errors.negotiable }} />
      </FormSection>
      <input type="hidden" name="step" value="pricing-review" />
      <StepActions>
        <Button type="submit" variant="supply" size="lg" className="w-full sm:w-auto">Review property and pricing</Button>
      </StepActions>
    </form>
  </>
}
