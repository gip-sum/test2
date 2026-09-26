import type { Metadata } from 'next'
import { PageShell } from '@/components/layout/PageShell'
import { Footer } from '@/components/navigation/Footer'
import { CalculatorFrame } from '@/components/calculators/CalculatorFrame'
import { BudgetCalculator } from '@/components/calculators/BudgetCalculator'
import { BUDGET_FIELDS, rawFromParams } from '@/lib/finance/params'

export const metadata: Metadata = {
  title: 'Home budget calculator — how much home can I afford?',
  description: 'Work out a home budget from your take-home income, existing EMIs and savings, under the RBI loan-to-value limits, then see homes for sale within it.',
}

/** The budget (affordability) calculator (Phase 40A). */
export default async function BudgetCalculatorPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const initial = rawFromParams(BUDGET_FIELDS, await searchParams)
  return (
    <PageShell footer={<Footer />}>
      <CalculatorFrame
        title="How much home can I afford?"
        intro="Start from what you earn and what you have saved. We work out the price a lender could help you reach, and say what is holding it back."
        crumb="Budget"
        sibling={{ href: '/calculators/emi', label: 'Home loan EMI calculator', hint: 'Already have a home in mind? See its monthly cost' }}
      >
        <BudgetCalculator initial={initial} />
      </CalculatorFrame>
    </PageShell>
  )
}
