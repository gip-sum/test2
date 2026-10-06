import { AreaDisplay } from './AreaDisplay'
import {
  CONSTRUCTION_LABEL,
  FACING_LABEL,
  FURNISHING_LABEL,
  OWNERSHIP_LABEL,
  PROPERTY_TYPE_LABEL,
  type PropertyDetail,
} from '@/lib/property/types'

/**
 * The specification grid.
 *
 * A definition list, not a table and not a grid of divs: every entry is a
 * label bound to a value, which is exactly what `dl` means and exactly what
 * lets a screen reader read "Facing, South" instead of two loose strings.
 *
 * A row with no value is NOT rendered. "Floor — of —" tells the buyer
 * nothing and implies the seller answered when they did not; an absent row
 * is honest and shorter.
 */
export function KeyDetails({ property }: { property: Partial<PropertyDetail> }) {
  const rows: Array<{ label: string; value: React.ReactNode }> = []
  const add = (label: string, value: React.ReactNode | undefined | null) => {
    if (value !== undefined && value !== null && value !== '') rows.push({ label, value })
  }

  add('Property type', property.propertyType ? PROPERTY_TYPE_LABEL[property.propertyType] : undefined)
  add('Construction', property.constructionStatus ? CONSTRUCTION_LABEL[property.constructionStatus] : undefined)
  add('Furnishing', property.furnishing ? FURNISHING_LABEL[property.furnishing] : undefined)
  add('Bedrooms', property.propertyType === 'STUDIO' ? 'Studio' : property.bedrooms)
  add('Bathrooms', property.bathrooms)
  add('Balconies', property.balconies)
  add(
    'Floor',
    property.floor != null && property.totalFloors != null
      ? `${property.floor === 0 ? 'Ground' : property.floor} of ${property.totalFloors}`
      : undefined,
  )
  add('Facing', property.facing ? FACING_LABEL[property.facing] : undefined)
  add(
    'Carpet area',
    property.carpetArea != null ? <AreaDisplay value={property.carpetArea} unit={property.areaUnit} basis="carpet" /> : undefined,
  )
  add(
    'Built-up area',
    property.builtUpArea != null ? (
      <AreaDisplay value={property.builtUpArea} unit={property.areaUnit} basis="builtup" />
    ) : undefined,
  )
  add(
    'Super built-up area',
    property.superArea != null ? (
      <AreaDisplay value={property.superArea} unit={property.areaUnit} basis="super" />
    ) : undefined,
  )
  add(
    'Age',
    property.ageYears != null
      ? property.ageYears === 0
        ? 'New construction'
        : `${property.ageYears} ${property.ageYears === 1 ? 'year' : 'years'}`
      : undefined,
  )
  add('Parking', property.parkingSpaces == null ? undefined : property.parkingSpaces === 0 ? 'None' : `${property.parkingSpaces} covered`)
  add('Ownership', property.ownershipType ? OWNERSHIP_LABEL[property.ownershipType] : undefined)
  add(
    'Available from',
    property.availableFrom
      ? new Date(`${property.availableFrom}T00:00:00Z`).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : undefined,
  )

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0 rounded-md border border-border-subtle bg-surface-000 px-3 py-2.5">
          <dt className="text-caption text-ink-500">{row.label}</dt>
          <dd className="mt-0.5 truncate text-body-sm font-semibold text-ink-900">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
