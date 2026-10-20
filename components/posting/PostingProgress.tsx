import Link from 'next/link'
import type { PostingView } from '@/lib/posting/flow'
import { postingUrl } from '@/lib/posting/entry'
import { cn } from '@/lib/cn'

const STAGES = [
  { id: 'role', label: 'About you', group: 'Get started' },
  { id: 'intent', label: 'Your plan', group: 'Get started' },
  { id: 'type', label: 'Property type', group: 'Get started' },
  { id: 'details', label: 'Details', group: 'The property' },
  { id: 'location', label: 'Location', group: 'The property' },
  { id: 'pricing', label: 'Pricing', group: 'The property' },
  { id: 'review', label: 'Review', group: 'Finish' },
  { id: 'photos', label: 'Photos', group: 'Finish' },
] as const

/** Where "return to stage N" leads. Details typed so far always travel with it. */
export function stageUrl(index: number, view: PostingView): string {
  const { entry, carried, locationCarried: location, pricingCarried: pricing } = view
  if (index === 0) return postingUrl({}, { details: carried, location, pricing })
  if (index === 1) return postingUrl({ role: entry.role }, { details: carried, location, pricing })
  if (index === 2) return postingUrl({ role: entry.role, intent: entry.intent }, { details: carried, location, pricing })
  if (index === 4) return postingUrl(entry, { details: carried, location, pricing, step: 'location' })
  if (index === 6) return postingUrl(entry, { details: carried, location, pricing, step: 'pricing-review' })
  if (index === 5) return postingUrl(entry, { details: carried, location, pricing, step: 'pricing' })
  return postingUrl(entry, { details: carried, edit: true, location, pricing })
}

export function activeStage(view: PostingView, photos = false): number {
  if (photos) return 7
  const stage = view.stage === 'pricing-review' ? 'review' : view.stage === 'location-review' ? 'location' : view.stage === 'review' ? 'details' : view.stage
  return STAGES.findIndex((s) => s.id === stage)
}

/** The label of the step after this one, or null on the last. */
export function nextStageLabel(view: PostingView, photos = false): string | null {
  return STAGES[activeStage(view, photos) + 1]?.label ?? null
}

/**
 * Where the seller is in the posting flow (UI-17), in two compositions of
 * the same eight steps — the flow's real stages, nothing derived or padded:
 *
 *  - `rail` (from 1024px, in the workspace's side column): every step in
 *    its group, done steps ticked and linking back, the current one marked
 *    in words and shape as well as colour, the rest waiting.
 *  - `bar` (below 1024px): one line — "Step 4 of 8 · Details", what comes
 *    next — over a segmented track, with the full list in a disclosure, so
 *    progress never takes half a phone screen. A native <details>: it opens
 *    without JavaScript.
 *
 * Each is its own "Posting progress" navigation; only one is displayed at
 * a width, so assistive technology meets one.
 *
 * The bar keeps UI-08's fill (.progress-fill, app/globals.css): a step being
 * entered sweeps in across a client-side navigation.
 */
export function PostingProgress({ view, photos = false, variant }: { view: PostingView; photos?: boolean; variant: 'rail' | 'bar' }) {
  const active = activeStage(view, photos)
  const current = STAGES[active]!
  const next = STAGES[active + 1]

  if (variant === 'bar') {
    return (
      <nav aria-label="Posting progress" className="lg:hidden">
        <details className="post-stepbar group rounded-lg border border-border-subtle bg-surface-000 shadow-e1">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1">
              <span className="block text-overline uppercase text-brand-700">Step {active + 1} of {STAGES.length}</span>
              <span className="block truncate text-body font-semibold text-ink-900">
                {current.label}
                {next && <span className="font-normal text-ink-500"> · Next: {next.label}</span>}
              </span>
            </span>
            <span className="text-label text-brand-700">
              <span className="group-open:hidden">All steps</span>
              <span className="hidden group-open:inline">Hide</span>
            </span>
          </summary>
          <div className="px-4 pb-3">
            <ol className="grid grid-cols-8 gap-1" aria-hidden>
              {STAGES.map((stage, index) => (
                <li key={stage.id} className="block h-1.5 overflow-hidden rounded-full bg-surface-200">
                  <span data-filled={index <= active || undefined} className="progress-fill block h-full rounded-full bg-brand-600" />
                </li>
              ))}
            </ol>
          </div>
          <div className="border-t border-border-subtle px-2 py-2">
            <StepList view={view} active={active} />
          </div>
        </details>
      </nav>
    )
  }

  return (
    <nav aria-label="Posting progress" className="hidden lg:block">
      <p className="text-overline uppercase text-brand-700">Step {active + 1} of {STAGES.length}</p>
      <div className="mt-3">
        <StepList view={view} active={active} grouped />
      </div>
    </nav>
  )
}

function StepList({ view, active, grouped = false }: { view: PostingView; active: number; grouped?: boolean }) {
  const groups = grouped ? [...new Set(STAGES.map((s) => s.group))] : [null]
  return (
    <div className="grid gap-4">
      {groups.map((group) => (
        <div key={group ?? 'all'}>
          {group && <p className="mb-1.5 px-2 text-overline uppercase text-ink-500">{group}</p>}
          <ol className="grid">
            {STAGES.map((stage, index) => {
              if (group && stage.group !== group) return null
              const done = index < active, here = index === active
              const mark = (
                <span aria-hidden className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full border-2 text-caption font-bold tabular',
                  done ? 'border-brand-600 bg-brand-600 text-on-brand' : here ? 'border-brand-600 bg-surface-000 text-brand-700' : 'border-border-strong bg-surface-000 text-ink-500',
                )}>
                  {done ? (
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                  ) : index + 1}
                </span>
              )
              return (
                <li key={stage.id} aria-current={here ? 'step' : undefined}>
                  {done ? (
                    <Link href={stageUrl(index, view)} aria-label={`Return to ${stage.label}`} className="post-step flex min-h-11 items-center gap-3 rounded-md px-2 text-body-sm font-semibold text-ink-900 hover:bg-brand-50">
                      {mark}<span className="min-w-0 flex-1">{stage.label}</span>
                      <span className="text-caption font-semibold text-brand-700">Done</span>
                    </Link>
                  ) : (
                    <span className={cn('flex min-h-11 items-center gap-3 rounded-md px-2 text-body-sm', here ? 'bg-brand-50 font-semibold text-ink-900' : 'text-ink-500')}>
                      {mark}<span className="min-w-0 flex-1">{stage.label}</span>
                      {here && <span className="text-caption font-semibold text-brand-700">You are here</span>}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </div>
  )
}
