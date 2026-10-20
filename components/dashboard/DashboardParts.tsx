import Link from 'next/link'
import type { ReactNode } from 'react'
import { DailyActivityChart } from '@/components/analytics/DailyActivityChart'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ArrowRightIcon, CameraIcon, CheckIcon, MailIcon } from '@/components/ui/icons'
import type { AttentionItem, DashboardQuery, FilterKey } from '@/lib/dashboard/model'
import { dashboardHref, FILTERS, SORTS } from '@/lib/dashboard/model'
import { performanceHref, type DayPoint, type Totals } from '@/lib/analytics/model'
import { cn } from '@/lib/cn'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Status filters (UI-18): the Phase 19 filters as one navigation row, each
 * a link with its real count, the current one marked in shape and words
 * (aria-current) as well as colour. A status with nothing in it stays a
 * link — its empty state says what would be there — but recedes. On a
 * phone the row scrolls sideways inside its own box, never the page.
 *
 * Replaces the summary tiles above the old tabs, which repeated four of
 * these same counts.
 */
export function StatusNav({ counts, query }: { counts: Record<FilterKey, number>; query: DashboardQuery }) {
  return <nav aria-label="Filter by status" className="dash-status">
    <ul>
      {FILTERS.map((f) => {
        const current = f.key === query.status, empty = counts[f.key] === 0
        return <li key={f.key}>
          <Link href={dashboardHref({ status: f.key, sort: query.sort })} aria-current={current ? 'page' : undefined} data-empty={empty || undefined} className="dash-status-link">
            <span>{f.label}</span><span className="dash-status-count tabular">{counts[f.key]}</span>
          </Link>
        </li>
      })}
    </ul>
  </nav>
}

/** Sort, as two links in a small segmented control (URL state, Phase 19). */
export function SortControl({ query }: { query: DashboardQuery }) {
  return <nav aria-label="Sort properties" className="flex items-center gap-2 text-body-sm">
    <span className="text-ink-700">Sort</span>
    <span className="inline-flex rounded-full border border-border-subtle bg-surface-100 p-0.5">
      {SORTS.map((s) => <Link key={s.key} href={dashboardHref({ status: query.status, sort: s.key })} aria-current={s.key === query.sort ? 'page' : undefined}
        className={cn('inline-flex min-h-11 items-center rounded-full px-3 font-semibold', s.key === query.sort ? 'bg-surface-000 text-ink-900 shadow-e1' : 'text-ink-700 hover:text-ink-900')}>{s.label}</Link>)}
    </span>
  </nav>
}

const HEADLINE: Record<AttentionItem['kind'], (item: AttentionItem) => string> = {
  returned: ({ card }) => card.status === 'REJECTED' ? 'Rejected — fix and re-submit' : 'Corrections requested',
  expiring: ({ card }) => card.daysLeft !== null && card.daysLeft <= 1 ? 'Expires within a day' : `Expires in ${card.daysLeft} days`,
  enquiries: ({ card }) => card.enquiries && card.enquiries !== 'unavailable' ? `${plural(card.enquiries.newCount, 'new enquiry', 'new enquiries')}` : 'New enquiries',
  expired: () => 'Expired — no longer public',
  'draft-incomplete': ({ card }) => `Draft: ${card.progress!.complete} of ${card.progress!.total} sections done`,
  'draft-photos': () => 'Draft ready — add photos',
  'draft-ready': () => 'Draft ready to review',
}
/** Shown at once; the rest open below, so the list stays near the top of a phone. */
const ATTENTION_FIRST = 3

/**
 * What is waiting for the seller (UI-18): the first question a seller
 * opening the dashboard has. Each row says what happened, to which
 * property, and links straight to the action that resolves it. Built from
 * `attentionItems`, so every row is a fact about a card. With nothing
 * waiting it says so, plainly.
 */
export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  const first = items.slice(0, ATTENTION_FIRST), more = items.slice(ATTENTION_FIRST)
  return <section aria-labelledby="attention-heading" className="dash-panel">
    <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
      <h2 id="attention-heading" className="font-display font-semibold text-ink-900">Needs your attention</h2>
      {items.length > 0 && <span className="text-caption text-ink-500 tabular">{plural(items.length, 'item', 'items')}</span>}
    </div>
    {items.length === 0
      ? <p className="flex items-center gap-3 px-4 pb-4 pt-3 text-body-sm text-ink-700">
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"><CheckIcon className="size-4" /></span>
        Nothing is waiting for you. New enquiries, listings sent back and listings about to expire will appear here.
      </p>
      : <ul className="mt-2 pb-1.5">
        {first.map((item) => <AttentionRow key={`${item.kind}-${item.card.draftId}`} item={item} />)}
        {more.length > 0 && <li className="border-t border-border-subtle">
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-label font-semibold text-brand-700 [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Show {more.length} more</span><span className="hidden group-open:inline">Show fewer</span>
            </summary>
            <ul>{more.map((item) => <AttentionRow key={`${item.kind}-${item.card.draftId}`} item={item} />)}</ul>
          </details>
        </li>}
      </ul>}
  </section>
}

