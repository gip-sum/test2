import type { ReactNode } from 'react'
import { RATE_MIN_VIEWS, type Change, type Range, type Totals } from '@/lib/analytics/model'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * The period's figures as plain numbers (Phase 20, UI-10). The chart below
 * them is a reading aid; these are the answer.
 *
 * Direction is said in words ("Up 4", "Down 2", "Same as"), with an arrow
 * beside it for a quick scan, in ink, never green or red alone. A period
 * that was not tracked says so, never 0 or 0%.
 */
export function PeriodSummary({ current, views, enquiries, saves, rate, range }: {
  current: Totals
  views: Change
  enquiries: Change
  /** Buyers who have it saved now; null when the count could not be read. */
  saves: number | null
  rate: number | null
  range: Range
}) {
  return <dl className="workspace-summary">
    <Tile label={`Views, last ${range} days`} value={current.views === null ? 'Not tracked' : String(current.views)} note={<ChangeNote change={views} range={range} unit={['view', 'views']} />} />
    <Tile label={`Enquiries, last ${range} days`} value={String(current.enquiries)} note={<ChangeNote change={enquiries} range={range} unit={['enquiry', 'enquiries']} />} />
    <Tile label="Saved now" value={saves === null ? 'Unavailable' : String(saves)}
      note={saves === null ? 'Save counts could not be loaded.' : `${plural(saves, 'buyer has', 'buyers have')} it saved today. A current count, not a figure for the period.`} />
    <Tile label="Enquiry rate" value={rate === null ? 'Not enough views yet' : String(rate)} small={rate === null}
      unit={rate === null ? undefined : 'per 100 views'}
      note={rate === null ? `Enquiry rate appears once the period has at least ${RATE_MIN_VIEWS} views.` : `${rate} enquiries per 100 views in the last ${range} days.`} />
  </dl>
}

function ChangeNote({ change, range, unit }: { change: Change; range: Range; unit: [string, string] }) {
  const previous = `the previous ${range} days`
  if (change.kind === 'not-tracked') return <>Previous {range} days: not tracked</>
  if (change.kind === 'partly-tracked') return <>Previous {range} days: {plural(change.previous, unit[0], unit[1])} on {plural(change.countedDays, 'counted day', 'counted days')}, so not compared</>
  if (change.kind === 'same') return <>Same as {previous} ({change.previous})</>
  return <><span aria-hidden className="mr-1 inline-block">{change.kind === 'up' ? '↑' : '↓'}</span>{change.kind === 'up' ? 'Up' : 'Down'} {change.by} from {change.previous} in {previous}</>
}

function Tile({ label, value, unit, small, note }: { label: string; value: string; unit?: string; small?: boolean; note: ReactNode }) {
  return <div>
    <dt className="text-body-sm text-ink-700">{label}</dt>
    <dd className={small ? 'mt-2 text-body font-semibold text-ink-900' : 'mt-1 text-[26px] font-semibold leading-tight text-ink-900'}>{value}{unit && <>{' '}<span className="text-body-sm font-normal text-ink-700">{unit}</span></>}</dd>
    <dd className="mt-1 text-caption text-ink-500">{note}</dd>
  </div>
}
