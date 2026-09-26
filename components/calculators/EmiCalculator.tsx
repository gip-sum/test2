'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CalcField } from './CalcField'
import { ResultPeek } from './ResultPeek'
import { SplitBar } from './SplitBar'
import { useQuerySync } from './useQuerySync'
import { calculateEmi, maxLoanForPrice, maxLoanShare } from '@/lib/finance/loan'
import { EMI_FIELDS, parseEmi, toQuery, type EmiKey, type RawValues } from '@/lib/finance/params'
import { formatAmount, formatPriceExact, groupIndian } from '@/lib/format/price'
import { buildSearchUrl } from '@/lib/search/query'
import { LAUNCH_CITY } from '@/lib/brand'

const PATH = '/calculators/emi'
const SLIDERS: Record<EmiKey, { min: number; max: number; step: number }> = {
  price: { min: 5_00_000, max: 5_00_00_000, step: 50_000 },
  down: { min: 0, max: 2_00_00_000, step: 50_000 },
  rate: { min: 5, max: 15, step: 0.05 },
  years: { min: 1, max: 30, step: 1 },
}

/**
 * Home-loan EMI calculator.
 *
 * Price and down payment rather than a bare loan amount, because that is
 * how a buyer thinks about a listing — and it lets the page say when a
 * loan is larger than the RBI's loan-to-value limits allow a lender to
 * give. The result updates as the person types; the same form submits
 * to the server without JavaScript and renders the same result.
 */
export function EmiCalculator({ initial }: { initial: RawValues<EmiKey> }) {
  const [raw, setRaw] = useState(initial)
  const parsed = parseEmi(raw)
  // At most 360 months of arithmetic: cheap enough to run on every render.
  const result = parsed.ok ? calculateEmi(parsed.values.price - parsed.values.down, parsed.values.rate, parsed.values.years) : null
  useQuerySync(PATH, parsed.ok ? toQuery(EMI_FIELDS, parsed.values) : null)

  const set = (key: EmiKey) => (value: string) => setRaw((prev) => ({ ...prev, [key]: value }))
  const ceiling = parsed.ok ? maxLoanForPrice(parsed.values.price) : 0

  return (
    <div className="calc-layout">
      <form method="get" action={PATH} className="calc-form" aria-label="Loan details" onSubmit={(e) => e.preventDefault()}>
        <CalcField name="price" spec={EMI_FIELDS.price} raw={raw.price} error={parsed.errors.price} onChange={set('price')} slider={SLIDERS.price} />
        <CalcField name="down" spec={EMI_FIELDS.down} raw={raw.down} error={parsed.errors.down} onChange={set('down')} slider={SLIDERS.down} />
        <CalcField name="rate" spec={EMI_FIELDS.rate} raw={raw.rate} error={parsed.errors.rate} onChange={set('rate')} slider={SLIDERS.rate}
          hint="An example rate. Use the rate your lender offers you." />
        <CalcField name="years" spec={EMI_FIELDS.years} raw={raw.years} error={parsed.errors.years} onChange={set('years')} slider={SLIDERS.years} />
        <noscript>
          <button type="submit" className="h-12 w-full rounded-md bg-brand-600 text-label text-on-brand">Calculate EMI</button>
        </noscript>
      </form>

      <section aria-labelledby="emi-result" className="calc-result">
        <h2 id="emi-result" className="text-overline uppercase tracking-[0.14em] text-brand-600">Your monthly EMI</h2>
        {/* Always present, so a screen reader hears each new result once,
            briefly, instead of the whole panel on every keystroke. */}
        <p className="sr-only" aria-live="polite">
          {result ? `EMI ${formatPriceExact(result.emi)} a month` : 'Correct the highlighted figures to see the EMI'}
        </p>
        {result && parsed.ok ? (
          <>
            <p className="calc-hero tabular">
              {formatPriceExact(result.emi)}<span className="calc-hero-unit"> a month</span>
            </p>
            <p className="mt-1 text-body-sm text-ink-700">
              for {parsed.values.years} {parsed.values.years === 1 ? 'year' : 'years'} at {parsed.values.rate}% a year
            </p>
            <dl className="calc-figures">
              <div><dt>Loan amount</dt><dd className="tabular">₹{groupIndian(result.loan)}</dd></div>
              <div><dt>Total interest</dt><dd className="tabular">₹{groupIndian(result.totalInterest)}</dd></div>
              <div><dt>Total repaid</dt><dd className="tabular">₹{groupIndian(result.totalPayable)}</dd></div>
            </dl>

            {result.loan > ceiling && (
              <p className="calc-warning" role="note">
                <strong>Larger than a lender can give.</strong> Lenders may finance at most {Math.round(maxLoanShare(parsed.values.price) * 100)}% of a
                {' '}{formatAmount(parsed.values.price)} home ({formatAmount(ceiling)}), so the down payment would need to be at least
                {' '}₹{groupIndian(parsed.values.price - ceiling)}.
              </p>
            )}

            <SplitBar principal={result.loan} interest={result.totalInterest} />

            <details className="calc-schedule">
              <summary>Year-by-year repayment</summary>
              <div className="overflow-x-auto">
                <table>
                  <caption className="sr-only">Principal and interest repaid each year, and the balance left</caption>
                  <thead>
                    <tr><th scope="col">Year</th><th scope="col">Principal</th><th scope="col">Interest</th><th scope="col">Balance</th></tr>
                  </thead>
                  <tbody>
                    {result.schedule.map((y) => (
                      <tr key={y.year}>
                        <th scope="row">{y.year}</th>
                        <td>₹{groupIndian(y.principal)}</td>
                        <td>₹{groupIndian(y.interest)}</td>
                        <td>₹{groupIndian(y.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            <p className="mt-4 text-caption text-ink-500">
              An estimate, rounded to the nearest rupee. Processing fees, insurance and prepayments are not included, and a lender&apos;s own schedule may differ slightly.
            </p>
            <Link
              href={buildSearchUrl({ intent: 'buy', city: LAUNCH_CITY.slug, priceMax: parsed.values.price })}
              className="calc-cta"
            >
              See homes up to {formatAmount(parsed.values.price)} in {LAUNCH_CITY.name}
            </Link>
          </>
        ) : (
          <p className="mt-3 text-body text-ink-700">Correct the highlighted {Object.keys(parsed.errors).length === 1 ? 'figure' : 'figures'} to see the EMI.</p>
        )}
      </section>
      <ResultPeek targetId="emi-result" label="Monthly EMI" value={result ? `${formatPriceExact(result.emi)} a month` : null} />
    </div>
  )
}
