import Link from 'next/link'
import type { PostingView } from '@/lib/posting/flow'
import { postingUrl } from '@/lib/posting/entry'

const STAGES = [
  { id: 'role', label: 'About you' },
  { id: 'intent', label: 'Your plan' },
  { id: 'type', label: 'Property type' },
  { id: 'details', label: 'Details' },
  { id: 'review', label: 'Review' },
] as const

/** Where "return to stage N" leads. Details typed so far always travel with it. */
export function stageUrl(index: number, view: PostingView): string {
  const { entry, carried } = view
  if (index === 0) return postingUrl({}, { details: carried })
  if (index === 1) return postingUrl({ role: entry.role }, { details: carried })
  if (index === 2) return postingUrl({ role: entry.role, intent: entry.intent }, { details: carried })
  return postingUrl(entry, { details: carried, edit: true })
}

export function PostingProgress({ view }: { view: PostingView }) {
  const active = STAGES.findIndex((stage) => stage.id === view.stage)
  return (
    <nav aria-label="Posting progress" className="mt-7 sm:mt-9">
      <p className="text-overline font-semibold uppercase tracking-[0.18em] text-brand-700">Step {active + 1} of {STAGES.length}</p>
      <ol className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-3">
        {STAGES.map((stage, index) => (
          <li key={stage.id} aria-current={index === active ? 'step' : undefined}>
            {index < active ? (
              <Link href={stageUrl(index, view)} className="post-progress-link group block rounded-sm" aria-label={`Return to ${stage.label}`}>
                <span className="block h-1.5 rounded-full bg-brand-600 transition-colors group-hover:bg-brand-700" />
                <span className="mt-2 block text-[11px] font-semibold text-brand-700 sm:text-caption">{stage.label}</span>
              </Link>
            ) : (
              <span className="block">
                <span className={`block h-1.5 rounded-full ${index === active ? 'bg-brand-600' : 'bg-surface-200'}`} />
                <span className={`mt-2 block text-[11px] font-semibold sm:text-caption ${index === active ? 'text-ink-900' : 'text-ink-500'}`}>{stage.label}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
