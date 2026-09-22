import { AMENITY_LABEL, AMENITY_ORDER, type AmenityCode } from '@/lib/property/types'

/**
 * What the property and its building offer.
 *
 * Grouped, because "Lift, Power backup, Security, Gym, Swimming pool,
 * Clubhouse" as one run reads as marketing; split into what the building
 * provides versus what the complex provides, it reads as information.
 *
 * ABSENCE IS NEVER IMPLIED AS PRESENCE. Only amenities the seller stated
 * are listed. There is no greyed-out "no gym" row, because the seller not
 * ticking a box is not the same as the building lacking the thing, and
 * rendering it as absence would be a claim we cannot support.
 *
 * The amenity enum splits when projects arrive (Phase 45/46): a swimming
 * pool belongs to the complex, a modular kitchen to the flat.
 */
const GROUPS: Array<{ title: string; codes: AmenityCode[] }> = [
  { title: 'Building', codes: ['LIFT', 'POWER_BACKUP', 'SECURITY', 'WATER_SUPPLY_24X7'] },
  { title: 'Complex', codes: ['GATED_COMMUNITY', 'PARK', 'CHILDRENS_PLAY_AREA'] },
  { title: 'Recreation', codes: ['GYM', 'SWIMMING_POOL', 'CLUBHOUSE'] },
]

export function AmenityList({ amenities }: { amenities: AmenityCode[] }) {
  const present = new Set(amenities)
  const groups = GROUPS.map((g) => ({
    title: g.title,
    codes: g.codes.filter((c) => present.has(c)),
  })).filter((g) => g.codes.length > 0)

  // Anything the enum gained but the groups have not been taught about
  // still renders, rather than silently vanishing.
  const grouped = new Set(GROUPS.flatMap((g) => g.codes))
  const other = AMENITY_ORDER.filter((c) => present.has(c) && !grouped.has(c))
  if (other.length) groups.push({ title: 'Other', codes: other })

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.title}>
          <h3 className="text-overline uppercase text-ink-500">{group.title}</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {group.codes.map((code) => (
              <li
                key={code}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-000 px-3 py-1.5 text-body-sm text-ink-900"
              >
                <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-trust-600" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 13l4 4L19 7" />
                </svg>
                {AMENITY_LABEL[code]}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
