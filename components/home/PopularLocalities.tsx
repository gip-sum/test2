import Link from 'next/link'
import { getPopularLocalities } from '@/lib/location/queries'
import { getListingCountsByLocality } from '@/lib/property/queries'
import { LAUNCH_CITY } from '@/lib/brand'

/**
 * One-tap entry into the most-searched parts of the city.
 *
 * Counts come from real inventory — never invented. With seeded data they
 * are small, which is honest: that is what a marketplace looks like before
 * sellers arrive. A locality with nothing in it shows no count rather than
 * a zero, because "0" reads as broken where blank reads as new.
 */
export function PopularLocalities({ intent = 'buy' }: { intent?: 'buy' | 'rent' }) {
  const localities = getPopularLocalities()
  const counts = getListingCountsByLocality(intent)

  return (
    <section aria-labelledby="popular-localities">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-overline uppercase tracking-[0.14em] text-brand-600">Explore the city</p>
          <h2 id="popular-localities" className="mt-1 font-display text-heading-2 text-ink-900">
            Where in {LAUNCH_CITY.name} feels like home?
          </h2>
          <p className="mt-2 max-w-xl text-body-sm text-ink-500">
            A different rhythm in every neighbourhood. Find the one that feels like you.
          </p>
        </div>
        <Link
          href={`/in/${LAUNCH_CITY.slug}`}
          className="inline-flex min-h-11 items-center rounded-md text-label text-brand-600 hover:underline"
        >
          All localities
        </Link>
      </div>

      <ul className="locality-grid mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {localities.slice(0, 8).map((l, index) => {
          const count = counts.get(l.slug)
          return (
            <li key={l.slug}>
              <Link
                href={`/${intent}/${LAUNCH_CITY.slug}/${l.slug}`}
                className="home-locality-card group"
              >
                <div className={`locality-art locality-art-${index % 4}`} aria-hidden="true">
                  <span className="locality-index">{String(index + 1).padStart(2, '0')}</span>
                  <svg viewBox="0 0 240 100" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M0 93H240M22 93V45H55V93M27 45V37H49V45M64 93V22H105V93M70 32H99M70 43H99M70 54H99M70 65H99M70 76H99M117 93V51L144 30L171 51V93M125 59H162M135 93V73H151V93M184 93V36H219V93M190 45H213M190 56H213M190 67H213M190 78H213" />
                    <circle cx="190" cy="18" r="10" /><path d="M0 93Q24 69 39 93M208 93Q230 63 240 93" />
                  </svg>
                </div>
                <div className="locality-info">
                  <span className="min-w-0">
                    <span className="block text-body font-semibold">{l.name}</span>
                    <span className="mt-1 block text-caption text-ink-500">{count ? `${count} ${count === 1 ? 'listing' : 'listings'}` : 'Explore locality'}</span>
                  </span>
                  <span className="locality-arrow" aria-hidden>↗</span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
