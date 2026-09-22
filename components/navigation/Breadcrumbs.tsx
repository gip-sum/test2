import Link from 'next/link'

/**
 * Where this page sits in the place hierarchy.
 *
 * Two jobs, both real: it lets a visitor climb back out to a wider search
 * without using Back, and it is the crawl path that gives a property page
 * its context. Rendered as an ordered list inside a labelled nav, which is
 * what lets a screen reader treat it as a trail rather than a row of links.
 */
export type Crumb = { label: string; href?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-body-sm text-ink-500">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {item.href && !last ? (
                <Link href={item.href} className="truncate rounded-sm hover:text-brand-600 hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className="truncate text-ink-700" aria-current={last ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
              {!last && (
                <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 text-ink-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
