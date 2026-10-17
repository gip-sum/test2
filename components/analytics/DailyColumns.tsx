import { niceMax } from '@/lib/analytics/model'
import { cn } from '@/lib/cn'

const short = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short' })

/**
 * One measure per day as columns. One series, one axis: views and enquiries
 * are separate charts, never two scales on one plot. The title names the
 * series, so there is no legend box.
 *
 * Marks follow the dataviz specs: columns capped at 24px with a 2px surface
 * gap, a 4px rounded top and a square base, hairline recessive gridlines, and
 * text in ink tokens, never the series colour. The colour is the validated
 * chart-1 token. A day that was not tracked is a neutral band, not an empty
 * zero. Each column's native tooltip names its day and value. The chart is
 * hidden from assistive technology because the table beside it carries
 * every figure.
 */
export function DailyColumns({ title, unit, points }: { title: string; unit: [string, string]; points: { day: string; value: number | null }[] }) {
  const top = niceMax(Math.max(0, ...points.map((p) => p.value ?? 0)))
  const word = (n: number) => `${n} ${n === 1 ? unit[0] : unit[1]}`
  return <figure className="min-w-0">
    <figcaption className="text-label font-semibold text-ink-900">{title}</figcaption>
    <div aria-hidden className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
      <div className="flex h-40 flex-col justify-between text-right text-caption tabular text-ink-500"><span>{top}</span><span>{Number.isInteger(top / 2) ? top / 2 : ''}</span><span>0</span></div>
      <div className="relative h-40">
        {[0, 50, 100].map((at) => <div key={at} className="absolute inset-x-0 border-t border-border-subtle" style={{ top: `${at}%` }} />)}
        <div className="absolute inset-0 flex items-end justify-center gap-[2px]">
          {points.map((p) => <div key={p.day} title={`${short(p.day)}: ${p.value === null ? 'not tracked' : word(p.value)}`}
            className={cn('flex h-full min-w-0 max-w-6 flex-1 items-end', p.value === null && 'bg-neutral-100')}>
            {p.value ? <div className="w-full rounded-t-sm bg-chart-1" style={{ height: `${(p.value / top) * 100}%` }} /> : null}
          </div>)}
        </div>
      </div>
      <span />
      <div className="mt-1 flex justify-between text-caption text-ink-500"><span>{short(points[0]!.day)}</span><span>{short(points.at(-1)!.day)}</span></div>
    </div>
    {points.some((p) => p.value === null) && <p className="mt-2 flex items-center gap-2 text-caption text-ink-500"><span aria-hidden className="inline-block size-3 rounded-sm bg-neutral-100" />Shaded days were not tracked.</p>}
  </figure>
}