function AttentionRow({ item }: { item: AttentionItem }) {
  return <li className="flex min-w-0 items-start gap-3 border-t border-border-subtle px-4 py-3">
    <AttentionMark item={item} />
    <div className="min-w-0 flex-1">
      <p className="text-body-sm font-semibold text-ink-900">{HEADLINE[item.kind](item)}</p>
      <p className="mt-0.5 break-words text-body-sm text-ink-700">{item.card.title}</p>
      <Link href={item.href} className="-my-1 mt-0 inline-flex min-h-11 items-center gap-1 text-label font-semibold text-brand-700 hover:underline">
        {item.action}<span className="sr-only"> for {item.card.title}</span><ArrowRightIcon className="size-4" />
      </Link>
    </div>
  </li>
}

function AttentionMark({ item }: { item: AttentionItem }) {
  const shape = 'grid size-8 shrink-0 place-items-center rounded-full'
  if (item.kind === 'enquiries') return <span aria-hidden className={cn(shape, 'bg-brand-600 text-on-brand')}><MailIcon className="size-4" /></span>
  if (item.kind === 'draft-photos') return <span aria-hidden className={cn(shape, 'bg-surface-200 text-ink-700')}><CameraIcon className="size-4" /></span>
  return <span className="mt-0.5 shrink-0"><StatusBadge status={item.card.status} /></span>
}

/**
 * Buyer interest (UI-18): the seller's measured activity on the dashboard
 * itself, so "are buyers interested?" is answered where the listings are.
 * Views and enquiries over 30 days for all submitted listings, the
 * enquiries still marked new, and the same UI-10 chart (Bklit-derived) at a compact height.
 * Every figure is measured or counted; what was not measured says so.
 */
export function InterestPanel({ state }: {
  state:
    | { kind: 'ready'; totals: Totals; series: DayPoint[]; waiting: number }
    | { kind: 'none' }
    | { kind: 'unavailable'; reason: 'not-ready' | 'activity'; waiting: number }
}) {
  return <section aria-labelledby="interest-heading" className="dash-panel p-4">
    <div className="flex items-baseline justify-between gap-3">
      <h2 id="interest-heading" className="font-display font-semibold text-ink-900">Buyer interest</h2>
      <span className="text-caption text-ink-500">Last 30 days</span>
    </div>
    {state.kind === 'none' && <p className="mt-2 text-body-sm text-ink-700">Views and enquiries appear here once a property has been submitted and goes live.</p>}
    {state.kind === 'unavailable' && <>
      <p className="mt-2 text-body-sm text-ink-700">{state.reason === 'not-ready' ? 'View counting has not been switched on for this site yet.' : 'Measured views could not be loaded right now.'} Enquiries are unaffected.</p>
      {state.waiting > 0 && <Waiting count={state.waiting} />}
    </>}
    {state.kind === 'ready' && <>
      <dl className="mt-3 grid grid-cols-3 divide-x divide-border-subtle rounded-md bg-surface-100 py-2.5 text-center">
        <Figure label="Views" value={state.totals.views === null ? '—' : String(state.totals.views)} note={state.totals.views === null ? 'Not tracked yet' : undefined} />
        <Figure label="Enquiries" value={String(state.totals.enquiries)} />
        <Figure label="New" value={String(state.waiting)} note="to answer" />
      </dl>
      <div className="mt-4"><DailyActivityChart id="dashboard-activity" size="compact" points={state.series} period="all listings, last 30 days" /></div>
    </>}
    <Link href={performanceHref({ range: 30 })} className="mt-3 inline-flex min-h-11 items-center gap-1 text-label font-semibold text-brand-700 hover:underline">
      Open performance<ArrowRightIcon className="size-4" />
    </Link>
  </section>
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="min-w-0 px-2">
    <dt className="text-caption text-ink-700">{label}</dt>
    <dd className="font-display text-heading-3 font-semibold text-ink-900 tabular">{value}</dd>
    {note && <dd className="text-caption text-ink-500">{note}</dd>}
  </div>
}

function Waiting({ count }: { count: number }) {
  return <p className="mt-3 flex items-center gap-2 text-body-sm font-semibold text-ink-900">
    <span aria-hidden className="grid size-7 place-items-center rounded-full bg-brand-600 text-on-brand"><MailIcon className="size-3.5" /></span>
    {plural(count, 'new enquiry', 'new enquiries')} to answer
  </p>
}

/** Copy for a status with nothing in it (UI-18): what would be here, and the way on. */
export const EMPTY_COPY: Record<FilterKey, { title: string; body: string }> = {
  all: { title: 'No properties', body: 'Post a property to start. Your draft saves as you go and stays private until you submit it.' },
  draft: { title: 'No drafts', body: 'Properties you start but have not submitted wait here, saved as you left them.' },
  review: { title: 'Nothing under review', body: 'Properties you submit wait here while a reviewer checks them.' },
  active: { title: 'No active listings', body: 'A listing appears here once a reviewer approves it and it goes live.' },
  expired: { title: 'No expired listings', body: 'Listings that reach their end date appear here, ready to review and re-submit.' },
  rejected: { title: 'No rejected listings', body: 'A listing a reviewer rejects appears here with the reviewer’s note.' },
  corrections: { title: 'Nothing waiting for corrections', body: 'A listing a reviewer sends back for changes appears here with what to fix.' },
  withdrawn: { title: 'No withdrawn listings', body: 'Listings you take down appear here; you can edit and re-submit them.' },
}

export function PanelHeading({ children, id, count }: { children: ReactNode; id: string; count: number }) {
  return <h2 id={id} tabIndex={-1} className="font-display font-semibold text-ink-900">{children} <span className="tabular font-normal text-ink-500">({count})</span></h2>
}
