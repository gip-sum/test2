import type { PropertyCard } from '@/lib/dashboard/model'

/**
 * Listing performance (Phase 20), as a pure function of what was measured.
 *
 * Three rules keep the numbers honest:
 * - A day before view counting began is "not tracked" (null), never 0.
 *   Zero means "counted, and nobody came"; null means "we do not know".
 * - Periods are compared as plain figures, not percentages. On the small
 *   numbers a new listing has, "+200%" says far more than three views do.
 * - The enquiry rate appears only from RATE_MIN_VIEWS views upward; below
 *   that one enquiry swings it from 0 to 20 per 100 and means nothing.
 */
export const RANGES = [7, 30, 90] as const
export type Range = typeof RANGES[number]
export const RATE_MIN_VIEWS = 20

export type ActivityRow = { listing_id: string; day: string; views: number; enquiries: number }
export type SaveCount = { listing_id: string; saves: number }
export type PerformanceQuery = { range: Range; listing: string | null }
export type DayPoint = { day: string; views: number | null; enquiries: number }
export type Totals = { views: number | null; enquiries: number; untrackedDays: number }
export type ListingPerformance = {
  card: PropertyCard
  listingId: string
  current: Totals
  previous: Totals
  /** Buyers who have it saved now; null when the count could not be read. */
  saves: number | null
  /** Enquiries per 100 views in the period, one decimal; null below the threshold. */
  rate: number | null
  series: DayPoint[]
}

const LISTING = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function parseQuery(params: Record<string, string | string[] | undefined>): PerformanceQuery {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const range = RANGES.find((r) => String(r) === one(params.range)) ?? 7
  const listing = one(params.listing)
  return { range, listing: listing && LISTING.test(listing) ? listing.toLowerCase() : null }
}

export function performanceHref(query: Partial<PerformanceQuery>) {
  const params = new URLSearchParams()
  if (query.listing) params.set('listing', query.listing)
  if (query.range && query.range !== 7) params.set('range', String(query.range))
  const search = params.toString()
  return '/dashboard/performance' + (search ? `?${search}` : '')
}

/** Calendar arithmetic on YYYY-MM-DD India dates, free of the server's time zone. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export function daysEnding(last: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(last, i - count + 1))
}

export function seriesFor(rows: readonly ActivityRow[], days: readonly string[], viewsSince: string | null): DayPoint[] {
  const byDay = new Map(rows.map((r) => [r.day, r]))
  return days.map((day) => ({
    day,
    views: viewsSince === null || day < viewsSince ? null : byDay.get(day)?.views ?? 0,
    enquiries: byDay.get(day)?.enquiries ?? 0,
  }))
}

export function totals(points: readonly DayPoint[]): Totals {
  const tracked = points.filter((p) => p.views !== null)
  return {
    views: tracked.length ? tracked.reduce((sum, p) => sum + p.views!, 0) : null,
    enquiries: points.reduce((sum, p) => sum + p.enquiries, 0),
    untrackedDays: points.length - tracked.length,
  }
}

export function enquiryRate(t: Totals): number | null {
  if (t.views === null || t.views < RATE_MIN_VIEWS) return null
  return Math.round((t.enquiries / t.views) * 1000) / 10
}

export function buildPerformance(input: {
  cards: readonly PropertyCard[]
  activity: readonly ActivityRow[]
  saveCounts: readonly SaveCount[] | null
  viewsSince: string | null
  today: string
  range: Range
}): ListingPerformance[] {
  const current = daysEnding(input.today, input.range), previous = daysEnding(addDays(input.today, -input.range), input.range)
  const saves = input.saveCounts ? new Map(input.saveCounts.map((s) => [s.listing_id, s.saves])) : null
  // Every submitted listing except removed ones; a never-submitted draft has
  // no public page and so nothing to measure.
  return input.cards.filter((c) => c.listing && c.status !== 'REMOVED').map((card) => {
    const listingId = card.listing!.id
    const rows = input.activity.filter((r) => r.listing_id === listingId)
    const series = seriesFor(rows, current, input.viewsSince)
    const now = totals(series)
    return {
      card, listingId, series, current: now,
      previous: totals(seriesFor(rows, previous, input.viewsSince)),
      saves: saves ? saves.get(listingId) ?? 0 : null,
      rate: enquiryRate(now),
    }
  }).sort((a, b) => (b.current.views ?? -1) - (a.current.views ?? -1) || a.card.title.localeCompare(b.card.title))
}

/** A clean axis maximum: 1, 2 or 5 × 10ⁿ at or above the largest value. */
export function niceMax(max: number): number {
  if (max <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(max))
  return [1, 2, 5, 10].map((m) => m * power).find((v) => v >= max)!
}

/**
 * All of a seller's listings together (UI-10), for the overview. Every
 * listing shares one counting start date, so a day is either counted for
 * all of them or for none; a day nobody counted stays null in the sum.
 */
export function combineSeries(listings: readonly ListingPerformance[]): DayPoint[] {
  const first = listings[0]
  if (!first) return []
  return first.series.map((p, i) => {
    const day = listings.map((l) => l.series[i]!)
    const counted = day.filter((d) => d.views !== null)
    return { day: p.day, views: counted.length ? counted.reduce((n, d) => n + d.views!, 0) : null, enquiries: day.reduce((n, d) => n + d.enquiries, 0) }
  })
}

export function sumTotals(list: readonly Totals[]): Totals {
  const counted = list.filter((t) => t.views !== null)
  return {
    views: counted.length ? counted.reduce((n, t) => n + t.views!, 0) : null,
    enquiries: list.reduce((n, t) => n + t.enquiries, 0),
    untrackedDays: Math.max(0, ...list.map((t) => t.untrackedDays)),
  }
}

/**
 * How a period compares with the one before, as plain figures (UI-10).
 *
 * Views are compared only when every day of both periods was counted. A
 * period that was partly tracked is stated, never compared: 30 counted days
 * against 5 would read as growth that never happened. A period that was not
 * tracked at all is not 0 and not 0%: it is "not tracked".
 */
export type Change =
  | { kind: 'up' | 'down' | 'same'; by: number; previous: number }
  | { kind: 'not-tracked' }
  | { kind: 'partly-tracked'; previous: number; countedDays: number }

export function viewsChange(current: Totals, previous: Totals, range: Range): Change {
  if (previous.views === null) return { kind: 'not-tracked' }
  if (current.views === null || current.untrackedDays > 0 || previous.untrackedDays > 0) return { kind: 'partly-tracked', previous: previous.views, countedDays: range - previous.untrackedDays }
  return difference(current.views, previous.views)
}

/** Enquiries are recorded whenever they happen, so every period compares. */
export function enquiriesChange(current: Totals, previous: Totals): Change {
  return difference(current.enquiries, previous.enquiries)
}

function difference(now: number, before: number): Change {
  return { kind: now > before ? 'up' : now < before ? 'down' : 'same', by: Math.abs(now - before), previous: before }
}
