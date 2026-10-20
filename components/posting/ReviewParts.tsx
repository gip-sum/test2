import Link from 'next/link'
import type { ReactNode } from 'react'

export type ReviewRow = { key: string; label: string; value: ReactNode; edit: string; changeLabel: string }

/**
 * One reviewed group of answers (UI-17): a titled card, each answer a row
 * with its label, the value as the listing will state it, and its own
 * Change link back to the field. Label and value side by side from 640px,
 * stacked on a phone.
 */
export function ReviewList({ title, rows, className }: { title: string; rows: ReviewRow[]; className?: string }) {
  return (
    <section className={className} aria-labelledby={`review-${title.replace(/\W+/g, '-').toLowerCase()}`}>
      <h2 id={`review-${title.replace(/\W+/g, '-').toLowerCase()}`} className="font-display text-body-lg font-semibold text-ink-900">{title}</h2>
      <dl aria-label={title} className="mt-3 divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface-000 px-4 sm:px-5">
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-3 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:gap-x-5">
            <dt className="text-body-sm text-ink-500 sm:text-body">{row.label}</dt>
            <dd className="col-start-1 row-start-2 break-words text-body font-semibold text-ink-900 tabular [overflow-wrap:anywhere] sm:col-start-2 sm:row-start-1">{row.value}</dd>
            <Link href={row.edit} aria-label={row.changeLabel} className="col-start-2 row-span-2 row-start-1 inline-flex min-h-11 items-center rounded-full px-3 text-label text-brand-700 hover:bg-brand-50 sm:col-start-3 sm:row-span-1">Change</Link>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** What comes next after a review, with the one action that takes the seller there. */
export function NextStep({ title = 'What happens next?', body, primary, secondary }: { title?: string; body: string; primary: { href: string; label: string }; secondary?: { href: string; label: string } }) {
  return (
    <div className="mt-8 flex flex-col gap-4 rounded-lg bg-brand-50 p-5 sm:flex-row sm:items-center sm:p-6">
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-body-lg font-semibold text-ink-900">{title}</h2>
        <p className="mt-1 text-body-sm text-ink-700">{body}</p>
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        <Link href={primary.href} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-supply-600 px-6 text-label text-on-supply hover:brightness-95">
          {primary.label}
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
        </Link>
        {secondary && <Link href={secondary.href} className="inline-flex min-h-11 items-center justify-center px-3 text-label text-brand-700 underline underline-offset-4">{secondary.label}</Link>}
      </div>
    </div>
  )
}
