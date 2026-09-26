import type { Metadata } from 'next'
import { PageShell } from '@/components/layout/PageShell'
import { Footer } from '@/components/navigation/Footer'
import { CalculatorFrame } from '@/components/calculators/CalculatorFrame'
import { EmiCalculator } from '@/components/calculators/EmiCalculator'
import { EMI_FIELDS, rawFromParams } from '@/lib/finance/params'

export const metadata: Metadata = {
  title: 'Home loan EMI calculator',
  description: 'Work out the monthly EMI on a home loan from the property price, down payment, interest rate and tenure, with a year-by-year repayment schedule.',
}

/**
 * The EMI calculator (Phase 40A). The page only reads the query; parsing,
 * defaults and arithmetic live in lib/finance, and the same client
 * component renders the result on the server (for links and no-JS
 * submissions) and live in the browser.
 */
export default async function EmiCalculatorPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const initial = rawFromParams(EMI_FIELDS, await searchParams)
  return (
    <PageShell footer={<Footer />}>
      <CalculatorFrame
        title="Home loan EMI calculator"
        intro="See what a home would cost you each month. Enter the price and what you can put down; change the rate and tenure to compare."
        crumb="EMI"
        sibling={{ href: '/calculators/budget', label: 'How much home can I afford?', hint: 'Start from your income and savings instead' }}
      >
        <EmiCalculator initial={initial} />
      </CalculatorFrame>
    </PageShell>
  )
}
