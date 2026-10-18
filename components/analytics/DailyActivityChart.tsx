/**
 * Views and enquiries per day, for one listing or all of them (UI-10).
 *
 * Adapted from Bklit UI's time-series line chart — github.com/bklit/bklit-ui
 * at commit 7167844902bf81afd43c52f223a04f40f6b03159, packages/ui/src/charts
 * (line-chart.tsx, line.tsx, grid.tsx, x-axis.tsx, use-chart-interaction.ts,
 * tooltip/tooltip-box.tsx, tooltip/tooltip-content.tsx). MIT License,
 * Copyright (c) 2026 uixmat. Adapted and owned by GharBazaar from here.
 *
 * Kept from Bklit: the composition (horizontal grid, series, date axis, one
 * tooltip); the crosshair that snaps to the nearest day, so a reader aims at
 * a date rather than a 2px line; one tooltip listing every series at that
 * day, a header row for the date over value rows; the tooltip box's flip to
 * the left of the crosshair when it would run past the right edge.
 *
 * Changed, each because the original failed on our data or our rules
 * (measured in docs/ui-modernization/UI-10-seller-analytics.md):
 * - A day that was not tracked is a gap and a shaded band. Bklit plots a
 *   missing value at pixel 0 — the TOP of the plot — so untracked days drew
 *   as the busiest days.
 * - Straight segments, not `curveNatural`, which overshoots below zero.
 * - Views and enquiries are two panels on one date axis, each with its own
 *   axis from zero, not two lines on one scale (enquiries would lie flat)
 *   or two y-scales on one plot (which invites a comparison the numbers do
 *   not support).
 * - Rendered on the server: the plot is drawn in day units with a stretched
 *   viewBox and non-scaling strokes, and labels and dots are HTML placed in
 *   percentages, so the chart needs no measuring and is complete before any
 *   JavaScript runs. Bklit measures its parent first and renders nothing on
 *   the server.
 * - No entrance or tooltip animation. Bklit reveals series from an invisible
 *   start with a Motion clip, which this project does not do above the fold;
 *   reduced motion therefore has nothing to remove.
 * - Keyboard: once hydrated the plot is a slider over the days (arrow keys,
 *   Page Up/Down a week, Home/End), whose value text says the date and both
 *   figures. Bklit's chart has no keyboard access or accessible name.
 * - Touch scrolls the page vertically (`touch-action: pan-y`); Bklit sets
 *   `touch-action: none`, so a finger landing on the chart could not scroll.
 * - Tokens for every colour; the fade-to-transparent line edges, dashed
 *   grid, loading pulses, y-domain tweens, brush and markers removed;
 *   visx, d3, Motion and @number-flow/react not needed (89 KB gzip, §4 of
 *   the record).
 *
 * Split in two so only the interaction is client code: this server component
 * draws everything a reader sees before JavaScript, and `ChartScrubber`
 * (client) wraps it with the slider, crosshair and readout. As one client
 * component the whole chart shipped as JavaScript, hydrated, and rendered
 * again for the slider role; split, the route pays 1.99 KB gzip instead of
 * 3.50 KB and a 90-day listing page +14 ms total blocking time at 4x CPU
 * instead of +28 ms (UI-10 record, section 11).
 *
 * The figures are also in the page's daily table and summary, so nothing
 * here is the only way to read a value.
 */
import { areaPath, axisTicks, chartSummary, linePath, markedDays, scaleFor, shortDay, untrackedRuns, xAt, yAt } from '@/lib/analytics/chart'
import type { DayPoint } from '@/lib/analytics/model'
import { cn } from '@/lib/cn'
import { ChartScrubber } from './ChartScrubber'
import { Mark } from './chart-marks'

