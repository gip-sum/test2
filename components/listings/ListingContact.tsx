'use client'

import { useState } from 'react'
import { EnquiryForm } from '@/components/enquiry/EnquiryForm'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'

/**
 * Contact for a real (Phase 18) listing, in the same two shapes as the
 * demo property page: a card in the desktop sidebar and, on a phone, a
 * fixed bar that opens the form in a sheet, so the action is reachable at
 * every scroll position. Both render the one EnquiryForm, which posts the
 * listing id only — the seller is decided by the database.
 */
type Props = { listingId: string; sellerLabel: string; title: string; place: string; amount: number; intent: 'buy' | 'rent' }

export function ListingContactCard(props: Props) {
  return <div className="rounded-lg border border-border-subtle bg-surface-000 p-4 shadow-e1">
    <Headline {...props} />
    <div className="mt-4"><EnquiryForm listingId={props.listingId} sellerLabel={props.sellerLabel} /></div>
  </div>
}

export function ListingContactBar(props: Props) {
  const [open, setOpen] = useState(false)
  const contact = `Contact ${props.sellerLabel.toLowerCase()}`
  return <>
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle bg-surface-000 shadow-e3 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-2.5">
        <div className="min-w-0 flex-1"><PriceDisplay amount={props.amount} intent={props.intent} /></div>
        <Button variant="primary" size="lg" onClick={() => setOpen(true)} aria-haspopup="dialog">{contact}</Button>
      </div>
    </div>
    <Sheet open={open} onOpenChange={setOpen} title={contact} description="Send your name and number to whoever posted this listing">
      <div className="px-4 py-4">
        <Headline {...props} />
        <div className="mt-4"><EnquiryForm listingId={props.listingId} sellerLabel={props.sellerLabel} /></div>
      </div>
    </Sheet>
  </>
}

function Headline({ title, place, amount, intent }: Props) {
  return <div>
    <PriceDisplay amount={amount} intent={intent} size="detail" />
    <p className="mt-1 break-words text-body-sm text-ink-700">{title}</p>
    <p className="break-words text-body-sm text-ink-500">{place}</p>
  </div>
}
