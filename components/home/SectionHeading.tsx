import Link from 'next/link'
import { ChevronRightIcon } from '@/components/ui/icons'

/**
 * The homepage's section head: eyebrow, title, and one "see all" route.
 *
 * The descriptive sentence is kept for tablets and up and left out on
 * phones, where every line pushes the listings further down; the title
 * already says what the section is.
 */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
}: {
  id: string
  eyebrow: string
  title: string
  description?: string
  /** `context` completes the link's name for screen readers ("See all" → "See all homes for sale"). */
  action?: { href: string; label: string; context?: string }
}) {
  return (
    <div className="home-section-head">
      <div className="min-w-0">
        <p className="text-overline uppercase tracking-[0.14em] text-brand-600">{eyebrow}</p>
        <h2 id={id} className="mt-1 font-display text-ink-900">{title}</h2>
        {description && <p className="mt-1.5 hidden max-w-xl text-body-sm text-ink-500 sm:block">{description}</p>}
      </div>
      {action && (
        <Link href={action.href} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md pl-2 text-label text-brand-600 hover:underline">
          {action.label}
          {action.context && <span className="sr-only"> {action.context}</span>}
          <ChevronRightIcon className="size-4" />
        </Link>
      )}
    </div>
  )
}