export function DailyActivityChart({ points, period, id }: { points: DayPoint[]; period: string; id: string }) {
  const count = points.length
  const views = points.map((p) => p.views), enquiries = points.map((p) => p.enquiries)
  const viewScale = scaleFor(views), enquiryScale = scaleFor(enquiries)
  const gaps = untrackedRuns(views), summary = chartSummary(points)

  return <figure aria-labelledby={`${id}-title`} className="@container min-w-0" data-chart="daily-activity">
    <figcaption>
      <h3 id={`${id}-title`} className="text-body font-semibold text-ink-900">Views and enquiries per day</h3>
      <p className="mt-1 text-body-sm text-ink-700">{summary.views} {summary.enquiries}</p>
    </figcaption>
    <ChartScrubber points={points} period={period} id={id}>
      <div aria-hidden className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2">
        <Key className="col-span-2" mark="line">Views</Key>
        <YAxis scale={viewScale} className="h-40" />
        <div data-plot="views" className="relative h-40">
          <Grid />
          {gaps.map((g) => <div key={g.start} data-untracked className="chart-untracked absolute inset-y-0" style={{ left: `${(g.start / count) * 100}%`, width: `${(g.length / count) * 100}%` }} />)}
          <svg viewBox={`0 0 ${count} 100`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            <path d={areaPath(views, viewScale.top)} className="fill-chart-1 opacity-10" />
            <path d={linePath(views, viewScale.top)} fill="none" vectorEffect="non-scaling-stroke" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-chart-1" data-series="views" />
          </svg>
          {markedDays(views).map((i) => <span key={i} data-dot="day" className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-1 ring-2 ring-surface-000" style={{ left: `${xAt(i, count)}%`, top: `${yAt(views[i]!, viewScale.top)}%` }} />)}
        </div>
        <Key className="col-span-2 mt-4" mark="column">Enquiries</Key>
        <YAxis scale={enquiryScale} className="h-20" />
        <div data-plot="enquiries" className="relative h-20">
          <Grid />
          <div className="absolute inset-0 flex items-end">
            {enquiries.map((e, i) => <div key={points[i]!.day} className={cn('flex h-full min-w-0 flex-1 items-end justify-center', count > 31 ? '@md:px-px' : 'px-px')}>
              {e > 0 && <div data-series="enquiries" className="w-full max-w-6 rounded-t-sm bg-chart-2" style={{ height: `${100 - yAt(e, enquiryScale.top)}%` }} />}
            </div>)}
          </div>
        </div>
        <span />
        <XAxis points={points} />
      </div>
    </ChartScrubber>
    {gaps.length > 0 && <p className="mt-2 flex items-center gap-2 text-caption text-ink-500"><span aria-hidden className="chart-untracked inline-block size-3 shrink-0 rounded-sm" />Hatched days: views were not counted yet, so they are gaps, not zero.</p>}
  </figure>
}

function Key({ mark, className, children }: { mark: 'line' | 'column'; className?: string; children: string }) {
  return <p className={cn('mb-2 flex items-center gap-2 text-label font-semibold text-ink-900', className)}>
    <Mark kind={mark} />{children}
  </p>
}

function YAxis({ scale, className }: { scale: { ticks: number[] }; className: string }) {
  return <div className={cn('relative text-right text-caption tabular text-ink-500', className)}>
    {scale.ticks.map((t, i) => <span key={t} className="absolute right-0 -translate-y-1/2 leading-none" style={{ top: `${(i / (scale.ticks.length - 1)) * 100}%` }}>{t}</span>)}
  </div>
}

function Grid() {
  return <>{[0, 50, 100].map((at) => <div key={at} className="absolute inset-x-0 border-t border-border-subtle" style={{ top: `${at}%` }} />)}</>
}

function XAxis({ points }: { points: DayPoint[] }) {
  return <div className="relative mt-1 h-5 text-caption text-ink-500">
    {axisTicks(points.length).map((t) => <span key={t.index} data-tick={t.narrow ? 'narrow' : 'wide'}
      className={cn('absolute top-0 whitespace-nowrap', !t.narrow && '@max-md:hidden', t.align === 'center' && '-translate-x-1/2', t.align === 'end' && '-translate-x-full')}
      style={{ left: t.align === 'end' ? '100%' : t.align === 'start' ? `${(t.index / points.length) * 100}%` : `${xAt(t.index, points.length)}%` }}>{shortDay(points[t.index]!.day)}</span>)}
  </div>
}
