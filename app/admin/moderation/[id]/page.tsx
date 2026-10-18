import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminShell, Unreadable } from '@/components/admin/AdminShell'
import { ReviewDecision } from '@/components/admin/ReviewDecision'
import { RestoreFocus } from '@/components/a11y/RestoreFocus'
import { EmptyState } from '@/components/ui/EmptyState'
import { Gallery } from '@/components/property/Gallery'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { KeyDetails } from '@/components/property/KeyDetails'
import { AreaBreakdown } from '@/components/property/AreaBreakdown'
import { PriceDisplay } from '@/components/property/PriceDisplay'
import { requireStaff } from '@/lib/admin/queries'
import { getReview, ModerationError } from '@/lib/moderation/queries'
import { ACTION_LABEL, canDecide, type Review } from '@/lib/moderation/model'
import { effectiveStatus, publishedModel } from '@/lib/listings/types'
import { formatAmount } from '@/lib/format/price'
import { SELLER_LABEL } from '@/lib/property/types'
import { UUID } from '@/lib/media/types'

export const metadata: Metadata = { title: 'Review submitted listing', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export const dynamic = 'force-dynamic'
const moment = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST'

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
  return <AdminShell current="moderation" title="Review submitted listing" role={role}>
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/admin/moderation" className="inline-flex min-h-11 items-center gap-2 text-body-sm font-semibold text-ink-700 hover:text-brand-700 hover:underline underline-offset-4"><span aria-hidden="true">←</span> Back to review queue</Link>
    {/* Focusable from script: a decision refreshes the page and focus returns here (UI-11). */}
    <p id="listing-status" tabIndex={-1}><StatusBadge role="status" status={effectiveStatus(listing, now)} className="px-3 py-1.5" /></p></div>
    <RestoreFocus token={crypto.randomUUID()} />
    <div className="mt-3 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <section className="workspace-panel min-w-0 rounded-lg border border-border-subtle bg-surface-000" aria-labelledby="submitted-heading">
        <div className="border-b border-border-subtle p-5"><h2 id="submitted-heading" className="break-words font-display text-heading-2 text-ink-900">{s.title}</h2>
        <p className="mt-2 text-caption text-ink-700">Immutable submitted copy · submitted {moment(s.created_at)}</p>
        <p className="mt-1 break-words text-body-sm text-ink-700">{s.seller_name} · {SELLER_LABEL[s.seller_type]}</p></div>
        <div className="p-4"><Gallery photos={photos} title={s.title} /></div>
        <div className="border-y border-border-subtle px-5 py-4"><PriceDisplay amount={amount} intent={p.intent} />
        <p className="mt-2 text-caption text-ink-700">{p.intent === 'rent' ? `Deposit ${formatAmount(p.deposit)} · ` : ''}{p.negotiable ? 'Negotiable' : 'Non-negotiable'} · {p.maintenance.status === 'separate' ? `Maintenance ${formatAmount(p.maintenance.monthly)}/mo` : `Maintenance: ${p.maintenance.status}`}</p></div>
        <div className="p-5"><h3 className="mb-3 text-body font-semibold text-ink-900">Property facts</h3>
        <KeyDetails property={{ ...f, propertyType: m.entry.type, availableFrom: typeof f.availableFrom === 'object' ? f.availableFrom.from : undefined }} />
        {f.availableFrom === 'now' && <p className="mt-3 text-body-sm">Available now</p>}{f.possessionBy && <p className="mt-3 text-body-sm">Expected possession: {f.possessionBy}</p>}
        <h3 className="mb-3 mt-5 border-t border-border-subtle pt-4 text-body font-semibold text-ink-900">Area breakdown</h3><AreaBreakdown property={{ ...f, price: amount, intent: p.intent }} />
        <h3 className="mt-5 border-t border-border-subtle pt-4 text-body font-semibold text-ink-900">Location</h3><p className="mt-2 break-words text-body-sm">{s.society_name}</p><p className="break-words text-body-sm">{s.address}</p><p className="break-words text-body-sm">{s.locality_name}, {s.city_name}</p>
        {s.latitude !== null && s.longitude !== null && <p className="mt-2 text-body-sm text-ink-700">Seller-provided coordinates: {s.latitude}, {s.longitude}</p>}
        <p className="mt-2 text-caption text-ink-500">Seller-provided location. It has not been verified.</p>
        <h3 className="mt-5 border-t border-border-subtle pt-4 text-body font-semibold text-ink-900">Description</h3><p className="mt-2 whitespace-pre-wrap break-words text-body-sm text-ink-700">{s.description || 'No description was supplied.'}</p></div>
      </section>
      <aside className="min-w-0 xl:sticky xl:top-20 xl:self-start">
        {canDecide(review, user.id) ? <ReviewDecision key={`${s.id}:${listing.version}`} listing={id} submission={s.id} version={listing.version} /> : <EmptyState surface="workspace" title="Decision unavailable">{listing.owner_id === user.id ? 'Another staff member must review your listing.' : 'This copy is no longer waiting for review. Its saved decision history remains below.'}</EmptyState>}
        {listing.rejection_reason && <p className="mt-4 whitespace-pre-wrap break-words rounded-md bg-warn-100 p-4 text-body-sm text-ink-900"><strong>Reason for seller: </strong>{listing.rejection_reason}</p>}
        {listing.status === 'ACTIVE' && <Link href={`/listing/${id}`} className="mt-3 inline-flex min-h-11 items-center text-brand-700 underline">View public listing</Link>}
      </aside>
    </div>
    <section className="workspace-panel mt-5 rounded-lg border border-border-subtle bg-surface-000" aria-labelledby="decision-history-heading"><div className="border-b border-border-subtle px-5 py-4"><h2 id="decision-history-heading" className="font-display text-heading-3">Decision history</h2><p className="mt-1 text-caption text-ink-700">Most recent 100 staff decisions. Earlier operator events remain in listing status history.</p></div>
      {review.history.length ? <ol className="divide-y divide-border-subtle" aria-label="Moderation decisions">{review.history.map(a => <li key={a.id} className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-body-sm font-semibold">{ACTION_LABEL[a.action]}</h3><time dateTime={a.created_at} className="text-caption text-ink-500">{moment(a.created_at)}</time></div><p className="mt-2 break-all text-caption text-ink-500">Staff account {a.actor_id} · listing version {a.version_before} → {a.version_after}</p>{a.reason && <p className="mt-2 whitespace-pre-wrap break-words text-body-sm">{a.reason}</p>}{a.expires_at && <p className="mt-2 text-body-sm text-ink-700">Valid until {moment(a.expires_at)}</p>}</li>)}</ol> : <p className="p-5 text-body-sm text-ink-700">No staff decision has been recorded yet.</p>}
    </section>
  </AdminShell>
}
