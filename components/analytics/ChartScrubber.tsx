'use client'

/**
 * The interactive layer of the daily activity chart (UI-10): a slider over
 * the days, a crosshair and one readout, laid over the chart the server drew
 * (`children`, never re-drawn here).
 *
 * From Bklit UI's use-chart-interaction.ts and tooltip/tooltip-box.tsx at
 * 7167844 (MIT, see DailyActivityChart for the full provenance): the
 * crosshair snaps to the nearest day; one readout lists every series at that
 * day; the box sits 16px beside the crosshair and flips left when it would
 * pass the right edge. Bklit moves the box on a Motion spring; here it moves
 * instantly, so reduced motion has nothing to remove.
 *
 * Keyboard (Bklit has none): once hydrated the plot is a slider — arrow
 * keys a day, Page Up/Down a week, Home/End — whose value text says the
 * date and both figures, so a screen reader hears what the readout shows.
 * Escape puts the readout away. Before hydration, or without JavaScript,
 * there is no slider role to promise keys that would do nothing.
 *
 * Touch: a tap reads the day under the finger, a horizontal drag scrubs,
 * a vertical one scrolls the page (`touch-action: pan-y`; Bklit's `none`
 * trapped the scroll). A mouse leaving clears the readout; a lifted finger
 * does not, and a tap elsewhere does (the slider loses focus).
 */
import { type KeyboardEvent, type PointerEvent, type ReactNode, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { dayText, enquiriesWords, longDay, scaleFor, viewsWords, xAt, yAt } from '@/lib/analytics/chart'
import type { DayPoint } from '@/lib/analytics/model'
import { cn } from '@/lib/cn'
import { Mark } from './chart-marks'

const noop = () => () => {}
const OFFSET = 16

export function ChartScrubber({ points, period, id, children }: { points: DayPoint[]; period: string; id: string; children: ReactNode }) {
  const count = points.length
  // False on the server and during hydration, true after.
  const ready = useSyncExternalStore(noop, () => true, () => false)
  const [active, setActive] = useState<number | null>(null)
  const frame = useRef<HTMLDivElement>(null), tip = useRef<HTMLDivElement>(null), dot = useRef<HTMLSpanElement>(null)
  const value = active ?? count - 1
  const shown = active === null ? null : points[active]!

  // Positions are set on the elements, not in state: they follow the
  // pointer, and a render per position would be work for nothing.
  useLayoutEffect(() => {
    const outer = frame.current
    if (active === null || !outer) return
    const o = outer.getBoundingClientRect()
    const plots = [...outer.querySelectorAll<HTMLElement>('[data-plot]')].map((p) => p.getBoundingClientRect())
    const views = plots[0]!, x = views.left - o.left + (xAt(active, count) / 100) * views.width
    outer.querySelectorAll<HTMLElement>('[data-crosshair]').forEach((line, i) => {
      const plot = plots[i]!
      Object.assign(line.style, { left: `${x}px`, top: `${plot.top - o.top}px`, height: `${plot.height}px` })
    })
    const v = points[active]!.views
    if (dot.current && v !== null) Object.assign(dot.current.style, { left: `${x}px`, top: `${views.top - o.top + (yAt(v, scaleFor(points.map((p) => p.views)).top) / 100) * views.height}px` })
    const box = tip.current
    if (!box) return
    const width = box.offsetWidth
    const left = x + OFFSET + width > o.width ? x - OFFSET - width : x + OFFSET
    box.style.left = `${Math.max(0, Math.min(left, o.width - width))}px`
  }, [active, count, points])

  const dayAt = (target: HTMLElement, clientX: number) => {
    const a = target.querySelector('[data-plot]')!.getBoundingClientRect()
    return Math.max(0, Math.min(count - 1, Math.floor(((clientX - a.left) / a.width) * count)))
  }
  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointermove' && e.pointerType !== 'mouse' && !e.buttons) return
    setActive(dayAt(e.currentTarget, e.clientX))
  }
  const onPointerLeave = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && !e.currentTarget.matches(':focus-visible')) setActive(null)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 7, PageDown: -7 }
    let next: number | null
    if (e.key in step) next = Math.max(0, Math.min(count - 1, value + step[e.key]!))
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = count - 1
    else if (e.key === 'Escape' && active !== null) next = null
    else return
    e.preventDefault()
    setActive(next)
  }

  const slider = ready ? {
    role: 'slider', tabIndex: 0, 'aria-label': `Day, ${period}`, 'aria-describedby': `${id}-keys`,
    'aria-valuemin': 1, 'aria-valuemax': count, 'aria-valuenow': value + 1, 'aria-valuetext': dayText(points[value]!),
    onKeyDown, onFocus: (e: { currentTarget: HTMLElement }) => { if (e.currentTarget.matches(':focus-visible')) setActive(value) },
    onBlur: () => setActive(null), onPointerDown: onPointer, onPointerMove: onPointer, onPointerLeave,
  } as const : {}

  return <div ref={frame} className="relative mt-3">
    <div {...slider} className={cn('-mx-2 -mt-2 touch-pan-y touch-pinch-zoom rounded-md p-2 select-none', ready && 'cursor-crosshair')}>{children}</div>
    {shown && <div aria-hidden className="pointer-events-none">
      <span data-crosshair className="absolute w-px -translate-x-1/2 bg-ink-500" />
      <span data-crosshair className="absolute w-px -translate-x-1/2 bg-ink-500" />
      {shown.views !== null && <span ref={dot} data-dot="active" className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-1 ring-2 ring-surface-000" />}
      <div ref={tip} data-chart-tooltip className="absolute top-0 z-10 w-max max-w-60 rounded-md border border-border-subtle bg-surface-000 shadow-e2">
        <p className="border-b border-border-subtle px-3 py-2 text-label font-semibold text-ink-900">{longDay(shown.day)}</p>
        <div className="space-y-1 px-3 py-2 text-body-sm">
          <Row mark="line" value={shown.views} label={shown.views === null ? 'Views not tracked' : viewsWords(shown.views).replace(/^\d+ /, '')} />
          <Row mark="column" value={shown.enquiries} label={enquiriesWords(shown.enquiries).replace(/^\d+ /, '')} />
        </div>
      </div>
    </div>}
    {ready && <p id={`${id}-keys`} className="sr-only">Use the arrow keys to move between days, Page Up and Page Down to move a week.</p>}
  </div>
}

function Row({ mark, value, label }: { mark: 'line' | 'column'; value: number | null; label: string }) {
  // Values lead, labels follow (dataviz): the reader has the series and wants the number.
  return <p className="flex items-center gap-2">
    <Mark kind={mark} />
    {value !== null && <span className="tabular font-semibold text-ink-900">{value}</span>}
    <span className="text-ink-700">{label}</span>
  </p>
}
