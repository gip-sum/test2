'use client'

import { useState } from 'react'
import { EnquiryForm } from './EnquiryForm'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { SellerIdentity, SellerNote } from '@/components/property/SellerBlock'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { SELLER_LABEL, type PropertyDetail } from '@/lib/property/types'
import { cn } from '@/lib/cn'

/**
 * The conversion surface, in its two shapes.
 *
 * §5 requires a contact action reachable at EVERY scroll position. On a
 * phone that means a fixed bar; on desktop it means a sticky card in the
 * right column. Both render the same form from the same module, so the two
 * paths cannot drift.
 *
 * The card (UI-16) leads with who you are writing to — the seller's name
 * and self-declared category, nothing the platform has not got: no rating,
 * response time or verification mark — then the price as a reminder while
 * the page scrolls under it, then the form.
 *
 * The bottom navigation hides itself on this route (see BottomNav) so the
 * bar has the strip to itself. Stacking a five-item nav under a primary
 * call to action on a 390px screen leaves neither usable.
 *
 * The CTA uses the BUYER accent, never the seller's orange. Orange on this
 * page would read as "post a property", which is the opposite of what the
 * button does.
 */
export function ContactCard({ property, headingId }: { property: PropertyDetail; headingId?: string }) {
  const seller = SELLER_LABEL[property.sellerType].toLowerCase()
  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-000 shadow-e2">
      <div className="border-b border-border-subtle bg-brand-50 px-5 py-4">
        <SellerIdentity property={property} />
      </div>
      <div className="px-5 pb-5 pt-4">
        <h2 id={headingId} className="font-display text-heading-3 text-ink-900">Contact the {seller}</h2>
        <PriceLine property={property} className="mt-3" />
        <div className="mt-4">
          <EnquiryForm
            listingPublicId={property.publicId}
            sellerLabel={SELLER_LABEL[property.sellerType]}
          />
        </div>
        <SellerNote className="mt-4 border-t border-border-subtle pt-3" />
      </div>
    </div>
  )
}

export function StickyContactBar({ property }: { property: PropertyDetail }) {
  const [open, setOpen] = useState(false)
  const seller = SELLER_LABEL[property.sellerType].toLowerCase()

  return (
    <>
      {/* One bar, below 1024px only, with the price and one action. It sits
          where the bottom navigation would, which this route hides, and the
          page reserves its height so it never covers the last content. */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle bg-surface-000 shadow-e3 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5 sm:px-6">
          <div className="min-w-0 flex-1">
            <PriceDisplay
              amount={property.price}
              intent={property.intent}
              areaForRate={property.intent === 'buy' ? property.carpetArea : undefined}
            />
          </div>
          <Button variant="primary" size="lg" className="rounded-full px-5" onClick={() => setOpen(true)} aria-haspopup="dialog">
            Contact {seller}
          </Button>
        </div>
      </div>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={`Contact ${seller}`}
        description="Send your name and number to whoever posted this listing"
      >
        <div className="px-4 py-4">
          <div className="rounded-lg bg-brand-50 p-4">
            <SellerIdentity property={property} />
          </div>
          <PriceLine property={property} className="mt-4" />
          <div className="mt-4">
            <EnquiryForm
              listingPublicId={property.publicId}
              sellerLabel={SELLER_LABEL[property.sellerType]}
            />
          </div>
        </div>
      </Sheet>
    </>
  )
}

/**
 * Which listing the enquiry is about, beside its price — the reminder that
 * stays in view while the page scrolls under the card.
 */
function PriceLine({ property, className }: { property: PropertyDetail; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 rounded-md bg-surface-200 px-3 py-2.5', className)}>
      <p className="min-w-0 text-body-sm text-ink-700">
        <span className="line-clamp-2 font-semibold text-ink-900">{property.society ?? property.title}</span>
        {property.localityName}, {property.cityName}
      </p>
      <PriceDisplay amount={property.price} intent={property.intent} className="shrink-0 text-right" />
    </div>
  )
}
