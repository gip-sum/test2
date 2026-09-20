import { formatArea, formatAreaCompact, type AreaBasis, type AreaUnit } from '@/lib/format/area'

/**
 * Area, always with its basis.
 *
 * Carpet, built-up and super built-up are three different legal quantities
 * in India. A bare "1,240 sqft" is not just vague, it is misleading — it
 * produces a wrong price-per-sqft and a wrong comparison. The basis is
 * never optional here, which is the point of having a component.
 */
export function AreaDisplay({
  value,
  unit = 'sqft',
  basis,
  variant = 'compact',
  className,
}: {
  value: number
  unit?: AreaUnit
  basis: AreaBasis
  variant?: 'compact' | 'full'
  className?: string
}) {
  const text = variant === 'full' ? formatArea(value, unit, basis) : formatAreaCompact(value, unit, basis)
  return <span className={className}>{text}</span>
}
