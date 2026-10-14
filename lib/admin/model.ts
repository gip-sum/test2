/**
 * The admin console (Phase 21), as pure functions of what the database and
 * the app reported. Two rules run through it:
 * - What could not be seen is "unknown", never "OK". A health page that
 *   reads green because a check could not run is worse than no page.
 * - Staff see aggregates and listing facts that are public anyway. No
 *   person's contact details pass through here.
 */

export const ADMIN_STATUSES = ['DRAFT', 'UNDER_REVIEW', 'ACTIVE', 'EXPIRED', 'REJECTED', 'CHANGES_REQUESTED', 'WITHDRAWN', 'REMOVED'] as const
export type AdminStatus = typeof ADMIN_STATUSES[number]
export const ADMIN_FILTERS = [
  { key: 'all', label: 'All', status: null },
  { key: 'review', label: 'Under review', status: 'UNDER_REVIEW' },
  { key: 'active', label: 'Active', status: 'ACTIVE' },
  { key: 'expired', label: 'Expired', status: 'EXPIRED' },
  { key: 'rejected', label: 'Rejected', status: 'REJECTED' },
  { key: 'corrections', label: 'Corrections requested', status: 'CHANGES_REQUESTED' },
  { key: 'withdrawn', label: 'Withdrawn', status: 'WITHDRAWN' },
  { key: 'removed', label: 'Removed', status: 'REMOVED' },
] as const satisfies ReadonlyArray<{ key: string; label: string; status: AdminStatus | null }>
export type AdminFilter = typeof ADMIN_FILTERS[number]['key']
export const ADMIN_PAGE_SIZE = 25
/** A listing waiting longer than this for review is flagged. */
export const REVIEW_OVERDUE_MS = 48 * 3_600_000

/**
 * Every migration in supabase/migrations, oldest first. The system page
 * reports any the database has no record of. A unit test keeps this list
 * equal to the directory, so a new migration cannot be forgotten here.
 */
export const EXPECTED_MIGRATIONS = [
  '20260924032910_phase_07_buyer_profiles',
  '20260924083858_phase_08_saved_properties',
  '20260924153500_phase_09_enquiry_leads',
  '20260924153701_phase_09_private_rpcs',
  '20260924154312_phase_09_lead_indexes',
  '20261003062359_phase_15_private_property_photos',
  '20261004045655_phase_16_property_drafts',
  '20261006151400_phase_17_draft_reviews',
  '20261013175343_phase_18_property_lifecycle',
  '20261013175718_phase_18_listing_expiry_job',
  '20261013192641_phase_19_listing_enquiries',
  '20261014032608_phase_20_listing_analytics',
  '20261014044042_phase_21_admin_console',
  '20261014092721_python_ai_descriptions',
  '20261014142159_phase_22_listing_moderation',
] as const

export type AdminListing = {
  id: string; status: AdminStatus; title: string; seller_name: string; seller_type: 'OWNER' | 'AGENT' | 'BUILDER'
  intent: 'buy' | 'rent'; price: number; locality_name: string; city_name: string
  submitted_at: string; updated_at: string; activated_at: string | null; expires_at: string | null; total: number
}
export type AdminOverview = {
  listings: Partial<Record<AdminStatus, number>>
  drafts_never_submitted: number
  queue: { waiting: number; oldest_since: string | null }
  leads: { last_7_days: number; last_30_days: number; real_listings_30_days: number; no_seller_30_days: number; untouched_over_2_days: number }
  users: { total: number; new_7_days: number; with_listings: number; staff: number }
}
export type DatabaseStatus = {
  migrations: { version: string; name?: string | null }[] | null
  expiry_job: { scheduled: false } | { scheduled: true; last_status: string | null; last_run_at: string | null } | null
  expiry_backlog: number
  last_expiry_at: string | null
  oldest_review_since: string | null
  checked_at: string
}
export type CheckState = 'ok' | 'warning' | 'problem' | 'unknown'
export type Check = { key: string; label: string; state: CheckState; detail: string }
export const CHECK_WORD: Record<CheckState, string> = { ok: 'OK', warning: 'Warning', problem: 'Problem', unknown: 'Unknown' }

export function parseListingsQuery(params: Record<string, string | string[] | undefined>): { status: AdminFilter; page: number } {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const status = ADMIN_FILTERS.find((f) => f.key === one(params.status))?.key ?? 'all'
  const raw = one(params.page)
  return { status, page: raw && /^[1-9]\d{0,4}$/.test(raw) ? Number(raw) : 1 }
}
export function listingsHref(query: { status?: AdminFilter; page?: number }) {
  const params = new URLSearchParams()
  if (query.status && query.status !== 'all') params.set('status', query.status)
  if (query.page && query.page > 1) params.set('page', String(query.page))
  const search = params.toString()
  return '/admin/listings' + (search ? `?${search}` : '')
}

