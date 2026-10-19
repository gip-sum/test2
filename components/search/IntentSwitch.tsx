import Link from 'next/link'
import { cn } from '@/lib/cn'
import { buildSearchUrl, emptyQuery, type SearchQuery } from '@/lib/search/query'
import type { Intent } from '@/lib/property/types'

/**
 * Buy / Rent on the results page (UI-15): two links, one the page you are
 * on. Each is a URL, so it works without JavaScript, opens in a new tab and
 * keeps the browser's history honest.
 *
 * Switching carries over where and what — the localities, property types
 * and bedrooms — and drops everything priced or intent-specific, as the
 * homepage search does: a ₹50 L budget is meaningless as a monthly rent,
 * and carrying it across would show an empty page that looks broken.
 *
 * Links, not the homepage's SmoothTabs: tabs switch a panel in place,
 * these change the page.
 */
export function IntentSwitch({ query, className }: { query: SearchQuery; className?: string }) {
  const href = (intent: Intent) =>
    intent === query.intent
      ? buildSearchUrl({ ...query, page: 1 })
      : buildSearchUrl({
          ...emptyQuery(intent, query.city),
          localities: query.localities,
          propertyTypes: query.propertyTypes,
          bedrooms: query.bedrooms,
        })
  return (
    <nav aria-label="Buy or rent" className={cn('search-intent', className)}>
      {(['buy', 'rent'] as const).map((intent) => (
        <Link
          key={intent}
          href={href(intent)}
          aria-current={intent === query.intent ? 'page' : undefined}
          className="search-intent-link"
        >
          <span>{intent === 'buy' ? 'Buy' : 'Rent'}</span>
        </Link>
      ))}
    </nav>
  )
}
