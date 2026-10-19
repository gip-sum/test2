import {
  CONSTRUCTION_LABEL,
  FACING_LABEL,
  FURNISHING_LABEL,
  OWNERSHIP_LABEL,
  PROPERTY_TYPE_LABEL,
  type PropertyDetail,
} from '@/lib/property/types'

/**
 * The specification sheet.
 *
 * Definition lists, not a table and not a grid of divs: every entry is a
 * label bound to a value, which is exactly what `dl` means and exactly what
 * lets a screen reader read "Facing, South" instead of two loose strings.
 *
 * Grouped (UI-16) into the home itself, its building and floor, and its
 * ownership and availability, as label-and-value rows a buyer can run an
 * eye down. It was a grid of fifteen small boxes of equal weight, where
 * "Balconies" competed with "Ownership" and nothing could be found by
 * where it sat. Areas are their own block beside this one (AreaBreakdown).
 *
 * A row with no value is NOT rendered, and a group with no rows is not
 * either. "Floor — of —" tells the buyer nothing and implies the seller
 * answered when they did not; an absent row is honest and shorter.
 */
type Row = { label: string; value: React.ReactNode }

export function KeyDetails({ property }: { property: Partial<PropertyDetail> }) {
  const group = () => {
    const rows: Row[] = []
    const add = (label: string, value: React.ReactNode | undefined | null) => {
      if (value !== undefined && value !== null && value !== '') rows.push({ label, value })
    }
    return { rows, add }
  }

  const home = group()
  home.add('Property type', property.propertyType ? PROPERTY_TYPE_LABEL[property.propertyType] : undefined)
  home.add('Bedrooms', property.propertyType === 'STUDIO' ? 'Studio' : property.bedrooms)
  home.add('Bathrooms', property.bathrooms)
  home.add('Balconies', property.balconies)
  home.add('Furnishing', property.furnishing ? FURNISHING_LABEL[property.furnishing] : undefined)
  home.add('Facing', property.facing ? FACING_LABEL[property.facing] : undefined)

  const building = group()
  building.add(
    'Floor',
    property.floor != null && property.totalFloors != null
      ? `${property.floor === 0 ? 'Ground' : property.floor} of ${property.totalFloors}`
      : undefined,
  )
  building.add('Construction', property.constructionStatus ? CONSTRUCTION_LABEL[property.constructionStatus] : undefined)
  building.add(
    'Age',
    property.ageYears != null
      ? property.ageYears === 0
        ? 'New construction'
        : `${property.ageYears} ${property.ageYears === 1 ? 'year' : 'years'}`
      : undefined,
  )
  building.add('Parking', property.parkingSpaces == null ? undefined : property.parkingSpaces === 0 ? 'None' : `${property.parkingSpaces} covered`)

  const terms = group()
  terms.add('Ownership', property.ownershipType ? OWNERSHIP_LABEL[property.ownershipType] : undefined)
  terms.add(
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

  // No area rows: every caller (property page, published listing, preview,
  // moderation) shows AreaBreakdown, which states all three bases and the
  // basis of the rate. Repeating them here printed each area twice.
  const groups = [
    { title: 'The home', rows: home.rows },
    { title: 'Building and floor', rows: building.rows },
    { title: 'Ownership and availability', rows: terms.rows },
  ].filter((g) => g.rows.length > 0)

  return (
    <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
      {groups.map((g) => (
        <div key={g.title} className="min-w-0">
          <h3 className="text-overline uppercase text-ink-500">{g.title}</h3>
          <dl className="mt-2">
            {g.rows.map((row) => (
              <div key={row.label} className="flex min-h-11 items-baseline justify-between gap-4 border-b border-border-subtle py-2.5 last:border-b-0">
                <dt className="text-body text-ink-700">{row.label}</dt>
                <dd className="min-w-0 text-right text-body font-semibold text-ink-900 [overflow-wrap:anywhere]">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}
