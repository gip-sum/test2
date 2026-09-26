'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CalcField } from './CalcField'
import { ResultPeek } from './ResultPeek'
import { useQuerySync } from './useQuerySync'
import { calculateAffordability, maxLoanShare } from '@/lib/finance/loan'
import { BUDGET_FIELDS, parseBudget, toQuery, type BudgetKey, type RawValues } from '@/lib/finance/params'
import { formatAmount, groupIndian } from '@/lib/format/price'
import { buildSearchUrl } from '@/lib/search/query'
import { LAUNCH_CITY } from '@/lib/brand'

const PATH = '/calculators/budget'
const SLIDERS: Record<BudgetKey, { min: number; max: number; step: number }> = {
  income: { min: 10_000, max: 10_00_000, step: 5_000 },
  emis: { min: 0, max: 2_00_000, step: 1_000 },
  savings: { min: 0, max: 2_00_00_000, step: 50_000 },
  rate: { min: 5, max: 15, step: 0.05 },
  years: { min: 1, max: 30, step: 1 },
  share: { min: 20, max: 60, step: 1 },
}

/**
 * "How much home can I afford?"
 *
 * Two limits decide it, and the page says which one did: what the income
 * can repay, and what the savings can put down under the RBI's
 * loan-to-value rules. The answer links straight into a real search capped
 * at that budget, which is the point of asking.
 */
export function BudgetCalculator({ initial }: { initial: RawValues<BudgetKey> }) {
  const [raw, setRaw] = useState(initial)
  const parsed = parseBudget(raw)
  const result = parsed.ok
    ? calculateAffordability({
        monthlyIncome: parsed.values.income,
        existingEmis: parsed.values.emis,
        savings: parsed.values.savings,
        annualPercent: parsed.values.rate,
        years: parsed.values.years,
        emiSharePercent: parsed.values.share,
      })
    : null
  useQuerySync(PATH, parsed.ok ? toQuery(BUDGET_FIELDS, parsed.values) : null)
  const set = (key: BudgetKey) => (value: string) => setRaw((prev) => ({ ...prev, [key]: value }))

  return (
    <div className="calc-layout">
      <form method="get" action={PATH} className="calc-form" aria-label="Your finances" onSubmit={(e) => e.preventDefault()}>
        <CalcField name="income" spec={BUDGET_FIELDS.income} raw={raw.income} error={parsed.errors.income} onChange={set('income')} slider={SLIDERS.income}
          hint="After tax, for everyone who will repay the loan." />
        <CalcField name="emis" spec={BUDGET_FIELDS.emis} raw={raw.emis} error={parsed.errors.emis} onChange={set('emis')} slider={SLIDERS.emis}
          hint="Car, personal and other loans you already repay." />
        <CalcField name="savings" spec={BUDGET_FIELDS.savings} raw={raw.savings} error={parsed.errors.savings} onChange={set('savings')} slider={SLIDERS.savings} />
        <CalcField name="rate" spec={BUDGET_FIELDS.rate} raw={raw.rate} error={parsed.errors.rate} onChange={set('rate')} slider={SLIDERS.rate}
          hint="An example rate. Use the rate your lender offers you." />
        <CalcField name="years" spec={BUDGET_FIELDS.years} raw={raw.years} error={parsed.errors.years} onChange={set('years')} slider={SLIDERS.years} />
        <CalcField name="share" spec={BUDGET_FIELDS.share} raw={raw.share} error={parsed.errors.share} onChange={set('share')} slider={SLIDERS.share}
          hint="Lenders usually keep all EMIs within about 40–50% of take-home pay; each sets its own limit." />
        <noscript>
          <button type="submit" className="h-12 w-full rounded-md bg-brand-600 text-label text-on-brand">Work out my budget</button>
        </noscript>
      </form>

      <section aria-labelledby="budget-result" className="calc-result">
        <h2 id="budget-result" className="text-overline uppercase tracking-[0.14em] text-brand-600">Your home budget</h2>
        <p className="sr-only" aria-live="polite">
          {result ? `Budget up to ${formatAmount(result.budget)}` : 'Correct the highlighted figures to see your budget'}
        </p>
        {result && parsed.ok ? (
          <>
            <p className="calc-hero tabular">
              <span className="calc-hero-unit">up to </span>{formatAmount(result.budget)}
            </p>
            <p className="mt-1 text-body-sm text-ink-700 tabular">₹{groupIndian(result.budget)} for the home itself</p>
            <dl className="calc-figures">
              <div><dt>Down payment</dt><dd className="tabular">₹{groupIndian(result.downPayment)}</dd></div>
              <div><dt>Home loan</dt><dd className="tabular">₹{groupIndian(result.loan)}</dd></div>
              <div><dt>New EMI, at most</dt><dd className="tabular">₹{groupIndian(result.emi)}/mo</dd></div>
            </dl>

            <div className="calc-reason">
              <h3 className="text-label font-semibold text-ink-900">What sets this budget</h3>
              {result.emi === 0 ? (
                <p>
                  Your existing EMIs already use your {parsed.values.share}% share of income, so there is no room for a home-loan EMI. The budget is your savings alone.
                </p>
              ) : result.limitedBy === 'income' ? (
                <p>
                  <strong>Your repayments.</strong> A {formatAmount(result.emi)} monthly EMI repays at most {formatAmount(result.loanByIncome)} over {parsed.values.years} years at {parsed.values.rate}%.
                  {' '}More income, fewer existing EMIs or a longer tenure would raise it; more savings would add to it rupee for rupee.
                </p>
              ) : (
                <p>
                  <strong>Your down payment.</strong> Under RBI rules a lender may finance at most {Math.round(maxLoanShare(result.budget) * 100)}% of a
                  {' '}{formatAmount(result.budget)} home, so your savings must cover the rest. Your income could repay up to {formatAmount(result.loanByIncome)}; saving more would raise the budget.
                </p>
              )}
            </div>

            <p className="mt-4 text-caption text-ink-500">
              The price of the home only. Keep money aside for stamp duty, registration, interiors and moving, which are not included. A lender decides the final loan from your credit history and documents.
            </p>
            {result.budget > 0 && (
              <Link href={buildSearchUrl({ intent: 'buy', city: LAUNCH_CITY.slug, priceMax: result.budget })} className="calc-cta">
                See homes up to {formatAmount(result.budget)} in {LAUNCH_CITY.name}
              </Link>
            )}
          </>
        ) : (
          <p className="mt-3 text-body text-ink-700">Correct the highlighted {Object.keys(parsed.errors).length === 1 ? 'figure' : 'figures'} to see your budget.</p>
        )}
      </section>
      <ResultPeek targetId="budget-result" label="Your home budget" value={result ? `Up to ${formatAmount(result.budget)}` : null} />
    </div>
  )
}
