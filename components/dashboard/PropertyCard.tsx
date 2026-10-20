import Link from 'next/link'
import type { ReactNode } from 'react'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { BuildingIcon, CameraIcon, MailIcon } from '@/components/ui/icons'
import type { PropertyCard as Card } from '@/lib/dashboard/model'
import type { Totals } from '@/lib/analytics/model'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { buttonClassName } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { WithdrawAction } from './WithdrawAction'
import { CopyLink } from './CopyLink'
import { CardMenu } from './CardMenu'

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' })
const moment = (iso: string) => `${new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST`
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const SINCE_LABEL: Record<Card['status'], string> = {
  DRAFT: 'Last saved', UNDER_REVIEW: 'Submitted', ACTIVE: 'Live since', EXPIRED: 'Expired',
  REJECTED: 'Rejected', CHANGES_REQUESTED: 'Corrections requested', WITHDRAWN: 'Withdrawn', REMOVED: 'Removed',
}
/** What the status means for the seller, in a few words beside the badge. */
const STATUS_NOTE: Partial<Record<Card['status'], string>> = {
  DRAFT: 'Private, not submitted', UNDER_REVIEW: 'Waiting for review', EXPIRED: 'No longer public',
  REJECTED: 'Not published', CHANGES_REQUESTED: 'Not published', WITHDRAWN: 'Not public',
}

type Action = { key: string; node: ReactNode }

/**
 * One property (Phase 19), redrawn as an operational card (UI-18): the
 * photo buyers see first, the status in words beside the date that matters
 * for it, title, place and price, the figures that answer "is anyone
 * interested" — photos, enquiries and, for a live listing, its measured
 * views — and the actions its status allows.
 *
 * Actions are ranked, not lined up: one primary next step as a button, at
 * most two secondary links beside it from 640px, and everything else —
 * including Withdraw, which takes a listing down — behind "More". On a phone
 * only the primary step and "More" show, so nothing wraps into a wall of
 * links. Which actions exist for which status is exactly Phase 19's; this
 * only orders them.
 */
