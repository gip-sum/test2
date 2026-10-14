import Link from 'next/link'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import type { PropertyCard as Card } from '@/lib/dashboard/model'
import { StatusBadge } from './StatusBadge'
import { WithdrawAction } from './WithdrawAction'
import { CopyLink } from './CopyLink'

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' })
const moment = (iso: string) => `${new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST`

const SINCE_LABEL: Record<Card['status'], string> = {
  DRAFT: 'Last saved', UNDER_REVIEW: 'Submitted', ACTIVE: 'Live since', EXPIRED: 'Expired',
  REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn', REMOVED: 'Removed',
}

const action = 'inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4'

/** One property: its working draft and, once submitted, its listing. */
export function PropertyCard({ card, publishing }: { card: Card; publishing: boolean }) {
  const { draftId, listing, status, title } = card
  const base = `/post/drafts/${draftId}`
  const named = (label: string) => <>{label}<span className="sr-only"> {title}</span></>
  const headingId = `property-${draftId}`
  return <article aria-labelledby={headingId} className="min-w-0 rounded-lg border border-border-subtle bg-surface-000 p-5 shadow-e1">
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge status={status} />
      {card.intent && <span className="text-caption font-semibold text-ink-700">{card.intent === 'buy' ? 'For sale' : 'For rent'}</span>}
      {card.expiringSoon && card.daysLeft !== null && <span className="rounded-full bg-warn-100 px-2.5 py-1 text-caption font-semibold text-warn-600">{card.daysLeft <= 1 ? 'Expires within a day' : `Expires in ${card.daysLeft} days`}</span>}
    </div>
    <h3 id={headingId} className="mt-3 break-words font-display text-heading-3 text-ink-900">{title}</h3>
    {card.place && <p className="mt-1 break-words text-body-sm text-ink-700">{card.place}</p>}
    {card.price !== null && card.intent && <PriceDisplay amount={card.price} intent={card.intent} className="mt-2" />}
    <p className="mt-2 text-body-sm text-ink-700">{SINCE_LABEL[status]} <time dateTime={card.since}>{day(card.since)}</time></p>
    {status === 'ACTIVE' && card.expiresAt && <p className="text-body-sm text-ink-700">Expires <time dateTime={card.expiresAt}>{moment(card.expiresAt)}</time></p>}
    {card.rejectionReason && <p className="mt-2 break-words rounded-md bg-danger-100 p-3 text-body-sm text-ink-900"><strong>Reason: </strong>{card.rejectionReason}</p>}
    {card.progress && <p className="mt-2 text-body-sm text-ink-700">Property information: {card.progress.complete} of {card.progress.total} sections complete. Photos and your display name are checked in the preview.</p>}
    {card.detailsUnavailable && <p className="mt-2 text-body-sm text-ink-700">The submitted details could not be loaded. Showing your working draft’s title.</p>}
    {listing && card.enquiries !== null && <p className="mt-2 text-body-sm">
      {card.enquiries === 'unavailable'
        ? <><span className="text-ink-700">Enquiry counts are unavailable right now. </span><Link href="/dashboard/enquiries" className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4">Open inbox</Link></>
        : card.enquiries.total === 0
          ? <span className="text-ink-700">No enquiries yet</span>
          : <Link href={`/dashboard/enquiries?listing=${listing.id}`} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4">
            {card.enquiries.total} {card.enquiries.total === 1 ? 'enquiry' : 'enquiries'}{card.enquiries.newCount > 0 ? ` · ${card.enquiries.newCount} new` : ''}<span className="sr-only"> for {title}</span>
          </Link>}
    </p>}
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
      {status === 'DRAFT' && <>
        <Link href={base} className={action}>{named('Continue editing')}</Link>
        <Link href={`${base}/preview`} className={action}>{named('Preview')}</Link>
        <Link href={`${base}/lifecycle`} className={action}>{named('Publishing status')}</Link>
      </>}
      {status === 'UNDER_REVIEW' && <>
        <Link href={`${base}/submitted`} className={action}>{named('View submitted copy')}</Link>
        <Link href={`${base}/lifecycle`} className={action}>{named('Publishing status')}</Link>
      </>}
      {status === 'ACTIVE' && listing && <>
        <Link href={`/listing/${listing.id}`} className={action}>{named('View public page')}</Link>
        <CopyLink path={`/listing/${listing.id}`} title={title} />
        <Link href={`${base}/lifecycle`} className={action}>{named('Publishing status')}</Link>
      </>}
      {status === 'EXPIRED' && <>
        <Link href={`${base}/lifecycle`} className={action}>{named('Review & re-submit')}</Link>
        <Link href={`${base}/submitted`} className={action}>{named('View submitted copy')}</Link>
      </>}
      {status === 'REJECTED' && <>
        <Link href={base} className={action}>{named('Edit draft')}</Link>
        <Link href={`${base}/lifecycle`} className={action}>{named('Review & re-submit')}</Link>
      </>}
      {status === 'WITHDRAWN' && <>
        <Link href={base} className={action}>{named('Edit draft')}</Link>
        <Link href={`${base}/lifecycle`} className={action}>{named('Re-submit')}</Link>
        <Link href={`${base}/lifecycle#remove-listing`} className={action}>{named('Remove listing…')}</Link>
      </>}
      {status === 'REMOVED' && <Link href={`${base}/lifecycle`} className={action}>{named('Status history')}</Link>}
      {listing && status !== 'REMOVED' && <Link href={`/dashboard/performance?listing=${listing.id}`} className={action}>{named('Performance')}</Link>}
      {(status === 'UNDER_REVIEW' || status === 'ACTIVE') && listing && <WithdrawAction draftId={draftId} version={listing.version} title={title} configured={publishing} />}
    </div>
  </article>
}
