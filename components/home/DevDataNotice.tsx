import { USING_DEMO_DATA } from '@/lib/property/queries'

/**
 * Honest labelling of seeded inventory.
 *
 * The listings below are development fixtures, not real properties. Saying
 * so plainly is the alternative to inventing marketplace metrics — and it
 * disappears on its own once Phase 5 connects the database.
 */
export function DevDataNotice() {
  if (!USING_DEMO_DATA) return null
  return (
    <div className="border-b border-warn-600/25 bg-warn-100">
      {/* Amber carries the warning; the sentence itself is set in ink so it
          stays readable. Amber text on an amber band reads brown and makes
          the whole strip look like a dark bar in an otherwise white page. */}
      <p className="mx-auto max-w-[1320px] px-4 py-2 text-caption text-ink-900 lg:px-8">
        <strong className="font-semibold text-warn-600">Development build.</strong> Listings shown
        are seeded sample data, not real properties. No seller, price or availability here is
        genuine.
      </p>
    </div>
  )
}
