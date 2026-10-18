import { niceMax, type DayPoint } from './model'

/**
 * Geometry for the daily activity chart (UI-10), as pure functions.
 *
 * The plot is drawn in day units: day i occupies the band [i, i + 1] and its
 * value sits at the band's centre, i + 0.5. Lines, columns, untracked bands,
 * the crosshair and the axis labels all use that one rule, so a column and
 * the line point above it can never drift apart, at any width.
 *
 * Vertical positions are percentages of the plot height from the top (0 at
 * the top, 100 at the baseline), so the server can draw the chart without
 * knowing how wide the browser will make it.
 */

/** Percent from the top for a value on a 0…top axis. */
export const yAt = (value: number, top: number) => 100 - (value / top) * 100
/** Centre of day i of n, as a percentage of the plot width. */
export const xAt = (index: number, count: number) => ((index + 0.5) / count) * 100

export type Run = { start: number; length: number }

/**
 * Consecutive days whose views were counted. A line is drawn within a run
 * and never across a gap: joining the last counted day before a gap to the
 * first after it would draw values for days nobody measured.
 */
export function trackedRuns(values: readonly (number | null)[]): Run[] {
  const runs: Run[] = []
  values.forEach((v, i) => {
    if (v === null) return
    const last = runs.at(-1)
    if (last && last.start + last.length === i) last.length++
    else runs.push({ start: i, length: 1 })
  })
  return runs
}

/** Consecutive days that were not tracked, for the shaded bands. */
export function untrackedRuns(values: readonly (number | null)[]): Run[] {
  return trackedRuns(values.map((v) => (v === null ? 0 : null)))
}

/**
 * The views line as SVG path data in the plot's viewBox (`0 0 n 100`), one
 * subpath per tracked run, straight segments. A curve is rejected on
 * purpose: Bklit's default (`curveNatural`) overshoots between points, which
 * on daily counts draws values below zero and peaks that never happened.
 */
export function linePath(values: readonly (number | null)[], top: number): string {
  return trackedRuns(values).map(({ start, length }) =>
    Array.from({ length }, (_, k) => `${k ? 'L' : 'M'}${start + k + 0.5},${round(yAt(values[start + k]!, top))}`).join(''),
  ).join('')
}

/** The ~10% wash under the line, closed to the baseline within each run. */
export function areaPath(values: readonly (number | null)[], top: number): string {
  return trackedRuns(values).filter((r) => r.length > 1).map(({ start, length }) =>
    `M${start + 0.5},100` + Array.from({ length }, (_, k) => `L${start + k + 0.5},${round(yAt(values[start + k]!, top))}`).join('') + `L${start + length - 0.5},100Z`,
  ).join('')
}

/** Days drawn as a dot: every counted day on a short range, and a counted day alone between gaps (a one-point line is invisible). */
export function markedDays(values: readonly (number | null)[]): number[] {
  if (values.length <= 7) return values.flatMap((v, i) => (v === null ? [] : [i]))
  return trackedRuns(values).filter((r) => r.length === 1).map((r) => r.start)
}

export type Tick = { index: number; align: 'start' | 'center' | 'end'; narrow: boolean }

/**
 * Date labels, counted back from the most recent day so "today" always has
 * one. 7 days: every day; 30: weekly; 90: fortnightly. `narrow: false`
 * ticks are hidden when the chart is narrower than 28rem, keeping every
 * other one, so labels never collide at 320px. Every day stays in the data,
 * the tooltip and the table; only labels are thinned.
 */
export function axisTicks(count: number): Tick[] {
  const step = count <= 7 ? 1 : count <= 31 ? 7 : 14
  const ticks: Tick[] = []
  for (let i = count - 1, k = 0; i >= 0; i -= step, k++) {
    const centre = (i + 0.5) / count
    ticks.push({ index: i, narrow: k % 2 === 0, align: i === count - 1 ? 'end' : centre < 0.1 ? 'start' : 'center' })
  }
  return ticks.reverse()
}

export type Scale = { top: number; ticks: number[] }

/** A clean 0…top axis with a midpoint label only when it is a whole number. */
export function scaleFor(values: readonly (number | null)[]): Scale {
  const top = niceMax(Math.max(0, ...values.map((v) => v ?? 0)))
  return { top, ticks: Number.isInteger(top / 2) ? [top, top / 2, 0] : [top, 0] }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// A fixed table, not toLocaleDateString: the chart renders on the server and
// again in the browser, and two ICU versions disagree on "Sep" and "Sept".
const parts = (day: string) => { const d = new Date(`${day}T00:00:00Z`); return { d: d.getUTCDate(), m: MONTHS[d.getUTCMonth()]!, y: d.getUTCFullYear(), w: WEEKDAYS[d.getUTCDay()]! } }
/** "13 Oct" */
export const shortDay = (day: string) => { const p = parts(day); return `${p.d} ${p.m}` }
/** "Tue 13 Oct 2026" */
export const longDay = (day: string) => { const p = parts(day); return `${p.w} ${p.d} ${p.m} ${p.y}` }

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
export const viewsWords = (v: number | null) => (v === null ? 'views not tracked' : plural(v, 'view', 'views'))
export const enquiriesWords = (n: number) => plural(n, 'enquiry', 'enquiries')

/** What one day says, in words: the slider's value text and the table's facts. */
export const dayText = (p: DayPoint) => `${longDay(p.day)}: ${viewsWords(p.views)}, ${enquiriesWords(p.enquiries)}`

/**
 * A one-line reading of the chart for everyone, chart or not: the busiest
 * counted day (the most recent, if tied) and how many days had enquiries.
 */
export function chartSummary(points: readonly DayPoint[]): { views: string; enquiries: string } {
  const counted = points.filter((p) => p.views !== null)
  const busiest = counted.reduce<DayPoint | null>((best, p) => (best === null || p.views! >= best.views! ? p : best), null)
  const views = !counted.length ? 'Views were not tracked in this period.'
    : !busiest!.views ? `No views on the ${plural(counted.length, 'counted day', 'counted days')}.`
      : `Most views in a day: ${busiest!.views}, on ${shortDay(busiest!.day)}.`
  const withEnquiries = points.filter((p) => p.enquiries > 0)
  const total = points.reduce((n, p) => n + p.enquiries, 0)
  const enquiries = total ? `${enquiriesWords(total)} on ${plural(withEnquiries.length, 'day', 'days')}.` : 'No enquiries in this period.'
  return { views, enquiries }
}

const round = (n: number) => Math.round(n * 100) / 100
