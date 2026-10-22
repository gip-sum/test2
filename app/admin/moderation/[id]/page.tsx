import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { AdminShell, Unreadable } from '@/components/admin/AdminShell'
import { AdminPanel, Waiting } from '@/components/admin/AdminParts'
import { ReviewDecision } from '@/components/admin/ReviewDecision'
import { RestoreFocus } from '@/components/a11y/RestoreFocus'
import { EmptyState } from '@/components/ui/EmptyState'
import { Gallery } from '@/components/property/Gallery'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { KeyDetails } from '@/components/property/KeyDetails'
import { AreaBreakdown } from '@/components/property/AreaBreakdown'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { AlertIcon, ArrowRightIcon, CheckIcon, ImageOffIcon, MapPinIcon } from '@/components/ui/icons'
import { requireStaff } from '@/lib/admin/queries'
import { getReview, ModerationError } from '@/lib/moderation/queries'
import { ACTION_LABEL, canDecide, type Review } from '@/lib/moderation/model'
import { effectiveStatus, publishedModel } from '@/lib/listings/types'
import { formatAmount } from '@/lib/format/price'
import { PROPERTY_TYPE_LABEL, SELLER_LABEL } from '@/lib/property/types'
import { UUID } from '@/lib/media/types'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'Review submitted listing', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export const dynamic = 'force-dynamic'
const moment = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST'

const SECTIONS = [['photos', 'Photos'], ['terms', 'Price and terms'], ['facts', 'Facts'], ['area', 'Area'], ['location', 'Location'], ['description', 'Description'], ['history', 'History']] as const

/**
 * One submitted copy, as a moderation workspace (Phase 22; UI-20).
 *
 * The case first — status, how long it has waited, what and where it is,
 * who sent it, the price — then what buyers would see, in the buyer page's
 * own components (Gallery, KeyDetails, AreaBreakdown, PriceDisplay), so the
 * reviewer judges the listing as it would appear. Beside it, kept in view:
 * the facts worth checking before a decision (what is missing, said as a
 * fact, never a score), then the decision itself, apart from everything
 * informational. The allowed decisions, their rules and confirmation are
 * unchanged (ReviewDecision, UI-11).
 */
