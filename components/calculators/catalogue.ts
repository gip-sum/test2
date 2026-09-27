import { CalculatorIcon, WalletIcon } from '@/components/ui/icons'

/** The calculators, in the order a buyer needs them: budget first, then the monthly cost. */
export const CALCULATORS = [
  {
    href: '/calculators/budget',
    title: 'How much home can I afford?',
    body: 'From your income, existing EMIs and savings to a price range, and the homes within it.',
    // One line, for the marketplace menu (Phase C).
    summary: 'A price range from your income and savings',
    Icon: WalletIcon,
  },
  {
    href: '/calculators/emi',
    title: 'Home loan EMI calculator',
    body: 'The monthly instalment for a price and down payment, with the interest and a yearly schedule.',
    summary: 'The monthly instalment on a home loan',
    Icon: CalculatorIcon,
  },
] as const
