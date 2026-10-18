import Link from 'next/link'
import { ArrowRightIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

/**
 * The homepage's section head (UI-14): an eyebrow on a short brand rule,
 * a display title, a sentence, and one "View all" route as a pill.
 *
 * The descriptive sentence is kept for tablets and up and left out on
 * phones, where every line pushes the listings further down; the title
 * already says what the section is. `tone="forest"` is for a dark band.
 */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
  tone = 'light',
}: {
  id: string
  eyebrow: string
  title: string
  description?: string
  /** `context` completes the link's name for screen readers ("View all" → "View all homes for sale"). */
  action?: { href: string; label: string; context?: string }
  tone?: 'light' | 'forest'
}) {
  const dark = tone === 'forest'
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className={cn('flex items-center gap-2 text-overline uppercase', dark ? 'text-mint' : 'text-brand-600')}>
          <span aria-hidden className={cn('h-0.5 w-6 rounded-full', dark ? 'bg-mint' : 'bg-brand-500')} />
          {eyebrow}
        </p>
        <h2 id={id} className={cn('mt-2 font-display text-heading-2 lg:text-heading-1', dark ? 'text-on-forest' : 'text-ink-900')}>{title}</h2>
        {description && <p className={cn('mt-2 hidden max-w-2xl text-body sm:block', dark ? 'text-on-forest/75' : 'text-ink-500')}>{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className={cn(
            'home-arrow-card inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-label transition-colors',
            dark ? 'border-forest-line text-on-forest hover:bg-on-forest/10' : 'border-border-strong bg-surface-000 text-ink-900 hover:border-brand-600 hover:text-brand-700',
          )}
        >
          {action.label}
          {action.context && <span className="sr-only"> {action.context}</span>}
          <ArrowRightIcon className="home-arrow size-4" />
        </Link>
      )}
    </div>
  )
}
