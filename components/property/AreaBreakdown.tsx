import { AreaDisplay } from './AreaDisplay'
import { formatPricePerArea } from '@/lib/format/price'
import type { PropertyDetail } from '@/lib/property/types'

/**
 * The three area bases, side by side, with the reason they differ.
 *
 * This section exists because conflating them is the single most damaging
 * content error in Indian property listings: super built-up is routinely
 * 25–35% larger than carpet, so a price per square foot computed against
 * the wrong basis understates the real cost by a quarter. Showing all three
 * and stating which the rate uses is how a buyer compares two listings
 * honestly.
 */
export function AreaBreakdown({ property }: { property: PropertyDetail }) {
  const bases = [
    { basis: 'carpet' as const, label: 'Carpet', value: property.carpetArea },
    { basis: 'builtup' as const, label: 'Built-up', value: property.builtUpArea },
    { basis: 'super' as const, label: 'Super built-up', value: property.superArea },
  ].filter((b) => b.value != null)

  return (
    <div>
      <ul className="grid gap-2 sm:grid-cols-3">
        {bases.map((b) => (
          <li key={b.basis} className="rounded-md border border-border-subtle bg-surface-000 px-3 py-2.5">
            <p className="text-caption text-ink-500">{b.label}</p>
            <p className="mt-0.5 text-body font-semibold text-ink-900 tabular">
              <AreaDisplay value={b.value!} unit={property.areaUnit} basis={b.basis} variant="compact" />
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-body-sm text-ink-700">
        The rate shown on this page —{' '}
        <span className="font-semibold tabular">
          {formatPricePerArea(property.price, property.carpetArea)}
        </span>{' '}
        — is calculated on <strong className="font-semibold">carpet area</strong>, the space you can
        actually use.
        {bases.length > 1
          ? ' Built-up adds wall thickness, and super built-up adds a share of lifts, lobbies and corridors, so a rate quoted on either looks lower for the same flat.'
          : ' The seller has not stated built-up or super built-up area for this property.'}
      </p>
    </div>
  )
}
