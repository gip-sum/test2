import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DailyActivityChart } from '@/components/analytics/DailyActivityChart'
import { PeriodSummary } from '@/components/analytics/PeriodSummary'
import { areaPath, axisTicks, chartSummary, dayText, linePath, longDay, markedDays, scaleFor, shortDay, trackedRuns, untrackedRuns } from './chart'
import { combineSeries, daysEnding, enquiriesChange, seriesFor, sumTotals, totals, viewsChange, type DayPoint, type ListingPerformance, type Totals } from './model'

const point = (day: string, views: number | null, enquiries = 0): DayPoint => ({ day, views, enquiries })
const days = (n: number) => daysEnding('2026-10-18', n)
const t = (views: number | null, enquiries: number, untrackedDays = 0): Totals => ({ views, enquiries, untrackedDays })

describe('untracked days stay missing (UI-10)', () => {
  const values = [null, null, 4, 0, null, 7, 2]
  it('splits counted days into runs and never joins across a gap', () => {
    expect(trackedRuns(values)).toEqual([{ start: 2, length: 2 }, { start: 5, length: 2 }])
    expect(untrackedRuns(values)).toEqual([{ start: 0, length: 2 }, { start: 4, length: 1 }])
    // One subpath per run (two Ms), and nothing drawn on days 0, 1 or 4.
    const d = linePath(values, 10)
    expect(d).toBe('M2.5,60L3.5,100M5.5,30L6.5,80')
    expect(d).not.toMatch(/[ML](0|1|4)\.5,/)
  })
  it('draws a counted zero on the baseline, which an untracked day never is', () => {
    expect(linePath([0, 0], 1)).toBe('M0.5,100L1.5,100')
    expect(linePath([null, null], 1)).toBe('')
    expect(areaPath([null, null], 1)).toBe('')
  })
  it('marks a lone counted day between gaps, which a line alone would not show', () => {
    expect(markedDays([null, 3, null, ...Array(10).fill(1)])).toEqual([1])
    expect(markedDays([1, null, 2, 3, 4, 5, 6])).toEqual([0, 2, 3, 4, 5, 6])
  })
  it('says "not tracked" in words wherever a day is read out', () => {
    expect(dayText(point('2026-10-13', null, 1))).toBe('Tue 13 Oct 2026: views not tracked, 1 enquiry')
    expect(dayText(point('2026-10-13', 0, 0))).toBe('Tue 13 Oct 2026: 0 views, 0 enquiries')
  })
})

