import Link from 'next/link'
import { SectionHeading } from './SectionHeading'
import { ArrowRightIcon, ChevronDownIcon, MapPinIcon } from '@/components/ui/icons'
import { localityExploreHref, type LocalityTile } from '@/lib/home/discovery'
import { LAUNCH_CITY } from '@/lib/brand'

/**
 * Neighbourhoods (UI-14): one card per popular locality, with what is
 * actually listed there for sale and to rent — inventory counts, never
 * demand or "most searched" figures. Each count is its own link; a place
 * with nothing listed links to its results, which suggest nearby places.
 * Every locality in the city stays one disclosure away.
 */
export function PopularLocalities({ popular, all }: { popular: LocalityTile[]; all: Array<{ name: string; href: string }> }) {
  const shown = popular.slice(0, 8)
  return (
    <section id="localities" aria-labelledby="popular-localities" className="home-band home-anchor">
      <div className="home-container">
        <SectionHeading
          id="popular-localities"
          eyebrow="Explore the city"
          title={`Neighbourhoods in ${LAUNCH_CITY.name}`}
          description="See what is listed in each neighbourhood, from New Town's action areas to the lanes of Ballygunge."
        />

        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:mt-8 lg:grid-cols-4 lg:gap-4" aria-label={`Popular localities in ${LAUNCH_CITY.name}`}>
          {shown.map((l, index) => (
            <li key={l.slug} className="home-card relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-000 shadow-e1">
              {/* A map tile: a road over a dot grid, in one of four tints. */}
              <div className={`home-map home-map-${index % 4}`} aria-hidden>
                <span className="absolute -bottom-5 left-4 grid size-10 place-items-center rounded-full bg-surface-000 text-brand-700 shadow-e2"><MapPinIcon className="size-5" /></span>
                <span className="absolute right-3 top-2 tabular text-caption text-ink-700">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="mt-7 truncate px-4 font-display text-heading-3 text-ink-900 lg:px-5">{l.name}</h3>
              <p className="ml-2 mt-1 flex flex-wrap items-center pb-2 lg:ml-3">
                {l.forSale && (
                  <Link href={l.forSale.href} className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-body-sm text-ink-700 hover:bg-brand-50 hover:text-brand-700 lg:text-body">
                    <span className="tabular font-semibold text-ink-900">{l.forSale.count}</span> for sale<span className="sr-only"> in {l.name}</span>
                  </Link>
                )}
                {l.toRent && (
                  <Link href={l.toRent.href} className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-body-sm text-ink-700 hover:bg-brand-50 hover:text-brand-700 lg:text-body">
                    <span className="tabular font-semibold text-ink-900">{l.toRent.count}</span> to rent<span className="sr-only"> in {l.name}</span>
                  </Link>
                )}
                {!l.forSale && !l.toRent && (
                  <Link href={localityExploreHref(l.slug)} className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-body-sm font-semibold text-brand-700 hover:bg-brand-50">
                    Explore<span className="sr-only"> {l.name}</span><ArrowRightIcon className="size-4" />
                  </Link>
                )}
              </p>
            </li>
          ))}
        </ul>

        <details className="group/all mt-6 rounded-lg border border-border-subtle bg-surface-000">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 text-label text-ink-900 [&::-webkit-details-marker]:hidden">
            <span>All {all.length} localities in {LAUNCH_CITY.name}</span>
            <ChevronDownIcon className="size-4 shrink-0 transition-transform group-open/all:rotate-180" />
          </summary>
          <ul className="grid grid-cols-2 gap-x-4 border-t border-border-subtle px-5 py-2 sm:grid-cols-3 lg:grid-cols-5">
            {all.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="flex min-h-11 items-center text-body-sm text-ink-700 hover:text-brand-700 hover:underline">{l.name}</Link>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  )
}