export function PropertyCard({ card, publishing, views }: {
  card: Card
  publishing: boolean
  /** This listing's measured views and enquiries over the dashboard's period; undefined when not measured. */
  views?: Totals
}) {
  const { draftId, listing, status, title } = card
  const base = `/post/drafts/${draftId}`
  const named = (label: string) => <>{label}<span className="sr-only"> {title}</span></>
  const headingId = `property-${draftId}`
  const link = 'inline-flex min-h-11 items-center rounded-md px-2 text-label font-semibold text-brand-700 hover:bg-brand-50'
  const item = 'flex min-h-11 w-full items-center rounded-md px-3 text-left text-body-sm font-semibold text-ink-900 hover:bg-surface-200'
  const attention = status === 'REJECTED' || status === 'CHANGES_REQUESTED' || status === 'EXPIRED' || (status === 'ACTIVE' && card.expiringSoon)
  const primary = (href: string, label: string) => <Link href={href} className={buttonClassName({ variant: attention ? 'primary' : 'outline', className: 'flex-1 px-4 sm:flex-none' })}>{named(label)}</Link>

  // Secondary actions in priority order; the first two show beside the
  // primary from 640px, the rest (and all of them on a phone) under More.
  const secondary: Action[] = []
  const add = (key: string, href: string, label: string) => secondary.push({ key, node: <Link href={href} className={link}>{named(label)}</Link> })
  let main: ReactNode = null
  if (status === 'DRAFT') { main = primary(base, 'Continue editing'); add('preview', `${base}/preview`, 'Preview'); add('status', `${base}/lifecycle`, 'Publishing status') }
  if (status === 'UNDER_REVIEW') { main = primary(`${base}/submitted`, 'View submitted copy'); add('status', `${base}/lifecycle`, 'Publishing status') }
  if (status === 'ACTIVE' && listing) { main = primary(`/listing/${listing.id}`, 'View public page'); secondary.push({ key: 'copy', node: <CopyLink path={`/listing/${listing.id}`} title={title} variant="inline" /> }); add('status', `${base}/lifecycle`, 'Publishing status') }
  if (status === 'EXPIRED') { main = primary(`${base}/lifecycle`, 'Review & re-submit'); add('submitted', `${base}/submitted`, 'View submitted copy') }
  if (status === 'REJECTED' || status === 'CHANGES_REQUESTED') { main = primary(base, 'Edit draft'); add('resubmit', `${base}/lifecycle`, 'Review & re-submit') }
  if (status === 'WITHDRAWN') { main = primary(base, 'Edit draft'); add('resubmit', `${base}/lifecycle`, 'Re-submit') }
  if (status === 'REMOVED') main = primary(`${base}/lifecycle`, 'Status history')
  if (listing && status !== 'REMOVED') add('performance', `/dashboard/performance?listing=${listing.id}`, 'Performance')
  const menuOnly: Action[] = []
  if (status === 'WITHDRAWN') menuOnly.push({ key: 'remove', node: <Link href={`${base}/lifecycle#remove-listing`} className={cn(item, 'text-danger-600')}>{named('Remove listing…')}</Link> })
  if ((status === 'UNDER_REVIEW' || status === 'ACTIVE') && listing) menuOnly.push({ key: 'withdraw', node: <WithdrawAction draftId={draftId} version={listing.version} title={title} configured={publishing} /> })
  const inline = secondary.slice(0, 2), rest = secondary.slice(2)
  // A menu row: each action's own link or button, drawn as a full-width,
  // left-aligned row. Direct children only, so Withdraw's confirmation
  // buttons keep their own shape.
  const menuRow = '[&>a]:flex [&>a]:w-full [&>a]:justify-start [&>a]:px-3 [&>button]:flex [&>button]:w-full [&>button]:justify-start [&>button]:px-3 [&>button]:no-underline'

  const statusNote = status === 'ACTIVE'
    ? card.expiresAt && (card.expiringSoon && card.daysLeft !== null
      ? <span className="font-semibold text-warn-600">{card.daysLeft <= 1 ? 'Expires within a day' : `Expires in ${card.daysLeft} days`}</span>
      : <>Expires <time dateTime={card.expiresAt}>{moment(card.expiresAt)}</time></>)
    : STATUS_NOTE[status]

  return <article aria-labelledby={headingId} className="seller-card min-w-0 rounded-lg border border-border-subtle bg-surface-000 p-3 sm:p-4">
    <div className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-4">
      <Cover card={card} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-700">
          <StatusBadge status={status} />
          <span>{SINCE_LABEL[status]} <time dateTime={card.since}>{day(card.since)}</time></span>
          {statusNote && <><span aria-hidden className="text-ink-500">·</span><span>{statusNote}</span></>}
        </p>
        <div className="mt-1.5 min-w-0 sm:flex sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            {/* Focusable from script only: where focus returns after an action
                on this card refreshes the page (WithdrawAction, UI-09). */}
            <h3 id={headingId} tabIndex={-1} className="break-words font-display text-body-lg font-semibold leading-snug text-ink-900">{title}</h3>
            <p className="mt-0.5 break-words text-body-sm text-ink-700">
              {[card.place, card.intent ? (card.intent === 'buy' ? 'For sale' : 'For rent') : null].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="mt-1 shrink-0 sm:mt-0 sm:text-right">
            {card.price !== null && card.intent
              ? <PriceDisplay amount={card.price} intent={card.intent} className="[&_p:first-child]:text-body-lg [&_p:first-child]:font-semibold" />
              : <p className="text-body-sm text-ink-500">Price not set</p>}
          </div>
        </div>
        <Figures card={card} views={views} />
      </div>
    </div>

    {card.rejectionReason && <div className="mt-3 rounded-md border border-border-subtle bg-surface-100 px-3 py-2.5 text-body-sm text-ink-900">
      <p className="text-caption font-semibold text-ink-700">Reviewer’s note</p>
      <p className="mt-0.5 break-words">{card.rejectionReason}</p>
    </div>}
    {card.progress && <Progress progress={card.progress} />}
    {card.detailsUnavailable && <p className="mt-3 text-body-sm text-ink-700">The submitted details could not be loaded. Showing your working draft’s title.</p>}

    <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-border-subtle pt-3">
      {main}
      {inline.map((a) => <span key={a.key} className="hidden sm:inline-flex">{a.node}</span>)}
      {(secondary.length > 0 || menuOnly.length > 0) && <div className="ml-auto">
        <CardMenu label={`More actions for ${title}`}>
          {/* The two shown inline from 640px are repeated here for phones only. */}
          {inline.map((a) => <div key={a.key} className={cn('sm:hidden', menuRow)}>{a.node}</div>)}
          {rest.map((a) => <div key={a.key} className={menuRow}>{a.node}</div>)}
          {menuOnly.length > 0 && <div className="mt-1 border-t border-border-subtle pt-1">{menuOnly.map((a) => <div key={a.key} className={menuRow}>{a.node}</div>)}</div>}
        </CardMenu>
      </div>}
    </div>
  </article>
}

