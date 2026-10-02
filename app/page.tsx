import type { Metadata } from 'next'
import { PageShell } from '@/components/layout/PageShell'
import { Footer } from '@/components/navigation/Footer'
import { HomeHero, HomeSearch } from '@/components/home/HomeHero'
import { DiscoveryBands } from '@/components/home/DiscoveryBands'
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

/** Mobile reference layout, backed by the existing discovery/query seams.
 * Unsupported project recommendations and demand statistics stay deferred.
 */
export default function HomePage() {
  const rail = Object.fromEntries(getHomeCollections().map((c) => [c.id, c])) as Record<CollectionId, ReturnType<typeof getHomeCollections>[number]>
  const localities = getLocalityDiscovery()
  return (
    <PageShell footer={<Footer />}>
      <QuickRoutes />
      <HomeHero />
      <HomeSearch />
      <div className="home-content reference-home mx-auto max-w-[1320px] px-5 lg:px-8">
        <DevDataNotice />
        <ListingRail
          collection={rail['new-sale']}
          eyebrow={`New for sale in ${LAUNCH_CITY.name}`}
          title="Latest homes for sale"
          description="Explore the latest listings in Kolkata"
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
        <DiscoveryBands />
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
