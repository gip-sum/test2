import { describe, it, expect } from 'vitest'
import {
  groupIndian,
  formatPrice,
  formatPriceExact,
  formatRent,
  formatPricePerArea,
} from './price'
import { formatArea, formatAreaCompact, formatConfiguration } from './area'

describe('groupIndian', () => {
  it('groups the Indian way: last three, then pairs', () => {
    expect(groupIndian(100)).toBe('100')
    expect(groupIndian(1000)).toBe('1,000')
    expect(groupIndian(85000)).toBe('85,000')
    expect(groupIndian(100000)).toBe('1,00,000')
    expect(groupIndian(6250000)).toBe('62,50,000')
    expect(groupIndian(12500000)).toBe('1,25,00,000')
    expect(groupIndian(1000000000)).toBe('1,00,00,00,000')
  })
})

describe('formatPrice', () => {
  it('uses lakh and crore the way Indian buyers read them', () => {
    expect(formatPrice(85000)).toBe('₹85,000')
    expect(formatPrice(100000)).toBe('₹1 L')
    expect(formatPrice(6250000)).toBe('₹62.5 L')
    expect(formatPrice(10000000)).toBe('₹1 Cr')
    expect(formatPrice(12500000)).toBe('₹1.25 Cr')
  })

  it('does not print trailing zeros', () => {
    expect(formatPrice(5000000)).toBe('₹50 L')
    expect(formatPrice(20000000)).toBe('₹2 Cr')
  })

  it('never renders a meaningless zero price', () => {
    expect(formatPrice(0)).toBe('Price on request')
    expect(formatPrice(-1)).toBe('Price on request')
    expect(formatPrice(Number.NaN)).toBe('Price on request')
  })

  it('always includes the rupee sign', () => {
    // Regression guard for the font finding: if ₹ ever stops rendering it is
    // a font-subset problem, not a formatting one. This locks the string.
    expect(formatPrice(6250000).startsWith('₹')).toBe(true)
    expect(formatPrice(6250000).charCodeAt(0)).toBe(0x20b9)
  })
})

describe('formatPriceExact', () => {
  it('shows the full grouped figure', () => {
    expect(formatPriceExact(12500000)).toBe('₹1,25,00,000')
    expect(formatPriceExact(6250000)).toBe('₹62,50,000')
  })
})

describe('formatRent', () => {
  it('keeps whole numbers up to a lakh', () => {
    expect(formatRent(22000)).toBe('₹22,000/mo')
    expect(formatRent(42000)).toBe('₹42,000/mo')
  })
  it('switches to compact above a lakh', () => {
    expect(formatRent(150000)).toBe('₹1.5 L/mo')
  })
  it('handles missing rent', () => {
    expect(formatRent(0)).toBe('Rent on request')
  })
})

describe('formatPricePerArea', () => {
  it('rounds to whole rupees', () => {
    expect(formatPricePerArea(6250000, 1240)).toBe('₹5,040 per sqft')
  })
  it('returns null rather than dividing by zero', () => {
    expect(formatPricePerArea(6250000, 0)).toBeNull()
    expect(formatPricePerArea(0, 1240)).toBeNull()
  })
})

describe('formatArea', () => {
  it('always names the basis', () => {
    expect(formatArea(1240, 'sqft', 'carpet')).toBe('1,240 sqft carpet')
    expect(formatArea(1580, 'sqft', 'super')).toBe('1,580 sqft super built-up')
    expect(formatArea(1400, 'sqft', 'builtup')).toBe('1,400 sqft built-up')
  })
  it('compact form keeps the basis in brackets', () => {
    expect(formatAreaCompact(1240, 'sqft', 'carpet')).toBe('1,240 sqft (carpet)')
  })
  it('degrades to a dash rather than showing 0', () => {
    expect(formatArea(0, 'sqft', 'carpet')).toBe('—')
  })
})

describe('formatConfiguration', () => {
  it('omits missing parts instead of printing zero', () => {
    expect(formatConfiguration(3, 2)).toBe('3 BHK · 2 Baths')
    expect(formatConfiguration(1, 1)).toBe('1 BHK · 1 Bath')
    expect(formatConfiguration(3, null)).toBe('3 BHK')
    expect(formatConfiguration(null, 2)).toBe('2 Baths')
    expect(formatConfiguration(0, 0)).toBe('')
  })
})