function Cover({ card }: { card: Card }) {
  return <div className="relative aspect-[4/3] self-start overflow-hidden rounded-md bg-surface-200">
    {card.cover
      // An owner-only image endpoint: the public optimizer cannot fetch it.
      // A failed image is covered by the media ground (img[data-photo], UI-16).
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={card.cover} alt="" data-photo loading="lazy" decoding="async" className="relative size-full object-cover" />
      : <span className="flex size-full flex-col items-center justify-center gap-1 text-ink-500">
        <BuildingIcon className="size-6 sm:size-7" />
        <span className="hidden text-caption sm:block">{card.photoCount === 0 ? 'No photos yet' : 'No photo'}</span>
      </span>}
  </div>
}

/** The figures a seller checks first, each only when it is known. */
function Figures({ card, views }: { card: Card; views?: Totals }) {
  const { listing, title } = card
  const parts: ReactNode[] = []
  if (card.photoCount !== null && card.status !== 'REMOVED') parts.push(<span key="photos" className="inline-flex items-center gap-1.5"><CameraIcon className="size-4 text-ink-500" />{card.photoCount === 0 ? 'No photos' : plural(card.photoCount, 'photo', 'photos')}</span>)
  if (card.status === 'ACTIVE' && views) parts.push(<span key="views" className="tabular">{views.views === null ? 'Views not tracked yet' : `${plural(views.views, 'view', 'views')} in 30 days`}</span>)
  if (listing && card.enquiries !== null) parts.push(card.enquiries === 'unavailable'
    ? <span key="enq">Enquiry counts unavailable · <Link href="/dashboard/enquiries" className="font-semibold text-brand-700 underline underline-offset-4">Open inbox</Link></span>
    : card.enquiries.total === 0
      ? <span key="enq" className="inline-flex items-center gap-1.5"><MailIcon className="size-4 text-ink-500" />No enquiries yet</span>
      : <Link key="enq" href={`/dashboard/enquiries?listing=${listing.id}`} className="-my-3 inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-700 hover:underline">
        <MailIcon className="size-4" />{plural(card.enquiries.total, 'enquiry', 'enquiries')}
        {card.enquiries.newCount > 0 && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-caption font-semibold text-on-brand">{card.enquiries.newCount} new</span>}
        <span className="sr-only"> for {title}</span>
      </Link>)
  if (!parts.length) return null
  return <p className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-ink-700">{parts}</p>
}

/** A never-submitted draft's four information sections, as counted (photos are checked in the preview). */
function Progress({ progress }: { progress: { complete: number; total: number } }) {
  return <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-700">
    <span aria-hidden className="flex gap-1">{Array.from({ length: progress.total }, (_, i) => <span key={i} className={cn('h-1.5 w-6 rounded-full', i < progress.complete ? 'bg-brand-600' : 'bg-surface-200')} />)}</span>
    <span>Property information: {progress.complete} of {progress.total} sections complete. Photos and your display name are checked in the preview.</span>
  </div>
}
