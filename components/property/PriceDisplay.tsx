import { formatPrice, formatPriceExact, formatRent, formatPricePerArea } from '@/lib/format/price'
import { cn } from '@/lib/cn'

/**
 * Every price in the product renders through this component.
 *
 * It is a component rather than a helper on purpose: centralising it is
 * what stops the same flat appearing as "₹62.5 L" on a card and
 * "6250000" in a table. Set in the display face with tabular figures.
 */
type Props = {
  /** Integer rupees. Sale price, or monthly rent when intent is 'rent'. */
  amount: number
  intent: 'buy' | 'rent'
  /** 'card' on results, 'detail' on the property page. */
  size?: 'card' | 'detail'
  /** Pass carpet area to render the per-sqft rate underneath. */
  areaForRate?: number
  className?: string
}

export function PriceDisplay({ amount, intent, size = 'card', areaForRate, className }: Props) {
  const primary = intent === 'rent' ? formatRent(amount) : formatPrice(amount)
  const rate = areaForRate ? formatPricePerArea(amount, areaForRate) : null

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <p
        className={cn(
          'tabular font-display text-ink-900',
          size === 'detail' ? 'text-price-lg' : 'text-price',
        )}
        // The exact figure is available to assistive tech and on hover,
        // because "₹62.5 L" is a rounding a buyer may want to check.
        title={intent === 'rent' ? undefined : formatPriceExact(amount)}
      >
        {primary}
      </p>
      {rate && <p className="tabular text-caption text-ink-500">{rate}</p>}
    </div>
  )
}
