import type { ReactNode } from 'react'
import type { PreviewModel } from '@/lib/preview/model'
import { AreaHeading, PropertyLayout, Section } from '@/components/property/PropertyLayout'
import { PropertyOverview } from '@/components/property/PropertyOverview'
import { KeyDetails } from '@/components/property/KeyDetails'
import { AreaBreakdown } from '@/components/property/AreaBreakdown'
import { DescriptionBlock } from '@/components/property/DescriptionBlock'
import { LocationBlock } from '@/components/property/LocationBlock'
import { SellerBlock } from '@/components/property/SellerBlock'
import { PropertyDisclaimer } from '@/components/property/PropertyDisclaimer'
import { ContactCard, StickyContactBar } from '@/components/enquiry/ContactPanel'
import { amountOf, contactOfListing, isPublishable, overviewOfListing } from '@/lib/listings/overview'

/**
 * A real published listing (Phase 18) on the property page's layout and
 * components (UI-16) — the same frame, summary, facts, area panel,
 * description, location and contact card as the demo page, fed by the
 * listing adapters (lib/listings/overview.ts). Only sections the listing
 * can fill are rendered: no amenities or landmarks until posting collects
 * them.
 *
 * Three callers: a visitor (`contact`: the card, the phone bar and its
 * sheet), the listing's owner (`ownerPanel` instead of a form addressed to
 * themselves), and the submitted-copy view (neither). `listingId` with
 * `isPublic` makes the address copyable.
 */
export function PublishedProperty({ model, postedAt, listingId, isPublic = false, saveAction, ownerPanel, contact = false }: {
  model: PreviewModel
  postedAt?: string
  listingId?: string
  isPublic?: boolean
  saveAction?: ReactNode
  ownerPanel?: ReactNode
  /** Render the enquiry card, bar and sheet (needs listingId). */
  contact?: boolean
}) {
  if (!isPublishable(model)) return null
  const m = model, f = m.facts, p = m.pricing
  const info = contact && listingId ? contactOfListing(m, listingId, postedAt) : undefined
  const seller = { sellerType: m.entry.role!, sellerName: m.sellerName ?? undefined, postedAt }

  return (
    <PropertyLayout
      photos={m.media}
      title={m.title}
      saveAction={saveAction}
      overview={<PropertyOverview data={overviewOfListing(m, { postedAt, sharePath: isPublic && listingId ? `/listing/${listingId}` : undefined })} />}
      aside={info ? <ContactCard contact={info} headingId="contact-heading" /> : ownerPanel}
      asideLabelledBy={info ? 'contact-heading' : undefined}
      asideOnPhone={!info && Boolean(ownerPanel)}
      phoneContact={info ? { bar: <StickyContactBar contact={info} />, noScriptCard: <ContactCard contact={info} /> } : undefined}
    >
      <Section id="details" title="Property details">
        <KeyDetails property={{
          ...f,
          propertyType: m.entry.type!,
          availableFrom: typeof f.availableFrom === 'object' ? f.availableFrom.from : undefined,
          availableNow: f.availableFrom === 'now',
        }} />
        <AreaHeading />
        <div className="mt-3">
          <AreaBreakdown property={{ ...f, price: amountOf(m), intent: p.intent }} />
        </div>
      </Section>

      {m.description && (
        <Section id="description" title="About this property">
          <DescriptionBlock text={m.description} />
        </Section>
      )}

      {m.locality && m.city && (
        <Section id="location" title="Location">
          <LocationBlock
            society={m.location?.societyName}
            address={m.location?.address}
            locality={m.locality}
            city={m.city}
            addressNote="Seller-provided location. It has not been verified."
          />
        </Section>
      )}

      {/* The contact card carries the seller from 1024px; without one (the
          owner, the submitted copy) this section shows at every width. */}
      <Section id="seller" title="Listed by" className={info ? 'lg:hidden' : undefined}>
        <SellerBlock property={seller} />
      </Section>

      <div className="mt-10">
        <PropertyDisclaimer />
      </div>
    </PropertyLayout>
  )
}
