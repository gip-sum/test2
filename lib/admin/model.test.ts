import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { databaseChecks, EXPECTED_MIGRATIONS, formatWait, listingsHref, missingMigrations, overallState, parseListingsQuery, type DatabaseStatus } from './model'

const NOW = Date.parse('2026-10-14T06:00:00Z'), HOUR = 3_600_000
const base: DatabaseStatus = { migrations: EXPECTED_MIGRATIONS.map((f) => ({ version: f.slice(0, 14), name: f.slice(15) })), expiry_job: { scheduled: true, last_status: 'succeeded', last_run_at: new Date(NOW - 0.5 * HOUR).toISOString() }, expiry_backlog: 0, last_expiry_at: null, oldest_review_since: null, checked_at: new Date(NOW).toISOString() }
const state = (s: Partial<DatabaseStatus>, key: string) => databaseChecks({ ...base, ...s }, NOW).find((c) => c.key === key)!

describe('expected migrations', () => {
  it('lists exactly the files in supabase/migrations, in order', () => {
    expect([...EXPECTED_MIGRATIONS]).toEqual(readdirSync('supabase/migrations').sort().map((f) => f.replace(/\.sql$/, '')))
  })
  it('matches applied migrations by version or by name', () => {
    expect(missingMigrations([{ version: '20261014044042' }], ['20261014044042_phase_21_admin_console'])).toEqual([])
    expect(missingMigrations([{ version: '20991231000000', name: 'phase_21_admin_console' }], ['20261014044042_phase_21_admin_console'])).toEqual([])
    expect(missingMigrations([], ['20261014044042_phase_21_admin_console'])).toEqual(['20261014044042_phase_21_admin_console'])
  })
})

describe('database checks', () => {
  it('reads OK only when everything was seen and is healthy', () => {
    expect(databaseChecks(base, NOW).every((c) => c.state === 'ok')).toBe(true)
  })
  it('what cannot be seen is unknown, never OK', () => {
    expect(state({ migrations: null }, 'migrations').state).toBe('unknown')
    expect(state({ expiry_job: null }, 'expiry-job').state).toBe('unknown')
    expect(overallState(databaseChecks({ ...base, expiry_job: null }, NOW))).toBe('unknown')
  })
  it('flags missing migrations as a warning that names them', () => {
    const c = state({ migrations: base.migrations!.slice(0, -1) }, 'migrations')
    expect(c.state).toBe('warning')
    expect(c.detail).toContain(EXPECTED_MIGRATIONS.at(-1))
  })
  it('judges the expiry job by schedule, last result and age', () => {
    expect(state({ expiry_job: { scheduled: false } }, 'expiry-job').state).toBe('problem')
    expect(state({ expiry_job: { scheduled: true, last_status: 'failed', last_run_at: new Date(NOW - HOUR).toISOString() } }, 'expiry-job').state).toBe('problem')
    expect(state({ expiry_job: { scheduled: true, last_status: 'succeeded', last_run_at: new Date(NOW - 3 * HOUR).toISOString() } }, 'expiry-job').state).toBe('warning')
    expect(state({ expiry_job: { scheduled: true, last_status: null, last_run_at: null } }, 'expiry-job').state).toBe('warning')
  })
  it('a backlog of overdue active listings is a problem; long review waits a warning', () => {
    expect(state({ expiry_backlog: 2 }, 'expiry-backlog')).toMatchObject({ state: 'problem', detail: expect.stringContaining('2 active listings are') })
    expect(state({ oldest_review_since: new Date(NOW - 50 * HOUR).toISOString() }, 'review-queue')).toMatchObject({ state: 'warning', detail: 'The oldest submission has waited 2 days 2 hours.' })
    expect(state({ oldest_review_since: new Date(NOW - 5 * HOUR).toISOString() }, 'review-queue').state).toBe('ok')
  })
  it('the overall state is the worst one', () => {
    expect(overallState([{ key: 'a', label: '', state: 'ok', detail: '' }, { key: 'b', label: '', state: 'warning', detail: '' }, { key: 'c', label: '', state: 'problem', detail: '' }])).toBe('problem')
  })
})

describe('wording and URL state', () => {
  it('formats waits in words', () => {
    expect([0, 0.5 * HOUR, HOUR, 25 * HOUR, 48 * HOUR, 52 * HOUR].map(formatWait)).toEqual(['under an hour', 'under an hour', '1 hour', '1 day 1 hour', '2 days', '2 days 4 hours'])
  })
  it('parses and builds listing URLs, falling back for anything unknown', () => {
    expect(parseListingsQuery({ status: 'published', page: '0' })).toEqual({ status: 'all', page: 1 })
    expect(parseListingsQuery({ status: 'review', page: '3' })).toEqual({ status: 'review', page: 3 })
    expect(listingsHref({ status: 'all', page: 1 })).toBe('/admin/listings')
    expect(listingsHref({ status: 'removed', page: 2 })).toBe('/admin/listings?status=removed&page=2')
  })
})
