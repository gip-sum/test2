import Link from 'next/link'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { BuildingIcon } from '@/components/ui/icons'
import type { PropertyCard as Card } from '@/lib/dashboard/model'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { WithdrawAction } from './WithdrawAction'
import { CopyLink } from './CopyLink'
import { buttonClassName } from '@/components/ui/Button'

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' })
const moment = (iso: string) => `${new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST`

const SINCE_LABEL: Record<Card['status'], string> = {
  DRAFT: 'Last saved', UNDER_REVIEW: 'Submitted', ACTIVE: 'Live since', EXPIRED: 'Expired',
  REJECTED: 'Rejected', CHANGES_REQUESTED: 'Corrections requested', WITHDRAWN: 'Withdrawn', REMOVED: 'Removed',
}

const action = 'inline-flex min-h-11 items-center text-label font-semibold text-brand-700 underline-offset-4 hover:underline'
const primaryAction = buttonClassName({ variant: 'outline', className: 'px-3' })

/** One property row: its working draft and, once submitted, its listing. */
export function PropertyCard({ card, publishing }: { card: Card; publishing: boolean }) {
  const { draftId, listing, status, title } = card
  const base = `/post/drafts/${draftId}`
  const named = (label: string) => <>{label}<span className="sr-only"> {title}</span></>
  const headingId = `property-${draftId}`
  return <article aria-labelledby={headingId} className="min-w-0 border-b border-border-subtle bg-surface-000 p-4 last:border-b-0">
    <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-4">
      <div className="flex min-w-0 gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-100 text-brand-700"><BuildingIcon className="size-6" /></span>
        <div className="min-w-0">
          {/* Focusable from script only: where focus returns after an action
              on this card refreshes the page (WithdrawAction, UI-09). */}
          <h3 id={headingId} tabIndex={-1} className="break-words text-body font-semibold text-ink-900">{title}</h3>
          {card.place && <p className="mt-0.5 break-words text-caption text-ink-700">{card.place}</p>}
          {card.intent && <p className="mt-0.5 text-caption text-ink-500">{card.intent === 'buy' ? 'For sale' : 'For rent'}</p>}
        </div>
      </div>
      <div className="min-w-0">
        <span className="text-caption text-ink-500 lg:hidden">Price </span>
        {card.price !== null && card.intent ? <PriceDisplay amount={card.price} intent={card.intent} className="[&_p:first-child]:text-body [&_p:first-child]:font-semibold" /> : <p className="text-body-sm text-ink-500">Not available</p>}
      </div>
      <div className="flex flex-wrap items-start gap-2 lg:flex-col">
        <StatusBadge status={status} />
        {card.expiringSoon && card.daysLeft !== null && <span className="text-caption font-semibold text-warn-600">{card.daysLeft <= 1 ? 'Expires within a day' : `Expires in ${card.daysLeft} days`}</span>}
      </div>
      <div className="min-w-0 text-caption text-ink-700">
        <p>{SINCE_LABEL[status]} <time dateTime={card.since}>{day(card.since)}</time></p>
        {status === 'ACTIVE' && card.expiresAt && <p className="mt-0.5">Expires <time dateTime={card.expiresAt}>{moment(card.expiresAt)}</time></p>}
        {listing && card.enquiries !== null && <div>
          {card.enquiries === 'unavailable'
            ? <><span className="text-ink-700">Enquiry counts are unavailable right now. </span><Link href="/dashboard/enquiries" className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4">Open inbox</Link></>
            : card.enquiries.total === 0
              ? <span className="text-ink-700">No enquiries yet</span>
              : <Link href={`/dashboard/enquiries?listing=${listing.id}`} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4">
                {card.enquiries.total} {card.enquiries.total === 1 ? 'enquiry' : 'enquiries'}{card.enquiries.newCount > 0 ? ` · ${card.enquiries.newCount} new` : ''}<span className="sr-only"> for {title}</span>
              </Link>}
        </div>}
      </div>
    </div>
    {card.rejectionReason && <p className="mt-3 break-words rounded-md bg-danger-100 px-3 py-2 text-body-sm text-ink-900"><strong>Reason: </strong>{card.rejectionReason}</p>}
    {card.progress && <p className="mt-2 text-caption text-ink-700">Property information: {card.progress.complete} of {card.progress.total} sections complete. Photos and your display name are checked in the preview.</p>}
    {card.detailsUnavailable && <p className="mt-2 text-body-sm text-ink-700">The submitted details could not be loaded. Showing your working draft’s title.</p>}
    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
      {status === 'DRAFT' && <>
        <Link href={base} className={primaryAction}>{named('Continue editing')}</Link>
        <Link href={`${base}/preview`} className={action}>{named('Preview')}</Link>
        <Link href={`${base}/lifecycle`} className={action}>{named('Publishing status')}</Link>
      </>}
      {status === 'UNDER_REVIEW' && <>
        <Link href={`${base}/submitted`} className={primaryAction}>{named('View submitted copy')}</Link>
        <Link href={`${base}/lifecycle`} className={action}>{named('Publishing status')}</Link>
      </>}
      {status === 'ACTIVE' && listing && <>
        <Link href={`/listing/${listing.id}`} className={primaryAction}>{named('View public page')}</Link>
        <CopyLink path={`/listing/${listing.id}`} title={title} />
        <Link href={`${base}/lifecycle`} className={action}>{named('Publishing status')}</Link>
      </>}
      {status === 'EXPIRED' && <>
        <Link href={`${base}/lifecycle`} className={primaryAction}>{named('Review & re-submit')}</Link>
        <Link href={`${base}/submitted`} className={action}>{named('View submitted copy')}</Link>
      </>}
      {(status === 'REJECTED' || status === 'CHANGES_REQUESTED') && <>
        <Link href={base} className={primaryAction}>{named('Edit draft')}</Link>
        <Link href={`${base}/lifecycle`} className={action}>{named('Review & re-submit')}</Link>
      </>}
      {status === 'WITHDRAWN' && <>
        <Link href={base} className={primaryAction}>{named('Edit draft')}</Link>
        <Link href={`${base}/lifecycle`} className={action}>{named('Re-submit')}</Link>
        <Link href={`${base}/lifecycle#remove-listing`} className={action}>{named('Remove listing…')}</Link>
      </>}
      {status === 'REMOVED' && <Link href={`${base}/lifecycle`} className={primaryAction}>{named('Status history')}</Link>}
      {listing && status !== 'REMOVED' && <Link href={`/dashboard/performance?listing=${listing.id}`} className={action}>{named('Performance')}</Link>}
      {(status === 'UNDER_REVIEW' || status === 'ACTIVE') && listing && <WithdrawAction draftId={draftId} version={listing.version} title={title} configured={publishing} />}
    </div>
  </article>
}
