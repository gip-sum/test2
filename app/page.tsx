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
      <div className="home-stage">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="hero-copy">
            <p className="hero-eyebrow"><span aria-hidden /> YOUR NEXT CHAPTER, IN KOLKATA</p>
            <h1 id="home-title">A place to live.<br /><em>A place to belong.</em></h1>
            <p className="hero-description">From your first apartment to your forever home.<br className="hidden sm:block" /> Discover a little more possibility in {LAUNCH_CITY.name}.</p>
            <div className="hero-city-note"><span aria-hidden>↗</span> Rooted in Kolkata. Made for your next move.</div>
          </div>
          <div className="hero-caption" aria-hidden="true"><span>THE CITY OF NEW BEGINNINGS</span><strong>Kolkata, West Bengal</strong></div>
          <div className="hero-search"><SearchPanel /></div>
        </section>
      </div>
      <div className="home-content mx-auto max-w-[1320px] px-4 lg:px-8">
        <div className="discovery-promises" aria-label="Explore with confidence">
          <p><span aria-hidden>01</span> Your budget. Your neighbourhood.</p>
          <p><span aria-hidden>02</span> Buy a home or find your next rental.</p>
          <p><span aria-hidden>03</span> Save favourites. Compare at your pace.</p>
        </div>
        <DevDataNotice />
        <PopularLocalities />
        <RecentListings />
        <BrowseTiles />
        <SupplyCta />
        <HowItWorks />
      </div>

    </PageShell>
  )
}
