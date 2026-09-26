import { describe, it, expect } from 'vitest'
import {
  LAKH, calculateAffordability, calculateEmi, exactEmi, maxLoanForEmi, maxLoanForPrice, maxPriceForDownPayment,
} from './loan'
import { BUDGET_FIELDS, EMI_FIELDS, parseBudget, parseEmi, rawFromParams, toQuery } from './params'

describe('EMI', () => {
  it('matches the standard reducing-balance figure', () => {
    // ₹50 lakh at 8.5% for 20 years is ₹43,391 a month on every bank's calculator.
    expect(calculateEmi(50 * LAKH, 8.5, 20).emi).toBe(43_391)
    expect(calculateEmi(25 * LAKH, 9, 15).emi).toBe(25_357)
  })

  it('divides evenly at 0%', () => {
    const r = calculateEmi(12 * LAKH, 0, 10)
    expect(r.emi).toBe(10_000)
    expect(r.totalInterest).toBe(0)
  })

  it('schedules exactly the loan and exactly the interest, in whole rupees', () => {
    const r = calculateEmi(62_50_000, 8.75, 25)
    expect(r.schedule).toHaveLength(25)
    expect(r.schedule.reduce((s, y) => s + y.principal, 0)).toBe(62_50_000)
    expect(r.schedule.reduce((s, y) => s + y.interest, 0)).toBe(r.totalInterest)
    expect(r.schedule.at(-1)!.balance).toBe(0)
    expect(r.schedule.every((y) => Number.isInteger(y.principal) && Number.isInteger(y.interest))).toBe(true)
    expect(r.totalPayable).toBe(r.loan + r.totalInterest)
  })

  it('pays more principal and less interest each year', () => {
    const { schedule } = calculateEmi(40 * LAKH, 8.5, 20)
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i]!.principal).toBeGreaterThan(schedule[i - 1]!.principal)
      expect(schedule[i]!.interest).toBeLessThan(schedule[i - 1]!.interest)
    }
  })
})

describe('loan limits', () => {
  it('inverts the EMI formula without overstating', () => {
    const loan = maxLoanForEmi(43_391, 8.5, 20)
    expect(loan).toBeLessThanOrEqual(50 * LAKH)
    expect(50 * LAKH - loan).toBeLessThan(20)
    expect(exactEmi(loan, 8.5, 240)).toBeLessThanOrEqual(43_391)
  })

  it('applies the RBI loan-to-value bands at their edges', () => {
    expect(maxLoanForPrice(30 * LAKH)).toBe(27 * LAKH)
    expect(maxLoanForPrice(30 * LAKH + 1)).toBe(Math.floor((30 * LAKH + 1) * 0.8))
    expect(maxLoanForPrice(75 * LAKH)).toBe(60 * LAKH)
    expect(maxLoanForPrice(100 * LAKH)).toBe(75 * LAKH)
  })

  it('finds the highest price a down payment reaches', () => {
    expect(maxPriceForDownPayment(0)).toBe(0)
    expect(maxPriceForDownPayment(2 * LAKH)).toBe(20 * LAKH) // 10% down
    expect(maxPriceForDownPayment(4 * LAKH)).toBe(30 * LAKH) // 10% of 30 L, but 20% of anything above
    expect(maxPriceForDownPayment(7 * LAKH)).toBe(35 * LAKH) // 20% down
    expect(maxPriceForDownPayment(16 * LAKH)).toBe(75 * LAKH) // capped at the band's top
    expect(maxPriceForDownPayment(25 * LAKH)).toBe(100 * LAKH) // 25% down
  })
})

describe('affordability', () => {
  const base = { monthlyIncome: 1 * LAKH, existingEmis: 0, savings: 10 * LAKH, annualPercent: 8.5, years: 20, emiSharePercent: 40 }

  it('is limited by income when savings are ample', () => {
    const a = calculateAffordability({ ...base, savings: 50 * LAKH })
    expect(a.limitedBy).toBe('income')
    expect(a.emi).toBe(40_000)
    expect(a.budget).toBe(50 * LAKH + a.loanByIncome)
  })

  it('is limited by the down payment when savings are thin', () => {
    const a = calculateAffordability({ ...base, monthlyIncome: 5 * LAKH, savings: 5 * LAKH })
    expect(a.limitedBy).toBe('down-payment')
    expect(a.budget).toBe(maxPriceForDownPayment(5 * LAKH))
    expect(a.loan).toBeLessThanOrEqual(maxLoanForPrice(a.budget))
  })

  it('takes existing EMIs out of the room for a new one', () => {
    expect(calculateAffordability({ ...base, existingEmis: 15_000 }).emi).toBe(25_000)
    expect(calculateAffordability({ ...base, existingEmis: 60_000 }).emi).toBe(0)
  })

  it('never produces a loan the down payment rules would refuse', () => {
    for (const savings of [0, 1 * LAKH, 3 * LAKH, 6 * LAKH, 15 * LAKH, 20 * LAKH, 40 * LAKH]) {
      for (const monthlyIncome of [20_000, 80_000, 3 * LAKH]) {
        const a = calculateAffordability({ ...base, savings, monthlyIncome })
        expect(a.loan).toBeLessThanOrEqual(Math.max(0, maxLoanForPrice(a.budget)))
        expect(a.loan).toBeLessThanOrEqual(a.loanByIncome)
        expect(a.downPayment + a.loan).toBe(a.budget)
      }
    }
  })
})

describe('calculator parameters', () => {
  it('uses the defaults when the URL says nothing', () => {
    const parsed = parseEmi(rawFromParams(EMI_FIELDS, {}))
    expect(parsed.ok && parsed.values).toEqual({ price: 50 * LAKH, down: 10 * LAKH, rate: 8.5, years: 20 })
  })

  it('reads rupees as people type them', () => {
    const parsed = parseEmi({ price: '62,50,000', down: '₹12,50,000', rate: '8.75%', years: '25' })
    expect(parsed.ok && parsed.values).toEqual({ price: 62_50_000, down: 12_50_000, rate: 8.75, years: 25 })
  })

  it('reports an invalid value instead of guessing', () => {
    const parsed = parseEmi({ price: '62.5 lakh', down: '0', rate: '35', years: '0' })
    expect(parsed.ok).toBe(false)
    expect(Object.keys(parsed.errors).sort()).toEqual(['price', 'rate', 'years'])
    expect(parsed.errors.price).toMatch(/whole number of rupees/)
  })

  it('refuses a down payment at or above the price, and EMIs at or above income', () => {
    expect(parseEmi({ price: '20,00,000', down: '20,00,000', rate: '8.5', years: '20' }).errors.down).toBeDefined()
    expect(parseBudget({ income: '50,000', emis: '50,000', savings: '0', rate: '8.5', years: '20', share: '40' }).errors.emis).toBeDefined()
  })

  it('writes a short canonical query that parses back to the same values', () => {
    const values = { price: 62_50_000, down: 10 * LAKH, rate: 8.5, years: 25 }
    const qs = toQuery(EMI_FIELDS, values)
    expect(qs).toBe('?price=6250000&years=25')
    const back = parseEmi(rawFromParams(EMI_FIELDS, Object.fromEntries(new URLSearchParams(qs))))
    expect(back.ok && back.values).toEqual(values)
    expect(toQuery(BUDGET_FIELDS, { income: 1 * LAKH, emis: 0, savings: 10 * LAKH, rate: 8.5, years: 20, share: 40 })).toBe('')
  })
})
