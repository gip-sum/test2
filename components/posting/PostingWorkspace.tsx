import Link from 'next/link'
import type { ReactNode } from 'react'
import type { PostingView } from '@/lib/posting/flow'
import { PROPERTY_TYPE_LABEL, SELLER_LABEL } from '@/lib/property/types'
import { PostingProgress, nextStageLabel } from './PostingProgress'

/**
 * The posting workspace (UI-17): one frame for every step of Post a
 * property, in the 1400px frame and the public pages' language, but calm —
 * a task, not a showcase.
 *
 *  - A mint band says where the seller is: "Post a property", the way back
 *    and, on a phone, the one-line step bar.
 *  - The step itself sits in one white card, its fields at reading width.
 *  - From 1024px a sticky side column keeps the whole route in view (the
 *    step rail), what the seller has already told us, and what this step
 *    is for and what comes next.
 *
 * Server-rendered throughout; the step's own form decides what it needs.
 */
export function PostingWorkspace({ view, photos = false, back, backLabel = 'Back', guide, children }: {
  view: PostingView
  photos?: boolean
  back?: string | null
  backLabel?: string
  guide: { title: string; body: string }
  children: ReactNode
}) {
  const next = nextStageLabel(view, photos)
  const { role, intent, type } = view.entry
  const answers = [
    role ? { label: 'Posting as', value: SELLER_LABEL[role] } : null,
    intent ? { label: 'Plan', value: intent === 'buy' ? 'Sell' : 'Rent out' } : null,
    type ? { label: 'Property', value: PROPERTY_TYPE_LABEL[type] } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  return (
    <>
      <div className="post-band">
        <div className="home-container pb-4 pt-4 lg:pb-6 lg:pt-6">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-2 text-overline uppercase text-brand-700">
              <span aria-hidden className="h-0.5 w-6 shrink-0 rounded-full bg-brand-500" />
              <span className="truncate">Post a property</span>
            </p>
            {back && (
              <Link href={back} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-label text-ink-700 hover:bg-surface-000 hover:text-brand-700">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
                {backLabel}
              </Link>
            )}
          </div>
          <div className="mt-3 lg:hidden">
            <PostingProgress view={view} photos={photos} variant="bar" />
          </div>
        </div>
      </div>

      <div className="home-container grid gap-6 pb-20 pt-5 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-10 lg:pt-8 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <section aria-labelledby="post-heading" className="post-main min-w-0 rounded-lg border border-border-subtle bg-surface-000 px-4 py-6 shadow-e1 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          {children}
        </section>

        <aside className="grid gap-4 lg:sticky lg:top-24" aria-label="About this step">
          <div className="hidden rounded-lg border border-border-subtle bg-surface-000 p-4 shadow-e1 lg:block">
            <PostingProgress view={view} photos={photos} variant="rail" />
          </div>
          {answers.length > 0 && (
            <div className="hidden rounded-lg border border-border-subtle bg-surface-000 p-4 shadow-e1 lg:block">
              <h2 className="text-overline uppercase text-ink-500">Your listing so far</h2>
              <dl className="mt-2">
                {answers.map((a) => (
                  <div key={a.label} className="flex items-baseline justify-between gap-3 border-b border-border-subtle py-2 last:border-b-0">
                    <dt className="text-body-sm text-ink-500">{a.label}</dt>
                    <dd className="text-right text-body-sm font-semibold text-ink-900">{a.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <div className="rounded-lg bg-brand-50 p-5">
            <h2 className="font-display text-body-lg font-semibold text-ink-900">{guide.title}</h2>
            <p className="mt-1.5 text-body-sm text-ink-700">{guide.body}</p>
            {next && <p className="mt-3 border-t border-brand-200 pt-3 text-caption text-ink-500">Next: <span className="font-semibold text-ink-700">{next}</span>. Nothing is published until you submit it for review.</p>}
          </div>
        </aside>
      </div>
    </>
  )
}

export const PHOTO_GUIDE = { title: 'The first photo is the cover.', body: 'It leads your listing in search and on its page. Daylight, level photos of every room help buyers most. Photos stay private until the listing is published.' }

/** A step's heading and lede, the same on every step. */
export function StepHeading({ title, lede, children }: { title: string; lede?: ReactNode; children?: ReactNode }) {
  return (
    <header className="max-w-2xl">
      <h1 id="post-heading" className="font-display text-heading-2 text-ink-900 sm:text-heading-1">{title}</h1>
      {lede && <p className="mt-2 text-body text-ink-700 sm:text-body-lg">{lede}</p>}
      {children}
    </header>
  )
}

/**
 * One group of a form (UI-17): its title and a sentence on the left from
 * 768px, the fields at reading width on the right; stacked on a phone.
 * Replaces one long column of unrelated inputs.
 */
export function FormSection({ title, description, children, first = false }: { title: string; description?: ReactNode; children: ReactNode; first?: boolean }) {
  return (
    <section className={first ? 'md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8 xl:grid-cols-[15rem_minmax(0,1fr)]' : 'border-t border-border-subtle pt-7 md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8 xl:grid-cols-[15rem_minmax(0,1fr)]'}>
      <div className="mb-4 md:mb-0">
        <h2 className="font-display text-body-lg font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-1 text-body-sm text-ink-500">{description}</p>}
      </div>
      <div className="grid min-w-0 max-w-[40rem] gap-6">{children}</div>
    </section>
  )
}

/** Primary action first, with the reassurance beside it; one bar for every step. */
export function StepActions({ children, note = 'Nothing is published yet. Save as draft to keep your answers and resume later.' }: { children: ReactNode; note?: string }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border-subtle pt-6 sm:flex-row sm:items-center sm:gap-5">
      {children}
      <p className="text-body-sm text-ink-500">{note}</p>
    </div>
  )
}
