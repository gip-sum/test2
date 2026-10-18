import type { Metadata } from 'next'
import { PageShell } from '@/components/layout/PageShell'
import { Footer } from '@/components/navigation/Footer'
import { HomeHero, type HeroLink } from '@/components/home/HomeHero'
import { DevDataNotice } from '@/components/home/DevDataNotice'
import { QuickRoutes } from '@/components/home/QuickRoutes'
import { ListingRail } from '@/components/home/ListingRail'
import { PopularLocalities } from '@/components/home/PopularLocalities'
import { BrowseYourWay, PropertyTypes } from '@/components/home/BrowseTiles'
import { PlanTiles } from '@/components/home/PlanTiles'
import { SupplyCta } from '@/components/home/SupplyCta'
import { WhyGharBazaar } from '@/components/home/WhyGharBazaar'
import { LAUNCH_CITY } from '@/lib/brand'
import {
  getBudgetDiscovery, getHomeCollections, getLocalityDiscovery, getPossessionDiscovery, getSellerDiscovery,
  getSizeDiscovery, getTypeDiscovery, type CollectionId,
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
 * The homepage (UI-14 visual redesign), backed by the existing discovery
 * and query seams. Bands alternate white, mint and paper so the page has a
 * rhythm instead of one long white column; every figure on it is a count
 * of what is listed. Unsupported project recommendations and demand
 * statistics stay deferred.
 */
export default function HomePage() {
  const rail = Object.fromEntries(getHomeCollections().map((c) => [c.id, c])) as Record<CollectionId, ReturnType<typeof getHomeCollections>[number]>
  const localities = getLocalityDiscovery()
  const heroLinks: HeroLink[] = [
    { label: 'Homes for sale', count: rail['new-sale'].total, href: rail['new-sale'].href, context: `in ${LAUNCH_CITY.name}` },
    { label: 'Homes to rent', count: rail['new-rent'].total, href: rail['new-rent'].href, context: `in ${LAUNCH_CITY.name}` },
    ...localities.popular.filter((l) => l.forSale).slice(0, 4).map((l) => ({ label: l.name, count: l.forSale!.count, href: l.forSale!.href, context: 'homes for sale' })),
  ].filter((l) => l.count > 0)

  return (
    <PageShell footer={<Footer />}>
      <HomeHero links={heroLinks} />
      <QuickRoutes />
      <div className="home-container pt-6 lg:pt-8">
        <DevDataNotice />
      </div>
      <ListingRail
        collection={rail['new-sale']}
        eyebrow={`New for sale in ${LAUNCH_CITY.name}`}
        title="Latest homes for sale"
        description={`The newest listings across ${LAUNCH_CITY.name}, from studios to family houses.`}
        noun="for sale"
        invite
        priority
      />
      <PopularLocalities {...localities} />
      <ListingRail
        collection={rail['new-rent']}
        eyebrow={`New to rent in ${LAUNCH_CITY.name}`}
        title="Rentals worth a closer look"
        description="The newest homes to rent, from studios to family flats."
        noun="to rent"
        invite
      />
      <PropertyTypes tiles={getTypeDiscovery()} />
      <ListingRail
        collection={rail.reduced}
        eyebrow="Price reduced"
        title="Now asking less"
        description="Homes for sale whose sellers have lowered the price."
        noun="with a reduced price"
      />
      <BrowseYourWay
        budget={getBudgetDiscovery()}
        size={getSizeDiscovery()}
        sellers={getSellerDiscovery()}
        possession={getPossessionDiscovery()}
      />
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
    </PageShell>
  )
}
