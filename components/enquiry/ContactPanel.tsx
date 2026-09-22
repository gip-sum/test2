'use client'

import { useState } from 'react'
import { EnquiryForm } from './EnquiryForm'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { SELLER_LABEL, type PropertyDetail } from '@/lib/property/types'

/**
 * The conversion surface, in its two shapes.
 *
 * §5 requires a contact action reachable at EVERY scroll position. On a
 * phone that means a fixed bar; on desktop it means a sticky card in the
 * right column. Both render the same form from the same module, so the two
 * paths cannot drift.
 *
 * The bottom navigation hides itself on this route (see BottomNav) so the
 * bar has the strip to itself. Stacking a five-item nav under a primary
 * call to action on a 390px screen leaves neither usable.
 *
 * The CTA uses the BUYER accent, never the seller's orange. Orange on this
 * page would read as "post a property", which is the opposite of what the
 * button does.
 */
export function ContactCard({ property }: { property: PropertyDetail }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-000 p-4 shadow-e1">
      <PriceHeadline property={property} />
      <div className="mt-4">
        <EnquiryForm
          listingPublicId={property.publicId}
          sellerLabel={SELLER_LABEL[property.sellerType]}
        />
      </div>
    </div>
  )
}

export function StickyContactBar({ property }: { property: PropertyDetail }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle bg-surface-000 shadow-e3 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <PriceDisplay
              amount={property.price}
              intent={property.intent}
              areaForRate={property.intent === 'buy' ? property.carpetArea : undefined}
            />
          </div>
          <Button variant="primary" size="lg" onClick={() => setOpen(true)} aria-haspopup="dialog">
            Contact {SELLER_LABEL[property.sellerType].toLowerCase()}
          </Button>
        </div>
      </div>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={`Contact ${SELLER_LABEL[property.sellerType].toLowerCase()}`}
        description="Send your name and number to whoever posted this listing"
      >
        <div className="px-4 py-4">
          <PriceHeadline property={property} />
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

function PriceHeadline({ property }: { property: PropertyDetail }) {
  return (
    <div>
      <PriceDisplay
        amount={property.price}
        intent={property.intent}
        size="detail"
        areaForRate={property.intent === 'buy' ? property.carpetArea : undefined}
      />
      <p className="mt-1 text-body-sm text-ink-700">
        {property.society ?? property.title}
      </p>
      <p className="text-body-sm text-ink-500">
        {property.localityName}, {property.cityName}
      </p>
    </div>
  )
}
