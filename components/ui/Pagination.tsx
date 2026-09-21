import Link from 'next/link'
import { cn } from '@/lib/cn'

/**
 * Pagination as real links.
 *
 * Deliberately not buttons: each page IS a distinct URL, so a link is both
 * the honest semantic and the thing that lets a crawler reach page two.
 * Middle-clicking a page number has to open it in a new tab, which a
 * button-plus-router can never do.
 *
 * The window is bounded so a 40-page result set does not render 40 links
 * on a 390px screen; first and last are always reachable so the ends of the
 * set are one tap away.
 */
function pageWindow(page: number, pageCount: number): Array<number | 'gap'> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const out: Array<number | 'gap'> = [1]
  const from = Math.max(2, page - 1)
  const to = Math.min(pageCount - 1, page + 1)
  if (from > 2) out.push('gap')
  for (let i = from; i <= to; i++) out.push(i)
  if (to < pageCount - 1) out.push('gap')
  out.push(pageCount)
  return out
}

export function Pagination({
  page,
  pageCount,
  hrefForPage,
}: {
  page: number
  pageCount: number
  hrefForPage: (page: number) => string
}) {
  if (pageCount <= 1) return null
  const items = pageWindow(page, pageCount)

  return (
    <nav aria-label="Pagination" className="mt-8 flex justify-center">
      <ul className="flex flex-wrap items-center gap-1.5">
        <li>
          <Edge href={page > 1 ? hrefForPage(page - 1) : undefined} label="Previous page" glyph="M15 6l-6 6 6 6" />
        </li>
        {items.map((item, i) =>
          item === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-body-sm text-ink-500">
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefForPage(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                className={cn(
                  'grid h-11 min-w-11 place-items-center rounded-md border px-3 text-label tabular',
                  item === page
                    ? 'border-brand-600 bg-brand-600 text-on-brand'
                    : 'border-border-subtle bg-surface-000 text-ink-900 hover:border-brand-600',
                )}
              >
                {item}
              </Link>
            </li>
          ),
        )}
        <li>
          <Edge href={page < pageCount ? hrefForPage(page + 1) : undefined} label="Next page" glyph="M9 6l6 6-6 6" />
        </li>
      </ul>
    </nav>
  )
}

/** Disabled at the ends: rendered as a span, because a dead link is worse. */
function Edge({ href, label, glyph }: { href?: string; label: string; glyph: string }) {
  const shape = (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={glyph} />
    </svg>
  )
  const base = 'grid size-11 place-items-center rounded-md border'
  if (!href) {
    return (
      <span aria-hidden className={cn(base, 'border-border-subtle bg-surface-000 text-ink-500 opacity-45')}>
        {shape}
      </span>
    )
  }
  return (
    <Link href={href} aria-label={label} className={cn(base, 'border-border-subtle bg-surface-000 text-ink-900 hover:border-brand-600')}>
      {shape}
    </Link>
  )
}
