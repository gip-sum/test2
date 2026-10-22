import Link from 'next/link'
import type { ReactNode } from 'react'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AlertIcon, ArrowRightIcon, ClockIcon } from '@/components/ui/icons'
import { formatWait, REVIEW_OVERDUE_MS, type AdminListing } from '@/lib/admin/model'
import { SELLER_LABEL } from '@/lib/property/types'
import { cn } from '@/lib/cn'

/**
 * The admin console's parts (UI-20). Server components: everything a
 * reviewer reads is in the HTML; the only client code on these pages is the
 * decision and account forms.
 */

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' })
const moment = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

/** One white working surface with a heading row; `action` sits on the heading's right. */
export function AdminPanel({ id, anchor, title, count, action, children, className, flush = false }: {
  id: string; anchor?: string; title: ReactNode; count?: number | null; action?: ReactNode; children: ReactNode; className?: string; flush?: boolean
}) {
  return <section id={anchor} aria-labelledby={id} className={cn('admin-panel', anchor && 'scroll-mt-24', className)}>
    <div className="admin-panel-head">
      <h2 id={id} tabIndex={-1} className="admin-panel-title">{title}{count != null && <span className="tabular font-normal text-ink-500"> ({count})</span>}</h2>
      {action}
    </div>
    <div className={flush ? undefined : 'admin-panel-body'}>{children}</div>
  </section>
}

/** A link styled as the panel's way on: "Open the queue →". */
export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex min-h-11 items-center gap-1.5 text-label font-semibold text-brand-700 hover:underline underline-offset-4">{children}<ArrowRightIcon className="size-4" /></Link>
}

/**
 * How long a submission has waited, in words. Over 48 hours it is overdue,
 * said in words and with a mark — never by colour alone.
 */
export function Waiting({ since, now, compact = false }: { since: string; now: number; compact?: boolean }) {
  const ms = now - Date.parse(since), overdue = ms > REVIEW_OVERDUE_MS
  return <span className={cn('admin-wait', overdue && 'is-overdue')}>
    {overdue ? <AlertIcon className="size-4 shrink-0" /> : <ClockIcon className="size-4 shrink-0" />}
    <span><span className="font-semibold text-ink-900 tabular">{formatWait(ms)}</span>{overdue && <span className="admin-overdue">{compact ? 'Overdue' : 'Overdue · over 2 days'}</span>}</span>
  </span>
}

/**
 * Submitted listings as rows a reviewer can scan (UI-20; were a seven-column
 * table): one row per listing, the whole row one link to its review — the
 * title's link stretches over the row, so it is one tab stop and its name is
 * the title, with the rest read as the row's text.
 *
 * `queue`: the review queue, oldest first, led by how long each has waited
 * and its place in line. Otherwise: any status, led by the status badge.
 * From 1024px the rows align in columns; below, each is a compact card.
 */
export function ListingRows({ rows, now, queue = false, start = 0, label }: { rows: AdminListing[]; now: number; queue?: boolean; start?: number; label: string }) {
  return <>
    <div aria-hidden className={cn('admin-row-head', queue ? 'is-queue' : 'is-listings')}>
      <span>{queue ? 'Waiting' : 'Status'}</span><span>Property</span><span className="text-right">Price</span><span>Seller</span><span>{queue ? 'Submitted' : 'Dates'}</span><span />
    </div>
    <ol aria-label={label} className="admin-rows" start={queue ? start + 1 : undefined}>
      {rows.map((r, i) => {
        const overdue = queue && now - Date.parse(r.submitted_at) > REVIEW_OVERDUE_MS
        return <li key={r.id} className={cn('admin-row', queue ? 'is-queue' : 'is-listings', overdue && 'is-overdue')}>
          <div className="admin-row-lead">
            {queue ? <><span className="admin-row-place tabular" aria-hidden>{start + i + 1}</span><span className="sr-only">Waiting </span><Waiting since={r.submitted_at} now={now} compact /></> : <StatusBadge status={r.status} />}
          </div>
          <div className="min-w-0">
            <Link href={`/admin/moderation/${r.id}`} className="admin-row-link">{r.title}</Link>
            <p className="truncate text-caption text-ink-700">{r.locality_name}, {r.city_name} · {r.intent === 'buy' ? 'For sale' : 'For rent'}</p>
          </div>
          <div className="admin-row-price"><span className="sr-only">Price: </span><PriceDisplay amount={r.price} intent={r.intent} className="[&_p]:text-body-sm [&_p]:font-semibold lg:items-end" /></div>
          <div className="admin-row-seller min-w-0 text-caption text-ink-700"><span className="sr-only">Seller: </span><span className="admin-row-seller-name text-body-sm text-ink-900">{r.seller_name}</span><span aria-hidden className="admin-row-sep"> · </span>{SELLER_LABEL[r.seller_type]}</div>
          <div className="admin-row-date text-caption text-ink-700">
            {queue ? <><span className="sr-only">Submitted </span>{moment(r.submitted_at)}</>
              : <>Submitted {day(r.submitted_at)}{r.expires_at && (r.status === 'ACTIVE' || r.status === 'EXPIRED') ? <span className="block">{r.status === 'ACTIVE' ? 'Expires' : 'Expired'} {day(r.expires_at)}</span> : null}</>}
          </div>
          <span aria-hidden className="admin-row-go">Review<ArrowRightIcon className="size-4" /></span>
        </li>
      })}
    </ol>
  </>
}

/** A figure with its label, and a note under it when the number needs one. */
export function Figure({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return <div className="admin-figure"><dt className="text-caption font-semibold text-ink-700">{label}</dt><dd className="mt-1 font-display text-heading-2 font-semibold text-ink-900 tabular">{value}</dd>{note && <dd className="mt-0.5 text-caption text-ink-500">{note}</dd>}</div>
}
