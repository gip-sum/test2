import { CalculatorIcon, WalletIcon } from '@/components/ui/icons'

/** The calculators, in the order a buyer needs them: budget first, then the monthly cost. */
export const CALCULATORS = [
  {
    href: '/calculators/budget',
    title: 'How much home can I afford?',
    body: 'From your income, existing EMIs and savings to a price range, and the homes within it.',
    Icon: WalletIcon,
  },
  {
    href: '/calculators/emi',
    title: 'Home loan EMI calculator',
    body: 'The monthly instalment for a price and down payment, with the interest and a yearly schedule.',
    Icon: CalculatorIcon,
  },
] as const
