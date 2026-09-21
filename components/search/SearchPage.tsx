import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { Footer } from '@/components/navigation/Footer'
import { DevDataNotice } from '@/components/home/DevDataNotice'
import { SearchLayout } from '@/components/search/SearchLayout'
import { ResultsList } from '@/components/search/ResultsList'
import { ZeroResults } from '@/components/search/ZeroResults'
import { Pagination } from '@/components/ui/Pagination'
import { searchProperties } from '@/lib/property/search'
import { getLocationBySlug, getAllLocalitySlugs, getLocalityNameMap } from '@/lib/location/queries'
import { describeSearch } from '@/lib/search/describe'
import { buildSearchUrl, parseSearchQuery, type SearchQuery } from '@/lib/search/query'
import type { Intent } from '@/lib/property/types'
import { BRAND } from '@/lib/brand'

/**
 * The results page, shared by /buy and /rent.
 *
 * Intent is a literal route segment rather than a dynamic one, because buy
 * and rent are two products with different fields and different economics —
 * not two values of a variable. Making the router say so means an unknown
 * first segment (/nope/kolkata, /in/kolkata) matches no route at all and
 * gets Next's real 404, instead of being swallowed by a catch-all that
 * claims every two-segment path on the site.
 *
 * The cost is two four-line route files. The benefit is an honest route
 * table, correct status codes, and nothing blocking the routes Phase 4 and
 * Phase 6 add next.
 */

export type SearchRouteProps = {
  params: Promise<{ city: string; rest?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const KNOWN_LOCALITIES = new Set(getAllLocalitySlugs())
const isKnownLocality = (slug: string) => KNOWN_LOCALITIES.has(slug)

async function resolve(
  intent: Intent,
  props: SearchRouteProps,
): Promise<{ query: SearchQuery; cityName: string }> {
  const { city, rest } = await props.params
  const params = await props.searchParams

  // Middleware already rejects an unknown city so the status code is right;
  // this is the backstop for a direct render that bypassed it.
  const cityLocation = getLocationBySlug(city)
  if (!cityLocation || cityLocation.type !== 'CITY') notFound()

  return {
    query: parseSearchQuery({ intent, city, segments: rest ?? [], params, isKnownLocality }),
    cityName: cityLocation.name,
  }
}

export async function searchMetadata(intent: Intent, props: SearchRouteProps): Promise<Metadata> {
  const { query, cityName } = await resolve(intent, props)
  const names = getLocalityNameMap()
  const outcome = searchProperties(query)
  const what = describeSearch(query, cityName, names)

  return {
    title: `${what.charAt(0).toUpperCase()}${what.slice(1)}`,
    description: `Browse ${what} on ${BRAND.name}. Filter by locality, budget, configuration and more, then contact owners, agents and builders directly.`,
    // Page 2 onward is a slice of the same set, and every sort is a
    // reordering of it. Canonicalising to the first page of the base search
    // stops them competing with each other.
    alternates: { canonical: buildSearchUrl({ ...query, page: 1, sort: 'relevance' }) },
    // A paginated or re-sorted view has nothing new to index, but its links
    // are still worth following.
    robots:
      outcome.page > 1 || query.sort !== 'relevance' ? { index: false, follow: true } : undefined,
  }
}

export async function SearchPage({ intent, ...props }: { intent: Intent } & SearchRouteProps) {
  const { query, cityName } = await resolve(intent, props)
  const names = getLocalityNameMap()
  const outcome = searchProperties(query)

  const what = describeSearch(query, cityName, names)
  const heading = what.charAt(0).toUpperCase() + what.slice(1)
  const localityNames = Object.fromEntries(names)

  return (
    <PageShell footer={<Footer />}>
      <DevDataNotice />
      {/* The clamped page from the engine, not the requested one: asking for
          page 99 of a three-page set must not put 99 in the pagination. */}
      <SearchLayout
        query={{ ...query, page: outcome.page }}
        facets={outcome.facets}
        total={outcome.total}
        heading={heading}
        localityNames={localityNames}
      >
        {outcome.total === 0 ? (
          <ZeroResults
            query={query}
            relaxations={outcome.relaxations}
            nearbyLocalities={outcome.nearbyLocalities}
            totalUnfiltered={outcome.totalUnfiltered}
            localityNames={localityNames}
          />
        ) : (
          <>
            <ResultsList results={outcome.results} />
            <Pagination
              page={outcome.page}
              pageCount={outcome.pageCount}
              hrefForPage={(page) => buildSearchUrl({ ...query, page })}
            />
            <p className="mt-4 text-center text-caption text-ink-500">
              Showing {(outcome.page - 1) * outcome.perPage + 1}–
              {Math.min(outcome.page * outcome.perPage, outcome.total)} of{' '}
              <span className="tabular">{outcome.total.toLocaleString('en-IN')}</span> in {cityName}
            </p>
          </>
        )}
      </SearchLayout>
    </PageShell>
  )
}
