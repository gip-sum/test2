import type { Metadata } from 'next'
import { PageShell } from '@/components/layout/PageShell'
import { Footer } from '@/components/navigation/Footer'
import { SearchPanel } from '@/components/search/SearchPanel'
import { DevDataNotice } from '@/components/home/DevDataNotice'
import { QuickRoutes } from '@/components/home/QuickRoutes'
import { ListingRail } from '@/components/home/ListingRail'
import { PopularLocalities } from '@/components/home/PopularLocalities'
import { BudgetAndSize, PropertyTypes } from '@/components/home/BrowseTiles'
import { PlanTiles } from '@/components/home/PlanTiles'
import { SupplyCta } from '@/components/home/SupplyCta'
import { WhyGharBazaar } from '@/components/home/WhyGharBazaar'
import { LAUNCH_CITY } from '@/lib/brand'
import {
  getBudgetDiscovery, getHomeCollections, getLocalityDiscovery, getSizeDiscovery, getTypeDiscovery, type CollectionId,
} from '@/lib/home/discovery'

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
 * Below the search it is a discovery hierarchy (Phase B,
 * docs/phases/PHASE-B-homepage-discovery.md): quick routes; collections of
 * live listings — newest for sale, newest to rent, price reduced; places;
 * kinds of home; budgets and sizes; homes still being built; the
 * calculators; why this marketplace; and the owner invitation. Every count
 * on the page comes from the search seam and equals the results page it
 * links to, and a collection, type, band or size with nothing in it is
 * left out rather than shown empty.
 *
 * Only blocks backed by real data and working routes appear. Project pages,
 * RERA details, guides, demand statistics, price trends and offers —
 * common on larger portals — wait for the phases that make them real, and
 * a placeholder would claim what we cannot show. The register of which
 * section waits on which phase is "Homepage sections waiting on their
 * phase" in docs/ROADMAP.md.
 */
export default function HomePage() {
  const rail = Object.fromEntries(getHomeCollections().map((c) => [c.id, c])) as Record<CollectionId, ReturnType<typeof getHomeCollections>[number]>
  const localities = getLocalityDiscovery()
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
          collection={rail['new-sale']}
          eyebrow={`New for sale in ${LAUNCH_CITY.name}`}
          title="Homes worth a closer look"
          description="Explore the latest additions, then save the ones that feel right."
          noun="for sale"
          invite
          priority
        />
        <ListingRail
          collection={rail['new-rent']}
          eyebrow={`New to rent in ${LAUNCH_CITY.name}`}
          title="Rentals worth a closer look"
          description="The newest homes to rent, from studios to family flats."
          noun="to rent"
          invite
        />
        <ListingRail
          collection={rail.reduced}
          eyebrow="Price reduced"
          title="Now asking less"
          description="Homes for sale whose sellers have lowered the price."
          noun="with a reduced price"
        />
        <PopularLocalities {...localities} />
        <PropertyTypes tiles={getTypeDiscovery()} />
        <BudgetAndSize budget={getBudgetDiscovery()} size={getSizeDiscovery()} />
        <ListingRail
          collection={rail['under-construction']}
          eyebrow="Under construction"
          title="Homes still being built"
          description="For sale in developments that are not finished yet. Ask the seller when possession is expected."
          noun="under construction"
        />
        <PlanTiles />
        <WhyGharBazaar />
        <SupplyCta />
      </div>
    </PageShell>
  )
}