export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const { user, role, now } = await requireStaff(`/admin/moderation/${id}`, ['ADMIN', 'MODERATOR'])
  let review: Review
  try { review = await getReview(id) } catch (error) {
    if (error instanceof ModerationError && error.status === 404) notFound()
    return <AdminShell current="moderation" title="Review unavailable" role={role}><Unreadable what="The submitted copy" /><Link href="/admin/moderation" className="mt-4 inline-flex min-h-11 items-center text-brand-700 underline">Back to review queue</Link></AdminShell>
  }
  const { listing, submission: s } = review, m = publishedModel(s, review.photos, id), f = m.facts!, p = m.pricing!, amount = p.intent === 'buy' ? p.price : p.monthlyRent
  const photos = m.media.map(photo => ({ ...photo, url: `/api/admin/moderation/${id}/photos/${photo.id}?submission=${s.id}` }))
  const status = effectiveStatus(listing, now), waiting = status === 'UNDER_REVIEW'
  const description = s.description?.trim() ?? ''
  const last = review.history[0]

  return <AdminShell current="moderation" title="Review submitted listing" role={role}>
    <RestoreFocus token={crypto.randomUUID()} />
    <Link href="/admin/moderation" className="-mt-2 mb-2 inline-flex min-h-11 items-center gap-2 text-body-sm font-semibold text-ink-700 hover:text-brand-700 hover:underline underline-offset-4"><span aria-hidden="true">←</span> Back to review queue</Link>

    <header className="admin-case">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-body-sm text-ink-700">
        {/* Focusable from script: a decision refreshes the page and focus returns here (UI-11). */}
        <p id="listing-status" tabIndex={-1}><StatusBadge role="status" status={status} className="px-3 py-1" /></p>
        <span>Submitted <time dateTime={s.created_at}>{moment(s.created_at)}</time></span>
        {waiting && <span className="inline-flex items-center gap-1.5">Waiting <Waiting since={s.created_at} now={now} /></span>}
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="min-w-0">
          <h2 className="break-words font-display text-heading-2 font-semibold text-ink-900">{s.title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-body-sm text-ink-700"><MapPinIcon className="size-4 shrink-0" />{s.locality_name}, {s.city_name}<span aria-hidden>·</span>{p.intent === 'buy' ? 'For sale' : 'For rent'}<span aria-hidden>·</span>{m.entry.type ? PROPERTY_TYPE_LABEL[m.entry.type] : 'Property'}</p>
          <p className="mt-1 text-body-sm text-ink-700">Submitted by <strong className="font-semibold text-ink-900">{s.seller_name}</strong> · {SELLER_LABEL[s.seller_type]} <span className="text-ink-500">(as the seller declared it)</span></p>
        </div>
        <PriceDisplay amount={amount} intent={p.intent} size="detail" areaForRate={p.intent === 'buy' ? m.carpetSqft : undefined} className="items-end max-sm:items-start" />
      </div>
      <p className="mt-3 border-t border-border-subtle pt-3 text-caption text-ink-500">This is the immutable copy the seller submitted. A decision applies to this copy only.</p>
    </header>

    <nav aria-label="Sections of this submission" className="admin-jump"><ul>{SECTIONS.map(([key, label]) => <li key={key}><a href={`#${key}`}>{label}</a></li>)}</ul></nav>

    <div className="admin-review-grid">
      <div className="grid min-w-0 gap-4">
        <AdminPanel id="photos-heading" anchor="photos" title="Photos" count={photos.length}>
          {photos.length ? <Gallery photos={photos} title={s.title} /> : <p className="flex items-center gap-2 text-body-sm text-ink-700"><ImageOffIcon className="size-5 text-ink-500" />No photos were submitted with this copy.</p>}
        </AdminPanel>
        <AdminPanel id="terms-heading" anchor="terms" title="Price and terms">
          <dl className="admin-terms">
            <div><dt>{p.intent === 'buy' ? 'Asking price' : 'Monthly rent'}</dt><dd><PriceDisplay amount={amount} intent={p.intent} className="[&_p:first-child]:text-body [&_p:first-child]:font-semibold" /></dd></div>
            {p.intent === 'rent' && <div><dt>Deposit</dt><dd>{formatAmount(p.deposit)}</dd></div>}
            <div><dt>Negotiable</dt><dd>{p.negotiable ? 'Yes' : 'No'}</dd></div>
            <div><dt>Maintenance</dt><dd>{p.maintenance.status === 'separate' ? `${formatAmount(p.maintenance.monthly)} a month` : p.maintenance.status === 'included' ? 'Included' : p.maintenance.status === 'none' ? 'None' : 'Not specified'}</dd></div>
          </dl>
        </AdminPanel>
        <AdminPanel id="facts-heading" anchor="facts" title="Property facts">
          <KeyDetails property={{ ...f, propertyType: m.entry.type, availableFrom: typeof f.availableFrom === 'object' ? f.availableFrom.from : undefined, availableNow: f.availableFrom === 'now' }} />
        </AdminPanel>
        <AdminPanel id="area-heading" anchor="area" title="Area">
          <AreaBreakdown property={{ ...f, price: amount, intent: p.intent }} />
        </AdminPanel>
        <AdminPanel id="location-heading" anchor="location" title="Location">
          <address className="not-italic text-body-sm text-ink-900">{s.society_name && <span className="block font-semibold">{s.society_name}</span>}<span className="block break-words">{s.address}</span><span className="block">{s.locality_name}, {s.city_name}</span></address>
          <p className="mt-2 text-body-sm text-ink-700">{s.latitude !== null && s.longitude !== null ? `Map position given: ${s.latitude}, ${s.longitude}` : 'No map position given.'}</p>
          <p className="mt-2 text-caption text-ink-500">Seller-provided location. It has not been verified.</p>
        </AdminPanel>
        <AdminPanel id="description-heading" anchor="description" title="Description">
          <p className="max-w-[72ch] whitespace-pre-wrap break-words text-body-sm leading-relaxed text-ink-900">{description || <span className="italic text-ink-500">No description was supplied.</span>}</p>
        </AdminPanel>
      </div>

      <aside aria-label="Decision" className="admin-review-side">
        <section aria-labelledby="check-heading" className="admin-panel">
          <div className="admin-panel-head"><h2 id="check-heading" className="admin-panel-title">Before you decide</h2></div>
          <ul className="admin-checks">
            <Check ok={photos.length > 0} label={photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'}` : 'No photos'} note={photos.length ? undefined : 'Buyers would see a placeholder.'} />
            <Check ok={Boolean(description)} label={description ? 'Description supplied' : 'No description'} note={description ? `${Array.from(description).length} characters` : undefined} />
            <Check ok={s.latitude !== null && s.longitude !== null} optional label={s.latitude !== null && s.longitude !== null ? 'Map position given' : 'No map position'} note="Optional; seller-provided, not verified." />
            <Check ok={Boolean(s.society_name)} optional label={s.society_name ? `Society: ${s.society_name}` : 'No society or building name'} />
            <li className="admin-check"><span aria-hidden className="admin-check-mark is-info">{review.history.length}</span>
              <span className="min-w-0"><span className="block text-body-sm font-semibold text-ink-900">{review.history.length ? `${review.history.length} earlier decision${review.history.length === 1 ? '' : 's'}` : 'No earlier decisions'}</span>
                {last && <a href="#history" className="-my-2 flex min-h-11 items-center text-caption text-brand-700 underline underline-offset-2">Last: {ACTION_LABEL[last.action]}, {moment(last.created_at)}</a>}</span></li>
          </ul>
        </section>
        {canDecide(review, user.id) ? <ReviewDecision key={`${s.id}:${listing.version}`} listing={id} submission={s.id} version={listing.version} />
          : <EmptyState surface="workspace" title="Decision unavailable">{listing.owner_id === user.id ? 'Another staff member must review your listing.' : 'This copy is no longer waiting for review. Its saved decision history remains below.'}</EmptyState>}
        {listing.rejection_reason && <p className="whitespace-pre-wrap break-words rounded-md border border-border-subtle bg-warn-100 p-4 text-body-sm text-ink-900"><strong>Reason given to the seller: </strong>{listing.rejection_reason}</p>}
        {listing.status === 'ACTIVE' && <Link href={`/listing/${id}`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-700 hover:underline">View public listing<ArrowRightIcon className="size-4" /></Link>}
      </aside>
    </div>

    <section id="history" className="admin-panel mt-4 scroll-mt-24" aria-labelledby="decision-history-heading">
      <div className="admin-panel-head"><div><h2 id="decision-history-heading" className="admin-panel-title">Decision history</h2><p className="mt-0.5 text-caption text-ink-700">Most recent 100 staff decisions, newest first. Earlier operator events remain in listing status history.</p></div></div>
      {review.history.length ? <ol className="admin-timeline" aria-label="Moderation decisions">{review.history.map(a => <li key={a.id}>
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-body-sm font-semibold text-ink-900">{ACTION_LABEL[a.action]}</h3><time dateTime={a.created_at} className="text-caption text-ink-500">{moment(a.created_at)}</time></div>
        {a.reason && <p className="mt-1.5 whitespace-pre-wrap break-words text-body-sm text-ink-900">{a.reason}</p>}
        {a.expires_at && <p className="mt-1.5 text-body-sm text-ink-700">Public until {moment(a.expires_at)}</p>}
        <p className="mt-1.5 break-all text-caption text-ink-500">Staff account {a.actor_id} · listing version {a.version_before} → {a.version_after}</p>
      </li>)}</ol> : <p className="px-5 pb-5 text-body-sm text-ink-700">No staff decision has been recorded yet.</p>}
    </section>
  </AdminShell>
}

/** A fact worth checking, with its state in words; a missing optional fact is neutral, a missing expected one is marked. */
function Check({ ok, optional = false, label, note }: { ok: boolean; optional?: boolean; label: string; note?: ReactNode }) {
  const state = ok ? 'ok' : optional ? 'neutral' : 'missing'
  return <li className="admin-check">
    <span aria-hidden className={cn('admin-check-mark', `is-${state}`)}>{state === 'ok' ? <CheckIcon className="size-3.5" /> : state === 'missing' ? <AlertIcon className="size-3.5" /> : '–'}</span>
    <span className="min-w-0"><span className="block text-body-sm font-semibold text-ink-900">{label}{state === 'missing' && <span className="sr-only"> (missing)</span>}</span>{note && <span className="block text-caption text-ink-700">{note}</span>}</span>
  </li>
}
