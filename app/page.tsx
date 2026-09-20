import type { Metadata } from 'next'
import { PageShell } from '@/components/layout/PageShell'
import { Footer } from '@/components/navigation/Footer'
import { SearchPanel } from '@/components/search/SearchPanel'
import { DevDataNotice } from '@/components/home/DevDataNotice'
import { PopularLocalities } from '@/components/home/PopularLocalities'
import { BrowseTiles } from '@/components/home/BrowseTiles'
import { RecentListings } from '@/components/home/RecentListings'
import { SupplyCta } from '@/components/home/SupplyCta'
import { HowItWorks } from '@/components/home/HowItWorks'
import { LAUNCH_CITY } from '@/lib/brand'

/**
 * Recent inventory and relative dates go stale in a static build, so the
 * page regenerates hourly. Phase 3 revisits this once listings are live.
 */
export const revalidate = 3600

export const metadata: Metadata = {
  title: `Property in ${LAUNCH_CITY.name} — buy and rent flats, houses and more`,
  description: `Search flats, houses and other property for sale and rent across ${LAUNCH_CITY.name}. Filter by locality, budget and configuration, and contact owners, agents and builders directly.`,
}

/**
 * Homepage.
 *
 * Its only job is to turn an ambiguous visitor into a typed intent plus a
 * place. So the search panel sits immediately below a single line of
 * orientation — there is no decorative hero, and nothing competes with it
 * above the fold.
 *
 * Everything after the search is secondary discovery, ordered by how
 * directly it leads back into a search: localities, then browse entry
 * points, then live inventory, then the supply CTA.
 */
export default function HomePage() {
  return (
    <PageShell footer={<Footer />}>
      <DevDataNotice />

      {/* Search block — the dominant interaction. */}
      <section className="border-b border-border-subtle bg-surface-000/60">
        <div className="mx-auto max-w-[1320px] px-4 pb-6 pt-5 lg:px-8 lg:pb-8 lg:pt-7">
          {/* Echoes the brand line in lib/brand.ts, with the city that
              makes it a searchable heading rather than a slogan. Page copy,
              so it lives here and not in the brand config. */}
          <h1 className="font-display text-heading-1 text-ink-900 lg:text-display-1">
            Find your place in {LAUNCH_CITY.name}
          </h1>
          <p className="mt-1.5 max-w-2xl text-body text-ink-700">
            Flats, houses and builder floors for sale and rent across {LAUNCH_CITY.name}. Search
            several localities at once.
          </p>

          <div className="mt-4 lg:mt-5">
            <SearchPanel />
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1320px] flex-col gap-10 px-4 py-8 lg:gap-12 lg:px-8 lg:py-10">
        <PopularLocalities />
        <RecentListings />
        <BrowseTiles />
        <SupplyCta />
        <HowItWorks />
      </div>

    </PageShell>
  )
}
