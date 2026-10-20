'use client'

import { useEffect, useState } from 'react'
import { formatPrice, formatPriceExact } from '@/lib/format/price'

/**
 * Reads back an amount as it is typed (UI-17): "₹62,50,000 · ₹62.5 L", in
 * the same Indian formatting the listing will use, so a missing or extra
 * zero is seen before the review. It only reads the field — the server
 * still decides what is valid — and says nothing until the digits make a
 * whole number. Not a live region: announcing every keystroke would drown
 * the field itself.
 */
export function AmountEcho({ inputId, monthly = false }: { inputId: string; monthly?: boolean }) {
  const [value, setValue] = useState<number | null>(null)
  useEffect(() => {
    const input = document.getElementById(inputId) as HTMLInputElement | null
    if (!input) return
    const read = () => {
      const digits = input.value.replace(/[\s,]/g, '')
      setValue(/^\d{1,13}$/.test(digits) && Number(digits) > 0 ? Number(digits) : null)
    }
    read()
    input.addEventListener('input', read)
    return () => input.removeEventListener('input', read)
  }, [inputId])
  if (value === null) return null
  const exact = formatPriceExact(value), short = formatPrice(value)
  return (
    <p className="mt-2 text-body-sm text-ink-700 tabular">
      <span className="font-semibold text-ink-900">{exact}{monthly ? ' a month' : ''}</span>
      {short !== exact && <span className="text-ink-500"> · {short}</span>}
    </p>
  )
}
