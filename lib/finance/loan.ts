/**
 * Home-loan arithmetic for the calculators (Phase 40A).
 *
 * Pure: no React, no I/O. Inputs and outputs are INTEGER RUPEES, like every
 * other money value in the product; only the interest rate is a decimal
 * percentage. The standard reducing-balance formula is computed in floating
 * point and rounded once, at the edge, so a schedule's yearly principal
 * always adds up to exactly the loan.
 */

export const LAKH = 100_000

/** Monthly rate from an annual percentage: 8.5 → 0.0070833… */
const monthlyRate = (annualPercent: number) => annualPercent / 12 / 100

/**
 * EMI on a reducing balance: P·r·(1+r)^n / ((1+r)^n − 1), or P/n at 0%.
 * Unrounded, so callers that chain it (schedules, affordability) do not
 * compound a rounding error.
 */
export function exactEmi(principal: number, annualPercent: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0
  const r = monthlyRate(annualPercent)
  if (r === 0) return principal / months
  const growth = (1 + r) ** months
  return (principal * r * growth) / (growth - 1)
}

export type EmiResult = {
  loan: number
  emi: number
  totalInterest: number
  totalPayable: number
  schedule: YearRow[]
}
export type YearRow = { year: number; principal: number; interest: number; balance: number }

/**
 * The monthly instalment, what it costs in interest, and year-by-year how
 * the balance falls. Yearly figures are differences of rounded running
 * totals, so they add up exactly: principal to the loan, interest to the
 * total interest.
 */
export function calculateEmi(loan: number, annualPercent: number, years: number): EmiResult {
  const months = years * 12
  const emi = exactEmi(loan, annualPercent, months)
  const r = monthlyRate(annualPercent)
  const schedule: YearRow[] = []
  let balance = loan
  let paidPrincipal = 0
  let paidInterest = 0
  let reportedPrincipal = 0
  let reportedInterest = 0
  for (let month = 1; month <= months; month++) {
    const interest = balance * r
    const principal = month === months ? balance : emi - interest
    balance -= principal
    paidPrincipal += principal
    paidInterest += interest
    if (month % 12 === 0) {
      const p = Math.round(paidPrincipal) - reportedPrincipal
      const i = Math.round(paidInterest) - reportedInterest
      reportedPrincipal += p
      reportedInterest += i
      schedule.push({ year: month / 12, principal: p, interest: i, balance: Math.max(0, loan - reportedPrincipal) })
    }
  }
  return {
    loan,
    emi: Math.round(emi),
    totalInterest: reportedInterest,
    totalPayable: loan + reportedInterest,
    schedule,
  }
}

/**
 * The largest loan a monthly instalment can repay: the EMI formula solved
 * for the principal. Rounded down, never up — a budget must not overstate.
 */
export function maxLoanForEmi(emi: number, annualPercent: number, years: number): number {
  const months = years * 12
  if (emi <= 0 || months <= 0) return 0
  const r = monthlyRate(annualPercent)
  if (r === 0) return Math.floor(emi * months)
  const growth = (1 + r) ** months
  return Math.floor((emi * (growth - 1)) / (r * growth))
}

/**
 * The Reserve Bank of India's loan-to-value ceilings for individual housing
 * loans: a lender may finance at most 90% of a home up to ₹30 lakh, 80%
 * from there to ₹75 lakh, and 75% above. (RBI circulars on individual
 * housing loans, most recently October 2020.) They are regulation, not a
 * platform estimate — if the RBI changes them, this table is the only
 * place that changes.
 */
export const LTV_BANDS = [
  { upTo: 30 * LAKH, share: 0.9 },
  { upTo: 75 * LAKH, share: 0.8 },
  { upTo: Infinity, share: 0.75 },
] as const

export function maxLoanShare(price: number): number {
  return LTV_BANDS.find((b) => price <= b.upTo)!.share
}

/** The most a lender may finance on a home at this price. */
export function maxLoanForPrice(price: number): number {
  return Math.floor(price * maxLoanShare(price))
}

/**
 * The highest price a down payment can support under the LTV ceilings,
 * however large the loan. Each band needs at least (1 − share) of the price
 * in cash; the answer is the best band the savings can reach. The feasible
 * prices always form one range from zero, because a cheaper home never
 * needs a larger share down.
 */
export function maxPriceForDownPayment(downPayment: number): number {
  let best = downPayment // a home bought outright needs no loan at all
  let floor = 0
  for (const band of LTV_BANDS) {
    const cap = Math.floor(downPayment / (1 - band.share))
    const reach = Math.min(cap, band.upTo)
    if (reach > floor) best = Math.max(best, reach)
    floor = band.upTo
  }
  return best
}

export type Affordability = {
  /** What is left for a new EMI after existing ones, within the chosen share of income. */
  emi: number
  /** The largest loan that EMI repays over the tenure. */
  loanByIncome: number
  /** The price ceiling, and the loan it actually needs. */
  budget: number
  loan: number
  downPayment: number
  /** Which limit set the budget: repayments, or the cash for the down payment. */
  limitedBy: 'income' | 'down-payment'
}

/**
 * How much home a household can afford.
 *
 * Two independent limits, and the budget is the lower:
 *  • income — a lender caps all EMIs at a share of take-home pay, so the
 *    new EMI is that share minus existing EMIs, and it repays a finite loan;
 *  • down payment — the LTV ceilings mean the savings must cover a minimum
 *    share of the price.
 * Stamp duty, registration and other charges are not included; the page
 * says so beside the result.
 */
export function calculateAffordability(input: {
  monthlyIncome: number
  existingEmis: number
  savings: number
  annualPercent: number
  years: number
  emiSharePercent: number
}): Affordability {
  const { monthlyIncome, existingEmis, savings, annualPercent, years, emiSharePercent } = input
  const emi = Math.max(0, Math.floor((monthlyIncome * emiSharePercent) / 100) - existingEmis)
  const loanByIncome = maxLoanForEmi(emi, annualPercent, years)
  const byIncome = savings + loanByIncome
  const byDownPayment = maxPriceForDownPayment(savings)
  const budget = Math.min(byIncome, byDownPayment)
  const loan = Math.max(0, budget - savings)
  return {
    emi,
    loanByIncome,
    budget,
    loan,
    downPayment: budget - loan,
    limitedBy: byIncome <= byDownPayment ? 'income' : 'down-payment',
  }
}