describe('ranges and axes', () => {
  it('labels 7, 30 and 90 days without crowding, always including the latest day', () => {
    expect(axisTicks(7).map((x) => x.index)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(axisTicks(30).map((x) => x.index)).toEqual([1, 8, 15, 22, 29])
    expect(axisTicks(90).map((x) => x.index)).toEqual([5, 19, 33, 47, 61, 75, 89])
    // Narrow charts keep every other label, the latest included.
    expect(axisTicks(90).filter((x) => x.narrow).map((x) => x.index)).toEqual([5, 33, 61, 89])
    expect(axisTicks(30).at(-1)).toMatchObject({ align: 'end', narrow: true })
    expect(axisTicks(30)[0]).toMatchObject({ index: 1, align: 'start' })
  })
  it('keeps every day of a 90-day period in the data: only labels are thinned', () => {
    const points = days(90).map((d, i) => point(d, i % 5, i % 9 === 0 ? 1 : 0))
    const html = renderToStaticMarkup(createElement(DailyActivityChart, { points, period: 'last 90 days', id: 'c' }))
    expect(linePath(points.map((p) => p.views), 10).match(/[ML]/g)).toHaveLength(90)
    expect(html.match(/data-series="enquiries"/g)).toHaveLength(10)
    expect(html.match(/data-tick=/g)).toHaveLength(7)
  })
  it('scales each series from zero on its own axis, never normalised to the other', () => {
    expect(scaleFor([null, 3, 41])).toEqual({ top: 50, ticks: [50, 25, 0] })
    expect(scaleFor([0, 0])).toEqual({ top: 1, ticks: [1, 0] })
    expect(scaleFor([null, null])).toEqual({ top: 1, ticks: [1, 0] })
  })
  it('formats dates from a fixed table, identical on server and browser', () => {
    expect(shortDay('2026-09-08')).toBe('8 Sep')
    expect(longDay('2027-01-01')).toBe('Fri 1 Jan 2027')
  })
})

describe('the chart as the server renders it', () => {
  const points = [point('2026-10-12', null), point('2026-10-13', null), point('2026-10-14', 0), point('2026-10-15', 5, 2), point('2026-10-16', 3), point('2026-10-17', 0, 1), point('2026-10-18', 8)]
  const html = renderToStaticMarkup(createElement(DailyActivityChart, { points, period: 'last 7 days', id: 'c' }))
  it('is complete without JavaScript: series, hatched gaps, axis and summary', () => {
    expect(html).toContain('data-series="views"')
    expect(html.match(/data-untracked/g)).toHaveLength(1)
    expect(html).toMatch(/data-untracked="true" class="chart-untracked[^"]*" style="left:0%;width:28.5714/)
    expect(html).toContain('Hatched days: views were not counted yet, so they are gaps, not zero.')
    expect(html).toContain('Most views in a day: 8, on 18 Oct. 3 enquiries on 2 days.')
  })
  it('claims no keyboard role before it can answer one, and draws no tooltip', () => {
    expect(html).not.toContain('role="slider"')
    expect(html).not.toContain('tabindex')
    expect(html).not.toContain('data-chart-tooltip')
    expect(html).toMatch(/<div aria-hidden="true" class="grid/)
  })
  it('has no animation to reduce: no transition or keyframe classes on any mark', () => {
    expect(html).not.toMatch(/\b(animate-|transition|motion-)/)
  })
  it('has no saves series: saves are a current count, never a history', () => {
    expect(html).not.toMatch(/save/i)
  })
})

describe('summary', () => {
  it('reads the busiest counted day and enquiry days, and admits an untracked period', () => {
    expect(chartSummary([point('2026-10-17', 9, 1), point('2026-10-18', 9)])).toEqual({ views: 'Most views in a day: 9, on 18 Oct.', enquiries: '1 enquiry on 1 day.' })
    expect(chartSummary([point('2026-10-17', null), point('2026-10-18', null)]).views).toBe('Views were not tracked in this period.')
    expect(chartSummary([point('2026-10-17', null), point('2026-10-18', 0)])).toEqual({ views: 'No views on the 1 counted day.', enquiries: 'No enquiries in this period.' })
  })
})

describe('period comparison', () => {
  it('compares only fully counted periods, as plain figures', () => {
    expect(viewsChange(t(30, 0), t(22, 0), 7)).toEqual({ kind: 'up', by: 8, previous: 22 })
    expect(viewsChange(t(10, 0), t(12, 0), 7)).toEqual({ kind: 'down', by: 2, previous: 12 })
    expect(viewsChange(t(0, 0), t(0, 0), 7)).toEqual({ kind: 'same', by: 0, previous: 0 })
  })
  it('never treats an untracked or partly tracked period as zero or a percentage', () => {
    expect(viewsChange(t(30, 0), t(null, 0, 7), 7)).toEqual({ kind: 'not-tracked' })
    expect(viewsChange(t(30, 0), t(4, 0, 5), 7)).toEqual({ kind: 'partly-tracked', previous: 4, countedDays: 2 })
    expect(viewsChange(t(30, 0, 2), t(null, 0, 7), 7)).toEqual({ kind: 'not-tracked' })
  })
  it('compares enquiries in every period: they are recorded whenever they happen', () => {
    expect(enquiriesChange(t(null, 3, 7), t(null, 0, 7))).toEqual({ kind: 'up', by: 3, previous: 0 })
  })
  it('renders direction in words, not colour alone, and the unavailable case in words', () => {
    const html = renderToStaticMarkup(createElement(PeriodSummary, { current: t(30, 2), views: { kind: 'not-tracked' }, enquiries: { kind: 'down', by: 1, previous: 3 }, saves: null, rate: null, range: 7 }))
    expect(html).toContain('Previous 7 days: not tracked')
    expect(html).toMatch(/<span aria-hidden="true"[^>]*>↓<\/span>Down 1 from 3 in the previous 7 days/)
    expect(html).not.toMatch(/0%|text-(success|danger|trust)/)
    // Below 20 views there is no rate, and no 0 standing in for one.
    expect(html).toContain('Not enough views yet')
    expect(html).toContain('Enquiry rate appears once the period has at least 20 views.')
    expect(html).toContain('Unavailable')
  })
})

describe('all listings together', () => {
  const listing = (series: DayPoint[]) => ({ series, current: totals(series), previous: t(null, 0, 2) }) as unknown as ListingPerformance
  it('sums each day, and a day nobody counted stays untracked', () => {
    const d = days(3)
    const a = seriesFor([{ listing_id: 'a', day: d[2]!, views: 4, enquiries: 1 }], d, d[1]!)
    const b = seriesFor([{ listing_id: 'b', day: d[1]!, views: 2, enquiries: 0 }], d, d[1]!)
    expect(combineSeries([listing(a), listing(b)])).toEqual([point(d[0]!, null), point(d[1]!, 2), point(d[2]!, 4, 1)])
    expect(combineSeries([])).toEqual([])
    expect(sumTotals([t(null, 1, 3), t(null, 2, 3)])).toEqual(t(null, 3, 3))
    expect(sumTotals([t(5, 1), t(7, 0)])).toEqual(t(12, 1))
  })
})

describe('chart route isolation', () => {
  // UI-18 put the chart on My properties too (the buyer-interest panel), so
  // the seller's two routes may ship it and no other route can.
  it('only the two seller routes — performance and My properties — import the chart', () => {
    const root = process.cwd()
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(n) && !n.endsWith('.test.ts') ? [p] : [] })
    const files = [...walk(join(root, 'app')), ...walk(join(root, 'components')), ...walk(join(root, 'lib'))]
    const importersOf = (module: string) => files.filter((f) => new RegExp(`from '${module.replace(/\//g, '\\/')}'`).test(readFileSync(f, 'utf8'))).map((f) => relative(root, f)).sort()
    expect(importersOf('@/components/analytics/DailyActivityChart')).toEqual(['app/dashboard/performance/page.tsx', 'components/dashboard/DashboardParts.tsx'])
    expect(importersOf('@/components/dashboard/DashboardParts')).toEqual(['app/dashboard/page.tsx'])
  })
})
