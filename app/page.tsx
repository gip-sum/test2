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
 * place. The green hero introduces the city and the glass search panel
 * keeps the discovery controls together on desktop and mobile.
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
      <section className="home-hero border-b border-border-subtle">
        <div className="relative mx-auto max-w-[1320px] px-4 pb-8 pt-8 lg:px-8 lg:pb-12 lg:pt-14">
          {/* Echoes the brand line in lib/brand.ts, with the city that
              makes it a searchable heading rather than a slogan. Page copy,
              so it lives here and not in the brand config. */}
          <p className="mb-5 inline-flex rounded-full border border-brand-600/20 bg-surface-000/80 px-4 py-2 text-overline uppercase tracking-[0.16em] text-brand-700">A better tomorrow at home</p>
          <h1 className="max-w-3xl font-display text-[36px] leading-[1.1] font-bold tracking-[-0.04em] text-ink-900 sm:text-[48px] lg:text-[64px]">
            Find your place.<br /><span className="text-brand-600">Feel at home in {LAUNCH_CITY.name}.</span>
          </h1>
          <p className="mt-5 max-w-xl text-body-lg text-ink-700">
            Flats, houses and builder floors for sale and rent across {LAUNCH_CITY.name}. Search
            several localities at once.
          </p>

          <div className="mt-7 lg:mt-9">
            <SearchPanel />
          </div>
          <p className="mt-5 text-body-sm text-brand-700">Your neighbourhood. Your budget. Your next chapter.</p>
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
