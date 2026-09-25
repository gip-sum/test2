import type { Metadata } from 'next'
import { PageShell } from '@/components/layout/PageShell'
import { Footer } from '@/components/navigation/Footer'
import { SearchPanel } from '@/components/search/SearchPanel'
import { DevDataNotice } from '@/components/home/DevDataNotice'
import { QuickRoutes } from '@/components/home/QuickRoutes'
import { ListingRail } from '@/components/home/ListingRail'
import { PopularLocalities } from '@/components/home/PopularLocalities'
import { BrowseTiles } from '@/components/home/BrowseTiles'
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
 * A router, not a storefront: its first job is to turn an ambiguous
 * visitor into a typed intent plus a place. On a phone the first screen
 * therefore holds Buy/Rent, the locality search and the Search action, with
 * the rest of the filters one tap away — and listings begin right after,
 * because proof of inventory is the second thing people look for.
 *
 * Order after the search is by how directly each block leads back into a
 * search: quick routes, homes for sale, places, homes to rent, then browse
 * by type, budget and size, and finally the owner invitation.
 *
 * Only blocks backed by real data and working routes appear. Projects, RERA
 * details, demand statistics, price trends and offers — common on larger
 * portals — wait for the phases that make them real, and a placeholder
 * would claim what we cannot show. The register of which section waits on
 * which phase is "Homepage sections waiting on their phase" in
 * docs/ROADMAP.md.
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
        <QuickRoutes />
        <DevDataNotice />
        <ListingRail
          intent="buy"
          eyebrow={`New for sale in ${LAUNCH_CITY.name}`}
          title="Homes worth a closer look"
          description="Explore the latest additions, then save the ones that feel right."
        />
        <PopularLocalities />
        <ListingRail
          intent="rent"
          eyebrow={`New to rent in ${LAUNCH_CITY.name}`}
          title="Rentals worth a closer look"
          description="The newest homes to rent, from studios to family flats."
        />
        <BrowseTiles />
        <SupplyCta />
        <HowItWorks />
      </div>
    </PageShell>
  )
}
