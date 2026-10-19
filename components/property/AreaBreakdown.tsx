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
export function AreaBreakdown({ property }: { property: Pick<PropertyDetail, 'carpetArea' | 'builtUpArea' | 'superArea' | 'areaUnit' | 'price'> & Partial<Pick<PropertyDetail, 'intent'>> }) {
  const bases = [
    { basis: 'carpet' as const, label: 'Carpet', value: property.carpetArea },
    { basis: 'builtup' as const, label: 'Built-up', value: property.builtUpArea },
    { basis: 'super' as const, label: 'Super built-up', value: property.superArea },
  ].filter((b) => b.value != null)

  return (
    <div>
      {/* One panel, the carpet basis marked as the one the rate uses (UI-16;
          it was three equal boxes, and nothing said which one mattered). */}
      <ul className="grid divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-subtle bg-surface-000 sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-y-0">
        {bases.map((b) => (
          <li key={b.basis} className={b.basis === 'carpet' ? 'bg-brand-50 px-4 py-3' : 'px-4 py-3'}>
            <p className="flex flex-wrap items-center gap-x-2 text-caption text-ink-500">
              {b.label}
              {b.basis === 'carpet' && <span className="font-semibold text-brand-700">Rate basis</span>}
            </p>
            <p className="mt-0.5 text-body-lg font-semibold text-ink-900 tabular">
              <AreaDisplay value={b.value!} unit={property.areaUnit} basis={b.basis} variant="compact" />
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-body-sm text-ink-700">
        {property.intent === 'rent' ? 'The monthly rent rate' : 'The rate shown on this page'} —{' '}
        <span className="font-semibold tabular">
          {formatPricePerArea(property.price, property.carpetArea * (property.areaUnit === 'sqm' ? 10.7639 : property.areaUnit === 'sqyd' ? 9 : 1))}
        </span>{property.intent === 'rent' ? ' per month' : ''}{' '}
        — is calculated on <strong className="font-semibold">carpet area</strong>, the space you can
        actually use.
        {bases.length > 1
          ? ' Built-up adds wall thickness, and super built-up adds a share of lifts, lobbies and corridors, so a rate quoted on either looks lower for the same flat.'
          : ' The seller has not stated built-up or super built-up area for this property.'}
      </p>
    </div>
  )
}