/** "2 days 4 hours", "3 hours", "under an hour": how long something has waited. */
export function formatWait(ms: number): string {
  const hours = Math.floor(Math.max(0, ms) / 3_600_000), days = Math.floor(hours / 24), rest = hours % 24
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  if (days > 0) return rest ? `${unit(days, 'day')} ${unit(rest, 'hour')}` : unit(days, 'day')
  return hours > 0 ? unit(hours, 'hour') : 'under an hour'
}

/** Which expected migrations the database has no record of, matched by name or version. */
export function missingMigrations(applied: NonNullable<DatabaseStatus['migrations']>, expected: readonly string[] = EXPECTED_MIGRATIONS): string[] {
  return expected.filter((file) => {
    const version = file.slice(0, 14), name = file.slice(15)
    return !applied.some((m) => m.version === version || (m.name ?? '').endsWith(name))
  })
}

export function databaseChecks(status: DatabaseStatus, now: number): Check[] {
  const checks: Check[] = []
  if (status.migrations === null) checks.push({ key: 'migrations', label: 'Database migrations', state: 'unknown', detail: 'The migration history cannot be read from here.' })
  else {
    const missing = missingMigrations(status.migrations)
    // A warning, not a problem: a migration applied by hand may be recorded
    // under a different version and name, and this page cannot tell.
    checks.push(missing.length
      ? { key: 'migrations', label: 'Database migrations', state: 'warning', detail: `Not found in the migration history: ${missing.join(', ')}.` }
      : { key: 'migrations', label: 'Database migrations', state: 'ok', detail: `All ${EXPECTED_MIGRATIONS.length} migrations this release expects are recorded.` })
  }
  const job = status.expiry_job
  checks.push(job === null
    ? { key: 'expiry-job', label: 'Listing expiry job', state: 'unknown', detail: 'The scheduler cannot be inspected from here.' }
    : !job.scheduled
      ? { key: 'expiry-job', label: 'Listing expiry job', state: 'problem', detail: 'The hourly expiry job is not scheduled.' }
      : job.last_status === null || job.last_run_at === null
        ? { key: 'expiry-job', label: 'Listing expiry job', state: 'warning', detail: 'Scheduled, but it has no recorded run yet.' }
        : job.last_status !== 'succeeded'
          ? { key: 'expiry-job', label: 'Listing expiry job', state: 'problem', detail: `The last run ${job.last_status}, ${formatWait(now - Date.parse(job.last_run_at))} ago.` }
          : now - Date.parse(job.last_run_at) > 2 * 3_600_000
            ? { key: 'expiry-job', label: 'Listing expiry job', state: 'warning', detail: `The last successful run was ${formatWait(now - Date.parse(job.last_run_at))} ago; it runs hourly.` }
            : { key: 'expiry-job', label: 'Listing expiry job', state: 'ok', detail: `Last ran successfully ${formatWait(now - Date.parse(job.last_run_at))} ago.` })
  checks.push(status.expiry_backlog > 0
    ? { key: 'expiry-backlog', label: 'Expired listings marked', state: 'problem', detail: `${status.expiry_backlog} active ${status.expiry_backlog === 1 ? 'listing is' : 'listings are'} more than 2 hours past expiry and not yet marked expired. Buyers already cannot see them.` }
    : { key: 'expiry-backlog', label: 'Expired listings marked', state: 'ok', detail: 'No listing is more than 2 hours past its expiry.' })
  const waited = status.oldest_review_since ? now - Date.parse(status.oldest_review_since) : null
  checks.push(waited === null
    ? { key: 'review-queue', label: 'Review queue', state: 'ok', detail: 'Nothing is waiting for review.' }
    : waited > REVIEW_OVERDUE_MS
      ? { key: 'review-queue', label: 'Review queue', state: 'warning', detail: `The oldest submission has waited ${formatWait(waited)}.` }
      : { key: 'review-queue', label: 'Review queue', state: 'ok', detail: `The oldest submission has waited ${formatWait(waited)}.` })
  return checks
}

/** The worst state among checks, for the overview's one-line summary. */
export function overallState(checks: readonly Check[]): CheckState {
  return (['problem', 'warning', 'unknown', 'ok'] as const).find((s) => checks.some((c) => c.state === s)) ?? 'ok'
}
