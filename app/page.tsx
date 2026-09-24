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
 * place. The photographic hero introduces the city and the elevated search
 * panel keeps the discovery controls together on desktop and mobile.
 *
 * Everything after the search is secondary discovery, ordered by how
 * directly it leads back into a search: localities, then live inventory,
 * then browse entry points and the supply CTA.
 */
export default function HomePage() {
  return (
    <PageShell footer={<Footer />}>
      <DevDataNotice />

      {/* Search block — the dominant interaction. */}
      <section className="home-hero border-b border-border-subtle">
        <div className="relative mx-auto max-w-[1320px] px-4 pb-8 pt-12 sm:pt-16 lg:px-8 lg:pb-0 lg:pt-20">
          {/* Echoes the brand line in lib/brand.ts, with the city that
              makes it a searchable heading rather than a slogan. Page copy,
              so it lives here and not in the brand config. */}
          <p className="mb-5 inline-flex rounded-full border border-white/20 bg-black/15 px-4 py-2 text-overline uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
            A better tomorrow at home
          </p>
          <h1 className="max-w-3xl font-display text-[38px] font-bold leading-[1.06] tracking-[-0.045em] text-white sm:text-[50px] lg:text-[66px]">
            Find your place.<br />
            <span className="text-[#d6f5df]">Feel at home in {LAUNCH_CITY.name}.</span>
          </h1>
          <p className="mt-5 max-w-xl text-body-lg text-white/80">
            Flats, houses and builder floors for sale and rent across {LAUNCH_CITY.name}. Search
            several localities at once.
          </p>

          <div className="mt-9 lg:mb-[-72px] lg:mt-12">
            <SearchPanel />
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1320px] flex-col gap-12 px-4 py-10 sm:py-12 lg:gap-16 lg:px-8 lg:pb-16 lg:pt-28">
        <PopularLocalities />
        <RecentListings />
        <BrowseTiles />
        <SupplyCta />
        <HowItWorks />
      </div>

    </PageShell>
  )
}
